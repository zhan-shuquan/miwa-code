import { hashPassword, verifyPassword, validatePassword, newSessionToken, tokenDigest } from './password-credentials.js';

const denied = () => Object.assign(new Error('账号或密码错误，或暂时无法登录'), {status:401});
const error = (message, status=400) => Object.assign(new Error(message), {status});
export function createEmployeeAuthService(pool) {
  async function transaction(fn) {
    const c = await pool.connect();
    try { await c.query('BEGIN'); const value = await fn(c); await c.query('COMMIT'); return value; }
    catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  }
  async function employee(c, personId) {
    const snapshot = (await c.query("SELECT value FROM selection_workspace_config WHERE key='erp-employees'")).rows[0]?.value;
    const found = snapshot?.employees?.filter(e=>e.memberId===personId) || [];
    if(found.length!==1 || found[0].status!=='Active' || found[0].loginEnabled!==true) return null;
    const person=(await c.query("SELECT id,display_name,primary_email FROM people WHERE id=$1 AND status='active' AND archived_at IS NULL",[personId])).rows[0];
    return person ? {...found[0],person} : null;
  }
  async function audit(c,personId,actor,action,result) {
    await c.query('INSERT INTO aione_auth_audit(person_id,actor_id,action,result) VALUES($1,$2,$3,$4)',[personId,actor,action,result]);
  }
  async function credential(c,id) {
    await c.query('INSERT INTO aione_auth_credentials(person_id) VALUES($1) ON CONFLICT DO NOTHING',[id]);
    return (await c.query('SELECT * FROM aione_auth_credentials WHERE person_id=$1 FOR UPDATE',[id])).rows[0];
  }
  async function revoke(c,id) {
    await c.query('UPDATE aione_auth_credentials SET auth_epoch=auth_epoch+1,google_not_before=now(),updated_at=now() WHERE person_id=$1',[id]);
    await c.query('UPDATE aione_auth_sessions SET revoked_at=now() WHERE person_id=$1 AND revoked_at IS NULL',[id]);
  }
  async function issue(c,e,cred,method,remember,purpose='business') {
    const token=newSessionToken();
    const seconds=purpose==='activate'?600:remember?14*86400:8*3600;
    await c.query(`INSERT INTO aione_auth_sessions(token_hash,person_id,auth_epoch,method,purpose,expires_at)
      VALUES($1,$2,$3,$4,$5,now()+make_interval(secs=>$6))`,[tokenDigest(token),e.memberId,cred.auth_epoch,method,purpose,seconds]);
    await c.query('UPDATE aione_auth_credentials SET last_login_at=now() WHERE person_id=$1',[e.memberId]);
    return {token,seconds,remember:remember===true,purpose,identity:{subjectType:'person',subjectId:e.memberId,personId:e.memberId,displayName:e.name,primaryEmail:e.loginEmail||e.person.primary_email,authSource:method,identitySource:'canonical_database'}};
  }
  // Shared database throttle; attempts are consumed before any expensive hash work.
  async function throttle(account,address) {
    return transaction(async c=>{
      let blocked=false;
      for(const [scope,value,limit] of [['address',address,60],['account',account,8]]) {
        const key=tokenDigest(scope+':'+value);
        const row=(await c.query(`INSERT INTO aione_auth_throttle(key_hash,attempts) VALUES($1,1)
          ON CONFLICT(key_hash) DO UPDATE SET
            attempts=CASE WHEN aione_auth_throttle.window_start<now()-interval '15 minutes' THEN 1 ELSE aione_auth_throttle.attempts+1 END,
            window_start=CASE WHEN aione_auth_throttle.window_start<now()-interval '15 minutes' THEN now() ELSE aione_auth_throttle.window_start END
          RETURNING attempts`,[key])).rows[0];
        blocked ||= row.attempts>limit;
        if(blocked)break;
      }
      return blocked;
    });
  }
  async function login({account,password,remember=false,address='unknown'}) {
    const normalized=typeof account==='string'?account.trim().toLowerCase():'';
    if(normalized.length>254 || await throttle(normalized,address)) throw denied();
    // Exact canonical employee ID or explicitly verified login email only.
    const snap=(await pool.query("SELECT value FROM selection_workspace_config WHERE key='erp-employees'")).rows[0]?.value;
    const matches=(snap?.employees||[]).filter(e=>normalized.includes('@')
      ? e.loginEmailVerified===true && String(e.loginEmail||'').toLowerCase()===normalized
      : String(e.memberId||'').toLowerCase()===normalized);
    const id=matches.length===1?matches[0].memberId:null;
    const current=id?(await pool.query('SELECT password_hash FROM aione_auth_credentials WHERE person_id=$1',[id])).rows[0]:null;
    const valid=await verifyPassword(password,current?.password_hash);
    const result=await transaction(async c=>{
      const e=id?await employee(c,id):null;
      const cred=e?await credential(c,id):null;
      if(!valid || !e || cred.password_hash!==current?.password_hash || (cred.must_change && (!cred.temporary_expires_at || new Date(cred.temporary_expires_at)<=new Date()))) {
        await audit(c,e?.memberId||null,null,'login','denied'); return null;
      }
      const session=await issue(c,e,cred,'password',remember,cred.must_change?'activate':'business');
      await audit(c,id,id,'login','success'); return session;
    });
    if(!result)throw denied();
    return result;
  }
  async function session(token,{allowActivation=false}={}) {
    if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
    const row=(await pool.query(`SELECT s.*,c.must_change,c.temporary_expires_at FROM aione_auth_sessions s
      JOIN aione_auth_credentials c ON c.person_id=s.person_id AND c.auth_epoch=s.auth_epoch
      WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()`,[tokenDigest(token)])).rows[0];
    if(!row || (!allowActivation && row.purpose!=='business'))return null;
    if(row.purpose==='activate' && (!row.temporary_expires_at || new Date(row.temporary_expires_at)<=new Date()))return null;
    const e=await employee(pool,row.person_id);
    return e?{...row,employee:e,identity:{subjectType:'person',subjectId:e.memberId,personId:e.memberId,displayName:e.name,primaryEmail:e.loginEmail||e.person.primary_email,authSource:row.method,identitySource:'canonical_database'}}:null;
  }
  async function changePassword(token,{currentPassword,newPassword}) {
    validatePassword(newPassword);
    const s=await session(token,{allowActivation:true}); if(!s)throw denied();
    if(await throttle('password-change:'+s.person_id,'password-change:'+s.person_id))throw denied();
    const old=(await pool.query('SELECT password_hash FROM aione_auth_credentials WHERE person_id=$1',[s.person_id])).rows[0];
    if(!await verifyPassword(currentPassword,old?.password_hash))throw denied();
    if(await verifyPassword(newPassword,old.password_hash))throw error('新密码不能与原密码相同');
    const hashed=await hashPassword(newPassword);
    await transaction(async c=>{
      const cred=await credential(c,s.person_id);
      if(String(cred.auth_epoch)!==String(s.auth_epoch)||cred.password_hash!==old.password_hash)throw denied();
      if(!await employee(c,s.person_id))throw denied();
      const live=(await c.query('SELECT 1 FROM aione_auth_sessions WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()',[tokenDigest(token)])).rowCount;
      if(!live)throw denied();
      await c.query('UPDATE aione_auth_credentials SET password_hash=$2,must_change=false,temporary_expires_at=NULL,activated_at=COALESCE(activated_at,now()) WHERE person_id=$1',[s.person_id,hashed]);
      await revoke(c,s.person_id);
      await audit(c,s.person_id,s.person_id,'password-change','success');
    });
    // All sessions, including this one, are revoked; a fresh sign-in is required.
  }
  async function resetPassword({personId,temporaryPassword,actor},client=null) {
    const hashed=await hashPassword(temporaryPassword);
    const apply=async c=>{
      if(!await employee(c,personId))throw error('员工尚未启用登录',409);
      await credential(c,personId);
      await c.query("UPDATE aione_auth_credentials SET password_hash=$2,must_change=true,temporary_expires_at=now()+interval '24 hours' WHERE person_id=$1",[personId,hashed]);
      await revoke(c,personId);
      await audit(c,personId,actor,'password-reset','success');
    };
    await (client?apply(client):transaction(apply));
  }
  async function revokeAll({personId,actor},client=null) {
    const apply=async c=>{await credential(c,personId);await revoke(c,personId);await audit(c,personId,actor,'revoke-sessions','success');};
    await (client?apply(client):transaction(apply));
  }
  // Caller must verify Google's signature/audience/email_verified first.
  // Only an existing immutable subject binding is accepted, never an email match.
  async function googleLogin({subject,issuedAt,remember=false}) {
    return transaction(async c=>{
      const bound=(await c.query("SELECT person_id FROM external_identities WHERE provider='google' AND subject=$1 AND status='active'",[subject])).rows[0];
      const e=bound?await employee(c,bound.person_id):null;
      if(!e)throw denied();
      const cred=await credential(c,e.memberId);
      if(cred.google_not_before && (!Number.isFinite(issuedAt)||issuedAt*1000<new Date(cred.google_not_before).getTime()))throw error('请重新完成Google身份验证',401);
      // A temporary password cannot be bypassed by a different authentication method.
      if(cred.password_hash && cred.must_change)throw error('请使用临时密码完成首次改密后再使用Google登录',403);
      const result=await issue(c,e,cred,'google',remember);
      await audit(c,e.memberId,e.memberId,'google-login','success');
      return result;
    });
  }
  async function logout(token) {await pool.query('UPDATE aione_auth_sessions SET revoked_at=now() WHERE token_hash=$1',[tokenDigest(token)]);}
  async function bindGoogle(sessionToken,{ticket,subject,email}) {
    const current=await session(sessionToken);if(!current)throw denied();
    if(typeof ticket!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(ticket))throw error('绑定凭证无效',403);
    await transaction(async c=>{
      // Consistent with employee sync / legacy identity resolver lock ordering.
      await c.query("SELECT pg_advisory_xact_lock(hashtext('employee-master-cache'))");
      const cred=await credential(c,current.person_id);
      if(String(cred.auth_epoch)!==String(current.auth_epoch)||!await employee(c,current.person_id))throw denied();
      const live=(await c.query('SELECT 1 FROM aione_auth_sessions WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()',[tokenDigest(sessionToken)])).rowCount;
      if(!live)throw denied();
      const proof=(await c.query('SELECT * FROM aione_google_binding_tickets WHERE token_hash=$1 AND person_id=$2 AND used_at IS NULL AND expires_at>now() FOR UPDATE',[tokenDigest(ticket),current.person_id])).rows[0];
      if(!proof)throw error('绑定凭证已过期或不属于当前员工',403);
      const previous=(await c.query("SELECT person_id,status FROM external_identities WHERE provider='google' AND subject=$1 FOR UPDATE",[subject])).rows[0];
      if(previous && (previous.person_id!==current.person_id||previous.status!=='active'))throw error('该Google身份已有绑定记录，请管理员核查',409);
      await c.query(`INSERT INTO external_identities(id,provider,subject,person_id,email_snapshot,status,source_system)
        VALUES($1,'google',$2,$3,$4,'active','erp-authorized-binding') ON CONFLICT(provider,subject) DO NOTHING`,['google:'+subject,subject,current.person_id,email]);
      await c.query('UPDATE aione_google_binding_tickets SET used_at=now() WHERE token_hash=$1',[tokenDigest(ticket)]);
      await audit(c,current.person_id,current.person_id,'google-bind','success');
    });
  }
  return {login,googleLogin,bindGoogle,session,changePassword,resetPassword,revokeAll,logout};
}
