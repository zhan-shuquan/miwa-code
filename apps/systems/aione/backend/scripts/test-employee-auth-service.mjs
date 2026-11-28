import assert from 'node:assert/strict';
import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {createEmployeeAuthService} from '../src/auth/employee-auth-service.js';
import {tokenDigest,newSessionToken} from '../src/auth/password-credentials.js';

// Explicit isolated DB; never inherit production environment credentials.
const pool=new pg.Pool({connectionString:'postgres://aione_test:isolated-local-test-only@127.0.0.1:15432/aione_employee_auth_test'});
assert.equal((await pool.query('SELECT current_database() AS db')).rows[0].db,'aione_employee_auth_test');
await pool.query(await readFile(new URL('../../../../../data-code/migrations/0005_identity_foundation.sql',import.meta.url),'utf8'));
await pool.query(await readFile(new URL('../../../../../data-code/migrations/0206_employee_auth.sql',import.meta.url),'utf8'));
await pool.query('CREATE TABLE IF NOT EXISTS selection_workspace_config(key text primary key,value jsonb)');
const id='auth-isolated-employee';
await pool.query("INSERT INTO people(id,display_name,status) VALUES($1,'隔离认证测试员工','active') ON CONFLICT(id) DO UPDATE SET status='active'",[id]);
let e={memberId:id,employeeId:'HR-TEST-AUTH',name:'隔离认证测试员工',status:'Active',loginEnabled:true,loginEmail:'auth-isolated@example.invalid',loginEmailVerified:true};
const previous=(await pool.query("SELECT value FROM selection_workspace_config WHERE key='erp-employees'")).rows[0]?.value;
async function snapshot(){await pool.query("INSERT INTO selection_workspace_config(key,value) VALUES('erp-employees',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value",[{employees:[e]}]);}
const service=createEmployeeAuthService(pool);
const temporary='Isolated temporary password 2026!', password='Isolated permanent password 2026!';
try {
  // This database is exclusively for this test. Clear only this test's throttle keys.
  const accountKeys=[id,e.loginEmail,'changed-nongoogle@example.invalid','unknown','bruteforce-test'];
  const addressKeys=['test1','test2','test3','test4','test5','test6','test7','test8','rate-test'];
  await pool.query('DELETE FROM aione_auth_throttle WHERE key_hash=ANY($1::text[])',[[...accountKeys.map(x=>tokenDigest('account:'+x)),...addressKeys.map(x=>tokenDigest('address:'+x))]]);
  await snapshot();
  await service.resetPassword({personId:id,temporaryPassword:temporary,actor:'test-admin'});
  const first=await service.login({account:id,password:temporary,address:'test1'});
  assert.equal(first.purpose,'activate');
  assert.equal(await service.session(first.token),null);
  assert.ok(await service.session(first.token,{allowActivation:true}));
  await service.changePassword(first.token,{currentPassword:temporary,newPassword:password});
  assert.equal(await service.session(first.token,{allowActivation:true}),null);
  const byId=await service.login({account:id,password,address:'test2'});
  const byEmail=await service.login({account:e.loginEmail.toUpperCase(),password,remember:true,address:'test3'});
  assert.equal(byId.identity.personId,byEmail.identity.personId);
  assert.equal(byEmail.seconds,14*86400);
  assert.equal(byId.seconds,8*3600);
  assert.ok(await service.session(byId.token));
  const bindingTicket=newSessionToken(), bindingSubject='binding-test-'+newSessionToken();
  await pool.query("INSERT INTO aione_google_binding_tickets(token_hash,person_id,authorized_by,expires_at) VALUES($1,$2,'test-admin',now()+interval '1 hour')",[tokenDigest(bindingTicket),id]);
  await assert.rejects(service.bindGoogle(byId.token,{ticket:newSessionToken(),subject:bindingSubject,email:'test@example.invalid'}),/绑定凭证/);
  await service.bindGoogle(byId.token,{ticket:bindingTicket,subject:bindingSubject,email:'test@example.invalid'});
  assert.equal((await service.googleLogin({subject:bindingSubject,issuedAt:Date.now()/1000+1})).identity.personId,id);
  await assert.rejects(service.bindGoogle(byId.token,{ticket:bindingTicket,subject:bindingSubject,email:'test@example.invalid'}),/绑定凭证/);
  const expiredTicket=newSessionToken();
  await pool.query("INSERT INTO aione_google_binding_tickets(token_hash,person_id,authorized_by,expires_at) VALUES($1,$2,'test-admin',now()-interval '1 second')",[tokenDigest(expiredTicket),id]);
  await assert.rejects(service.bindGoogle(byId.token,{ticket:expiredTicket,subject:bindingSubject,email:'test@example.invalid'}),/绑定凭证/);
  await pool.query("INSERT INTO external_identities(id,provider,subject,person_id,status) VALUES('auth-test-google','google','verified-auth-test-subject',$1,'active') ON CONFLICT(id) DO NOTHING",[id]);
  const byGoogle=await service.googleLogin({subject:'verified-auth-test-subject',issuedAt:Date.now()/1000+1});
  assert.equal(byGoogle.identity.personId,byId.identity.personId);
  await assert.rejects(service.googleLogin({subject:'unbound-google-subject'}),/账号或密码/);
  await assert.rejects(service.login({account:id,password:'wrong password',address:'test4'}),/账号或密码/);
  await assert.rejects(service.login({account:'unknown',password,address:'test4'}),/账号或密码/);
  const oldEmail=e.loginEmail; e.loginEmail='changed-nongoogle@example.invalid';await snapshot();
  await assert.rejects(service.login({account:oldEmail,password,address:'test5'}),/账号或密码/);
  assert.equal((await service.login({account:e.loginEmail,password,address:'test6'})).identity.personId,id);
  e.loginEnabled=false;await snapshot();assert.equal(await service.session(byId.token),null);
  await assert.rejects(service.login({account:e.loginEmail,password,address:'test7'}),/账号或密码/);
  await service.revokeAll({personId:id,actor:'test-admin'});
  e.loginEnabled=true;await snapshot();assert.equal(await service.session(byId.token),null);
  await service.resetPassword({personId:id,temporaryPassword:temporary,actor:'test-admin'});
  assert.equal(await service.session(byEmail.token),null);
  assert.equal(await service.session(byGoogle.token),null);
  await assert.rejects(service.googleLogin({subject:'verified-auth-test-subject',issuedAt:Date.now()/1000+1}),/首次改密/);
  await assert.rejects(service.googleLogin({subject:'verified-auth-test-subject',issuedAt:1}),/重新完成Google/);
  await pool.query("UPDATE aione_auth_credentials SET temporary_expires_at=now()-interval '1 second' WHERE person_id=$1",[id]);
  await assert.rejects(service.login({account:e.loginEmail,password:temporary,address:'test8'}),/账号或密码/);
  for(let n=0;n<10;n++)await assert.rejects(service.login({account:'bruteforce-test',password:'wrong',address:'rate-test'}),/账号或密码/);
  const audit=JSON.stringify((await pool.query('SELECT * FROM aione_auth_audit WHERE person_id=$1',[id])).rows);
  assert.ok(!audit.includes(temporary)&&!audit.includes(password)&&!audit.includes(first.token));
  console.log('PASS temporary activation, forced change, employee/email identity, persistence, reset/revocation, disabled access, email replacement, expiry, throttling, audit redaction');
} finally {
  if(previous)await pool.query("UPDATE selection_workspace_config SET value=$1 WHERE key='erp-employees'",[previous]);
  else await pool.query("DELETE FROM selection_workspace_config WHERE key='erp-employees'");
  await service.revokeAll({personId:id,actor:'test-cleanup'});
  await pool.end();
}
