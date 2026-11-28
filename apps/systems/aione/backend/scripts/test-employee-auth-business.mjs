import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import express from 'express';
import pg from 'pg';
import {createEmployeeAuthHttp} from '../src/http/employee-auth.js';
import {createSelectionWorkspaceRouter} from '../src/routes/selection-workspace.js';
import {hashPassword} from '../src/auth/password-credentials.js';
// Existing disposable business regression database only; no production URL accepted.
const pool=new pg.Pool({connectionString:'postgres://aione_test:isolated-local-test-only@127.0.0.1:15432/aione_selection'});
assert.equal((await pool.query('SELECT current_database() db')).rows[0].db,'aione_selection');
await pool.query("ALTER TABLE people ADD COLUMN IF NOT EXISTS status text DEFAULT 'active', ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS primary_email text");
await pool.query(await readFile(new URL('../../../../../data-code/migrations/0206_employee_auth.sql',import.meta.url),'utf8'));
const old=(await pool.query("SELECT key,value FROM selection_workspace_config WHERE key IN ('erp-employees','pool-grants')")).rows;
const suffix=randomUUID(), ordinary='auth-ordinary-'+suffix, manager='auth-manager-'+suffix;
const record='auth-record-'+suffix, asset=randomUUID(), origin='https://auth-business.example.invalid';
const password='Business isolated verification password';
const app=express();app.use(express.json());
const auth=createEmployeeAuthHttp(pool,{origins:[origin]});
app.use('/api/v1/auth',auth.router);app.use(auth.authenticate);
app.use('/api/v1/selection-workspace',createSelectionWorkspaceRouter(pool));
app.use((e,_req,res,_next)=>res.status(e.statusCode||e.status||500).json({message:e.message}));
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const base='http://127.0.0.1:'+server.address().port;
try {
  for(const id of [ordinary,manager]) {
    await pool.query("INSERT INTO people(id,display_name,status) VALUES($1,$1,'active')",[id]);
    await pool.query('INSERT INTO aione_auth_credentials(person_id,password_hash,must_change,activated_at) VALUES($1,$2,false,now())',[id,await hashPassword(password)]);
  }
  for(const [key,value] of [['erp-employees',{employees:[ordinary,manager].map(memberId=>({memberId,name:memberId,status:'Active',loginEnabled:true}))}],['pool-grants',{[ordinary]:{research:true,collect:true},[manager]:{research:true,collect:true,manage:true,assign:true,manageGrants:true}}]])
    await pool.query('INSERT INTO selection_workspace_config(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',[key,value]);
  await pool.query("INSERT INTO product_opportunities(id,title,source_platform,owner_person_id,created_by_person_id,selection_workspace) VALUES($1,'隔离权限夹具','isolated',$2,$2,$3)",[record,manager,{status:'draft',data:{},pool:{origin:'private',state:'claimed'}}]);
  await pool.query("INSERT INTO selection_workspace_assets(id,selection_id,filename,content_type,bytes,sha256) VALUES($1,$2,'auth-test.txt','text/plain',$3,$4)",[asset,record,Buffer.from('isolated attachment'),suffix]);
  async function login(id){const r=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{origin,'content-type':'application/json','x-aione-request':'1'},body:JSON.stringify({account:id,password})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
  const cookies={ordinary:await login(ordinary),manager:await login(manager)};
  const path='/api/v1/selection-workspace/records/'+record;
  for(const extra of ['', '/assets/'+asset, '/assets/'+asset+'?transport=manifest','/assets/'+asset+'?transport=chunk&part=0']) {
    assert.equal((await fetch(base+path+extra)).status,401);
    assert.equal((await fetch(base+path+extra,{headers:{cookie:cookies.ordinary,'x-aione-person-id':manager,'x-aione-subject-type':'admin'}})).status,404);
    const result=await fetch(base+path+extra,{headers:{cookie:cookies.manager}});
    assert.equal(result.status,200,await result.text());
  }
  assert.equal((await fetch(base+'/api/v1/selection-workspace/employees',{headers:{cookie:cookies.ordinary}})).status,403);
  assert.equal((await fetch(base+'/api/v1/selection-workspace/employees',{headers:{cookie:cookies.manager}})).status,200);
  const denied=await fetch(base+'/api/v1/selection-workspace/pool/grants',{method:'PUT',headers:{cookie:cookies.ordinary,origin,'x-aione-request':'1','content-type':'application/json'},body:JSON.stringify({[ordinary]:{manage:true}})});
  assert.equal(denied.status,403);
  await auth.service.revokeAll({personId:manager,actor:'isolated-admin'});
  assert.equal((await fetch(base+path+'/assets/'+asset,{headers:{cookie:cookies.manager}})).status,401);
  console.log('PASS actual business routes: record and attachment ownership, independent links/manifests/chunks, administrator access, forged identity rejection, grant escalation rejection, revoked-session rejection');
} finally {
  server.close();
  for(const row of old)await pool.query('UPDATE selection_workspace_config SET value=$2 WHERE key=$1',[row.key,row.value]);
  await pool.query('DELETE FROM selection_workspace_assets WHERE selection_id=$1',[record]);
  await pool.query('DELETE FROM product_opportunities WHERE id=$1',[record]);
  await pool.query('DELETE FROM aione_auth_sessions WHERE person_id=ANY($1::text[])',[[ordinary,manager]]);
  await pool.query('DELETE FROM aione_auth_credentials WHERE person_id=ANY($1::text[])',[[ordinary,manager]]);
  await pool.query('DELETE FROM aione_auth_audit WHERE person_id=ANY($1::text[])',[[ordinary,manager]]);
  await pool.query('DELETE FROM people WHERE id=ANY($1::text[])',[[ordinary,manager]]);
  await pool.end();
}
