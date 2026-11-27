import assert from 'node:assert/strict';
import sharp from 'sharp';
import pg from 'pg';
const origin='http://127.0.0.1:8765';
const login=async account=>{const r=await fetch(origin+'/__preview/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({account})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];};
const cookie=await login('employeeA'),other=await login('employeeB');
async function call(path,method='GET',body,session=cookie) {
  const r=await fetch(origin+'/api/v1/selection-workspace'+path,{method,headers:{cookie:session,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:r.status,data:await r.json()};
}
let r=await call('/records','POST',{requestKey:crypto.randomUUID(),data:{item_name:'辅助资料测试商品',shortNameManual:true,sourceUrl:'https://detail.1688.com/offer/'+Date.now()+'.html',custom_商品长标题中文:'辅助参考图隔离测试',custom_miwa_selection_notes:'历史第一行\n历史第二行',custom_miwa_auxiliary_info:'材质：棉',custom_单个采购价:3.75,custom_单个净重g:100,custom_实际售价:1980}});
assert.equal(r.status,201);const id=r.data.id,path='/records/'+encodeURIComponent(id);
const image=async()=> (await sharp({create:{width:32,height:32,channels:3,background:{r:Math.floor(Math.random()*255),g:Math.floor(Math.random()*255),b:Math.floor(Math.random()*255)}}}).png().toBuffer()).toString('base64');
const base64=await image();
r=await call(path+'/assets','POST',{kind:'auxiliary',filename:'材料截图.png',base64});assert.equal(r.status,200,JSON.stringify(r));const aux=r.data.id;
const uploadedVersion=(await call(path)).data.version;assert.equal(uploadedVersion,2);
assert.equal((await call(path+'/assets','POST',{kind:'auxiliary',filename:'重复.png',base64})).data.id,aux);
assert.equal((await call(path)).data.version,uploadedVersion,'duplicate upload does not advance material version');
let loaded=(await call(path)).data;assert.equal(loaded.assets.length,0);assert.equal(loaded.marketAssets.length,0);assert.equal(loaded.auxiliaryAssets.length,1);
assert.equal((await call(path+'/assets','POST',{filename:'不能转为主图.png',base64})).status,409);
assert.equal((await call(path+'/assets','PUT',{ids:[aux]})).status,403);
assert.equal((await call(path,'GET',undefined,other)).status,404);
assert.equal((await call(path+'/assets','POST',{kind:'auxiliary',filename:'越权.png',base64},other)).status,404);
r=await call(path+'/assets','POST',{filename:'商品参考.png',base64:await image()});assert.equal(r.status,200);const product=r.data.id;
loaded=(await call(path)).data;
r=await call(path,'PATCH',{version:loaded.version,data:{...loaded.data,custom_中国国内运费:0}});assert.equal(r.status,200);
loaded=(await call(path)).data;assert.equal(loaded.data.custom_miwa_selection_notes,'历史第一行\n历史第二行');assert.equal(loaded.data.custom_miwa_auxiliary_info,'材质：棉');assert.equal(loaded.auxiliaryAssets[0].id,aux);
assert.equal((await call(path+'/assets','PUT',{kind:'auxiliary',ids:[]})).status,200);
loaded=(await call(path)).data;assert.equal(loaded.assets[0].id,product);assert.equal(loaded.auxiliaryAssets.length,0);
console.log(JSON.stringify({passed:true,id,checks:['auxiliary persistence','same-role dedupe','product/market isolation','cross-role rejection','cross-employee rejection','notes newlines preserved','auxiliary delete preserves product']}));
// Only the fixed isolated database and simulated connector receipts are used.
const db=new pg.Client({connectionString:'postgres://aione_test:isolated-local-test-only@127.0.0.1:15432/aione_selection'});
await db.connect();
const connection=(await db.query("SELECT value FROM selection_workspace_config WHERE key='connection'")).rows[0]?.value;
const erpSnapshot=(await db.query("SELECT value FROM selection_workspace_config WHERE key='erp'")).rows[0].value;
const receipt=async(path,body)=>{
 const res=await fetch(origin+'/api/v1/selection-workspace/connector/'+path,{method:'POST',headers:{'content-type':'application/json','x-aione-connector-token':'isolated-connector-test-only'},body:JSON.stringify(body)});
 const value=await res.json();assert.equal(res.status,200,JSON.stringify(value));return value;
};
try {
 const attachment=await call(path+'/assets','POST',{kind:'auxiliary',filename:'确认前辅助.png',base64});assert.equal(attachment.status,200);
 loaded=(await call(path)).data;
 r=await call('/batch','POST',{action:'confirm',items:[{id,version:loaded.version}]});assert.equal(r.status,200,JSON.stringify(r));
 const command=(await db.query("SELECT * FROM selection_erp_commands WHERE selection_id=$1 AND kind='formal_number' ORDER BY created_at DESC LIMIT 1",[id])).rows[0];assert.ok(command);
 const lease=crypto.randomUUID(),code='qat'+Date.now().toString(36).slice(-8);
 await db.query("UPDATE selection_erp_commands SET status='processing',lease_token=$2 WHERE id=$1",[command.id,lease]);
 await receipt('commands/'+command.id+'/result',{status:'succeeded',leaseToken:lease,result:{code}});
 loaded=(await call(path)).data;assert.equal(loaded.status,'confirmed');assert.equal(loaded.data.item_code,code);
 const fileJob=(await db.query("SELECT payload FROM selection_erp_commands WHERE selection_id=$1 AND kind='product_files' ORDER BY created_at DESC LIMIT 1",[id])).rows[0];
 assert.equal(fileJob.payload.assets.find(a=>a.id===attachment.data.id).role,'auxiliary');
 assert.equal((await call(path+'/assets','PUT',{kind:'auxiliary',ids:[]})).status,409,'pending file tasks must keep their source bytes');
 await db.query("INSERT INTO selection_workspace_config(key,value) VALUES('connection',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value",[JSON.stringify({lastSeen:new Date().toISOString()})]);
 await db.query("UPDATE selection_workspace_config SET value=jsonb_set(value,'{catalog}','[]'::jsonb) WHERE key='erp'");
 r=await call('/batch','POST',{action:'submit',items:[{id,version:loaded.version}]});assert.equal(r.status,200,JSON.stringify(r));
 const job=(await db.query('SELECT * FROM selection_erp_jobs WHERE selection_id=$1 ORDER BY created_at DESC LIMIT 1',[id])).rows[0];
 assert.equal(job.payload.assets.length,1);assert.equal(job.payload.assets[0].id,product);assert.equal(job.payload.allowPublish,false);assert.equal(job.payload.allowPaidAI,false);
 const jobLease=crypto.randomUUID();await db.query("UPDATE selection_erp_jobs SET status='processing',lease_token=$2,payload=jsonb_set(payload,'{testOnly}','false'::jsonb) WHERE id=$1",[job.id,jobLease]);
 await receipt('jobs/'+job.id+'/result',{status:'succeeded',leaseToken:jobLease,result:{stage:'item_created',itemCode:code,selectionId:id,skuCount:0,skus:[]}});
 assert.equal((await call(path)).data.erpResult.stage,'item_created');
 console.log('PASS isolated end-to-end: confirm, ERP number receipt, auxiliary file queue, ERP intake excludes auxiliary, ERP result; zero real ERP calls');
} finally {
 if(connection)await db.query("UPDATE selection_workspace_config SET value=$1 WHERE key='connection'",[JSON.stringify(connection)]);
 else await db.query("DELETE FROM selection_workspace_config WHERE key='connection'");
 await db.query("UPDATE selection_workspace_config SET value=$1 WHERE key='erp'",[JSON.stringify(erpSnapshot)]);
 await db.end();
}
