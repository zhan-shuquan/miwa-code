import {Router} from 'express';
import {timingSafeEqual,createHash} from 'node:crypto';
import {createEmployeeAuthService} from '../auth/employee-auth-service.js';
import {createAdminEnvelope} from '../auth/admin-envelope.js';
import {tokenDigest} from '../auth/password-credentials.js';

// Existing outbound connector carries encrypted ERP management commands.
// No passwords or hashes enter normal employee snapshots or connector logs.
export function createEmployeeAuthAdminRouter(pool,{managementToken,privatePem}={}) {
  const router=Router(), service=createEmployeeAuthService(pool);
  const envelope=privatePem?createAdminEnvelope(privatePem):null;
  router.use((req,res,next)=>{
    const supplied=Buffer.from(String(req.get('x-aione-connector-token')||''));
    const expected=Buffer.from(String(managementToken||''));
    if(expected.length<32 || supplied.length!==expected.length || !timingSafeEqual(supplied,expected))return res.status(403).json({message:'管理请求未授权'});
    res.set('Cache-Control','no-store');next();
  });
  router.get('/public-key',(_req,res)=>{
    if(!envelope)return res.status(503).json({message:'员工认证管理尚未配置'});
    res.json({publicPem:envelope.publicPem,keyId:envelope.keyId});
  });
  router.post('/status',async(req,res)=>{
    const ids=req.body?.personIds;
    if(!Array.isArray(ids)||ids.length>1000||ids.some(x=>typeof x!=='string'||x.length>100))return res.status(400).json({message:'人员请求无效'});
    const rows=(await pool.query(`SELECT p.id AS person_id,c.password_hash IS NOT NULL AS password_set,
      COALESCE(c.must_change,false) AS must_change,c.activated_at,c.last_login_at,c.temporary_expires_at
      FROM people p LEFT JOIN aione_auth_credentials c ON c.person_id=p.id WHERE p.id=ANY($1::text[])`,[ids])).rows;
    const bindings=(await pool.query("SELECT person_id,email_snapshot FROM external_identities WHERE provider='google' AND status='active' AND person_id=ANY($1::text[])",[ids])).rows;
    for(const row of rows)row.googleBindings=bindings.filter(b=>b.person_id===row.person_id).map(b=>b.email_snapshot);
    res.json({employees:rows});
  });
  router.post('/commands',async(req,res)=>{
    const {requestId,personId,action,actor,createdAt}=req.body||{};
    if(!envelope)return res.status(503).json({message:'员工认证管理尚未配置'});
    if(!/^[A-Za-z0-9_-]{8,100}$/.test(requestId||'')||typeof personId!=='string'||personId.length>100||typeof actor!=='string'||!actor||actor.length>254||!['reset-password','revoke-sessions','authorize-google-binding'].includes(action))return res.status(400).json({message:'管理请求无效'});
    const fingerprint=createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
    const c=await pool.connect();
    try {
      await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',['auth-command:'+requestId]);
      const previous=(await c.query('SELECT request_digest,result FROM aione_auth_admin_receipts WHERE request_id=$1',[requestId])).rows[0];
      if(previous){
        if(previous.request_digest!==fingerprint)throw Object.assign(Error('管理请求标识冲突'),{status:409});
        await c.query('COMMIT');return res.json(previous.result);
      }
      const age=Date.now()-Date.parse(createdAt);
      if(!Number.isFinite(age)||age < -60000 || age>86400000)throw Object.assign(Error('管理请求已过期，请在ERP重新发起'),{status:409});
      if(action!=='revoke-sessions') {
        const decoded=envelope.decrypt(req.body.envelope,requestId);
        if(decoded.personId!==personId||decoded.action!==action)throw Error('Invalid credential envelope context');
        if(action==='reset-password') {
          await service.resetPassword({personId,temporaryPassword:decoded.temporaryPassword,actor},c);decoded.temporaryPassword='';
        } else {
          if(typeof decoded.ticket!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(decoded.ticket))throw Error('Invalid binding ticket');
          await c.query("INSERT INTO aione_google_binding_tickets(token_hash,person_id,authorized_by,expires_at) VALUES($1,$2,$3,now()+interval '24 hours')",[tokenDigest(decoded.ticket),personId,actor]);
          await c.query("INSERT INTO aione_auth_audit(person_id,actor_id,action,result) VALUES($1,$2,'authorize-google-binding','success')",[personId,actor]);
        }
      } else await service.revokeAll({personId,actor},c);
      const result={requestId,ok:true};
      await c.query('INSERT INTO aione_auth_admin_receipts(request_id,request_digest,person_id,action,result) VALUES($1,$2,$3,$4,$5)',[requestId,fingerprint,personId,action,result]);
      await c.query('COMMIT');res.json(result);
    }catch(e){await c.query('ROLLBACK');res.status(e.status||503).json({message:e.status?e.message:'账号管理未完成，请检查管理通道后重试'});}
    finally{c.release();}
  });
  return router;
}
