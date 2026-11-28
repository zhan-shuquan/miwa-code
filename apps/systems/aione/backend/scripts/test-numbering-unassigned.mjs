import assert from 'node:assert/strict';
import pg from 'pg';
const base='http://127.0.0.1:8765';
const db=new pg.Client({connectionString:'postgres://aione_test:isolated-local-test-only@127.0.0.1:15432/aione_selection'});
await db.connect();
const login=await fetch(base+'/__preview/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({account:'manager'})});
const cookie=login.headers.get('set-cookie').split(';')[0];
async function api(path,body,connector=false){const r=await fetch(base+'/api/v1/selection-workspace'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(connector?{'x-aione-connector-token':'isolated-connector-test-only'}:{cookie})},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
async function claimFor(id){for(let i=0;i<30;i++){const found=(await api('/connector/commands/claim',{},true)).jobs.find(x=>x.id===id);if(found)return found;}throw Error('test command not claimed');}
try {
 for(const manual of [true,false]) {
  const code='qmt'+Date.now().toString(36).slice(-8);
  const r=await fetch(base+'/api/v1/selection-workspace/records',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({requestKey:crypto.randomUUID(),data:{item_name:'编号隔离测试',shortNameManual:true,item_code:manual?code:'',sourceUrl:'https://detail.1688.com/offer/'+Date.now()+'.html',custom_单个采购价:5,custom_单个净重g:71,custom_实际售价:1000}})});
  assert.equal(r.status,201);const record=await r.json(),id=record.id;
  await db.query('UPDATE product_opportunities SET owner_person_id=NULL WHERE id=$1',[id]);
  await api('/batch',{action:'confirm',items:[{id,version:record.version}]});
  let command=(await db.query("SELECT * FROM selection_erp_commands WHERE selection_id=$1 AND kind='formal_number'",[id])).rows[0];
  assert.equal(command.payload.memberId,'86990');assert.equal(command.payload.requestedCode,manual?code:'');
  // Reproduce the exact production failure, then claim must repair it without reconfirming.
  await db.query(`UPDATE selection_erp_commands SET payload=jsonb_set(payload,'{memberId}','null'),status='failed',result='{"message":"负责人未关联有效ERP员工档案"}' WHERE id=$1`,[command.id]);
  let claimed=await claimFor(command.id);
  assert.ok(claimed);assert.equal(claimed.payload.memberId,'86990');
  await api('/connector/commands/'+command.id+'/result',{leaseToken:claimed.lease_token,status:'failed',result:{message:'temporary test outage',retryable:true}},true);
  claimed=await claimFor(command.id);assert.ok(claimed);
  await api('/connector/commands/'+command.id+'/result',{leaseToken:claimed.lease_token,status:'succeeded',result:{code,memberId:'86990'}},true);
  const loaded=await api('/records/'+encodeURIComponent(id));assert.equal(loaded.status,'confirmed');assert.equal(loaded.data.item_code,code);assert.equal(loaded.owner,null);
  await api('/batch',{action:'confirm',items:[{id,version:record.version}]});
  assert.equal((await db.query("SELECT count(*)::int AS n FROM selection_erp_commands WHERE selection_id=$1 AND kind='formal_number'",[id])).rows[0].n,1);
  assert.equal((await api('/records/'+encodeURIComponent(id))).data.item_code,code);
  const files=(await db.query("SELECT payload FROM selection_erp_commands WHERE selection_id=$1 AND kind='product_files'",[id])).rows;
  assert.equal(files.length,1);assert.equal(files[0].payload.owner,null);
  const fileLease=crypto.randomUUID();
  const legacyFile=(await db.query("UPDATE selection_erp_commands SET payload=jsonb_set(payload,'{actor}','null'),status='processing',lease_token=$2 WHERE selection_id=$1 AND kind='product_files' RETURNING id",[id,fileLease])).rows[0];
  await api('/connector/commands/'+legacyFile.id+'/result',{status:'succeeded',leaseToken:fileLease,result:{state:'saved',code,selectionId:id}},true);
  assert.equal((await db.query("SELECT status FROM selection_erp_commands WHERE id=$1",[legacyFile.id])).rows[0].status,'succeeded');
  assert.equal((await db.query("SELECT actor_id FROM selection_workspace_events WHERE selection_id=$1 AND action='product-files' ORDER BY id DESC LIMIT 1",[id])).rows[0].actor_id,'system:erp-connector');
  // A changed recognition engine must not rewrite already confirmed results on submit-save.
  await db.query(`UPDATE product_opportunities SET selection_workspace=jsonb_set(selection_workspace,'{data}',(selection_workspace->'data') || $2::jsonb) WHERE id=$1`,[id,JSON.stringify({custom_商品长标题中文:'水果取芯削皮器',item_name:'已确认水果取芯削皮器',item_group:'家居生活',shortNameManual:false})]);
  const beforeSave=await api('/records/'+encodeURIComponent(id));
  const saveResponse=await fetch(base+'/api/v1/selection-workspace/records/'+encodeURIComponent(id),{method:'PATCH',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({version:beforeSave.version,data:beforeSave.data})});
  const afterSave=await saveResponse.json();assert.equal(saveResponse.status,200,JSON.stringify(afterSave));assert.equal(afterSave.status,'confirmed');assert.equal(afterSave.data.item_name,beforeSave.data.item_name);
  console.log('PASS '+(manual?'manual code':'automatic code')+': unassigned owner, original selector identity, legacy failure repair, transient retry, receipt, repeated confirmation, one file job');
 }
} finally {await db.end();}
