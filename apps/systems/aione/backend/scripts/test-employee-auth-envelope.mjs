import assert from 'node:assert/strict';
import {generateKeyPairSync,randomBytes,randomUUID,publicEncrypt,constants,createCipheriv} from 'node:crypto';
import express from 'express';
import pg from 'pg';
import {createAdminEnvelope} from '../src/auth/admin-envelope.js';
import {createEmployeeAuthAdminRouter} from '../src/routes/employee-auth-admin.js';
const keys=generateKeyPairSync('rsa',{modulusLength:3072,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
const codec=createAdminEnvelope(keys.privateKey);
const requestId=randomUUID(),personId='auth-isolated-employee';
const payload={personId,action:'reset-password',temporaryPassword:'Encrypted isolated temporary password'};
function encrypt(id,payload){
  const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(id));
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(payload)),cipher.final()]);
  return {keyId:codec.keyId,wrappedKey:publicEncrypt({key:keys.publicKey,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},key).toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:encrypted.toString('base64')};
}
const envelope=encrypt(requestId,payload);
assert.deepEqual(codec.decrypt(envelope,requestId),payload);
assert.throws(()=>codec.decrypt(envelope,'different-request-id'));
assert.throws(()=>codec.decrypt({...envelope,keyId:'wrong'},requestId));
assert.throws(()=>codec.decrypt({...envelope,tag:randomBytes(16).toString('base64')},requestId));
assert.ok(!JSON.stringify(envelope).includes(payload.temporaryPassword));
const pool=new pg.Pool({connectionString:'postgres://aione_test:isolated-local-test-only@127.0.0.1:15432/aione_employee_auth_test'});
assert.equal((await pool.query('SELECT current_database() AS db')).rows[0].db,'aione_employee_auth_test');
const previous=(await pool.query("SELECT value FROM selection_workspace_config WHERE key='erp-employees'")).rows[0]?.value;
await pool.query("INSERT INTO selection_workspace_config(key,value) VALUES('erp-employees',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value",[{employees:[{memberId:personId,name:'测试',status:'Active',loginEnabled:true}]}]);
const app=express();app.use(express.json({limit:'12kb'}));const token=randomBytes(32).toString('hex');
app.use(createEmployeeAuthAdminRouter(pool,{managementToken:token,privatePem:keys.privateKey}));
const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+server.address().port;
const command={requestId,personId,action:'reset-password',actor:'isolated-admin',createdAt:new Date().toISOString(),envelope};
const post=body=>fetch(base+'/commands',{method:'POST',headers:{'content-type':'application/json','x-aione-connector-token':token},body:JSON.stringify(body)});
try {
  const first=await post(command);assert.equal(first.status,200);assert.equal((await first.json()).ok,true);
  const epoch=(await pool.query('SELECT auth_epoch FROM aione_auth_credentials WHERE person_id=$1',[personId])).rows[0].auth_epoch;
  assert.equal((await post(command)).status,200);
  assert.equal((await pool.query('SELECT auth_epoch FROM aione_auth_credentials WHERE person_id=$1',[personId])).rows[0].auth_epoch,epoch);
  assert.equal((await post({...command,actor:'changed-actor'})).status,409);
  assert.equal((await fetch(base+'/public-key')).status,403);
  const rows=(await pool.query('SELECT * FROM aione_auth_admin_receipts WHERE request_id=$1',[requestId])).rows;
  assert.ok(!JSON.stringify(rows).includes(payload.temporaryPassword));
  console.log('PASS encrypted credential transport, tamper/context rejection, authenticated management, atomic idempotency and secret-free receipts');
}finally {
  server.close();
  if(previous)await pool.query("UPDATE selection_workspace_config SET value=$1 WHERE key='erp-employees'",[previous]);
  else await pool.query("DELETE FROM selection_workspace_config WHERE key='erp-employees'");
  await pool.end();
}
