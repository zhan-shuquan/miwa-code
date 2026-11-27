import assert from 'node:assert/strict';
import pg from 'pg';
import sharp from 'sharp';
import {syncResearchTask} from '../src/services/selection-pool-service.js';
import {recordSelectionWork} from '../src/services/selection-workflow.js';
const base='http://127.0.0.1:8765';
const cookies={};
for(const account of ['manager','employeeA','employeeB']) {
  const r=await fetch(base+'/__preview/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({account})});
  assert.equal(r.status,200);cookies[account]=r.headers.get('set-cookie').split(';')[0];
}
async function api(account,path,body) {
  const r=await fetch(base+'/api/v1/selection-workspace/pool'+path,{method:body?'POST':'GET',headers:{cookie:cookies[account],'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const j=await r.json();assert.ok(r.ok,JSON.stringify(j));return j;
}
const key=crypto.randomUUID();
const screenshot = await sharp({create:{width:8,height:8,channels:3,background:'#'+key.replaceAll('-','').slice(0,6)}}).png().toBuffer();
const payload={requestKey:key,candidates:[{rawShare:'截图来源验收 https://www.xiaohongshu.com/explore/'+key,title:'',images:[{filename:'手机截图.png',base64:screenshot.toString('base64')}]}]};
const created=(await api('manager','/collect',payload)).items[0];
assert.equal(created.source.platform,'小红书');
assert.equal(created.stage.code,'unclaimed');
assert.equal((await api('manager','/collect',payload)).items[0].id,created.id);
const claimed=(await api('employeeA','/action',{action:'claim',ids:[created.id]})).items[0];
assert.equal(claimed.stage.code,'need_source');
await api('employeeA','/action',{action:'claim',ids:[created.id]});
const transferred=(await api('manager','/action',{action:'assign',ids:[created.id],owner:'86992'})).items[0];
await api('manager','/action',{action:'assign',ids:[created.id],owner:'86992'});
assert.equal(transferred.selector,created.selector);
assert.equal(transferred.selectionNo,created.selectionNo);
assert.equal(transferred.source.url,created.source.url);
const offerPrefix=String(Date.now());
const batchFile={filename:'1688原始列名批量夹具.csv',base64:Buffer.from(
  `商品标题,商品ID,商品链接,商品价格,平台\n商品甲,${offerPrefix}01,,12.5,1688\n商品乙,${offerPrefix}02,,0,1688`).toString('base64')};
const batch=(await api('manager','/collect',{file:batchFile,requestKey:crypto.randomUUID()})).items;
assert.equal(batch.length,2);assert.ok(batch.every(r=>r.state==='created'));
const batchClaim=(await api('employeeA','/action',{action:'claim',ids:batch.map(r=>r.id)})).items;
assert.ok(batchClaim.every(r=>r.stage.code==='source_found'));
const duplicateBatch=(await api('manager','/collect',{file:batchFile,requestKey:crypto.randomUUID()})).items;
assert.ok(duplicateBatch.every(r=>r.state==='duplicate'));
const port=process.env.AIONE_TEST_DB_PORT || '55432';assert.ok(['15432','55432'].includes(port));
const db=new pg.Pool({connectionString:`postgres://aione_test:isolated-local-test-only@127.0.0.1:${port}/aione_selection`});
try {
 const prices=(await db.query("SELECT (selection_workspace->'data'->>'custom_单个采购价')::numeric AS price FROM product_opportunities WHERE id=ANY($1::text[])",[batch.map(r=>r.id)])).rows.map(r=>Number(r.price)).sort((a,b)=>a-b);
 assert.deepEqual(prices,[0,12.5]);
 const evidence=(await db.query('SELECT action_code,person_id FROM work_evidence WHERE related_object_id=$1 ORDER BY action_code',[created.id])).rows;
 assert.deepEqual(evidence,[{action_code:'pool-assign',person_id:'86990'},{action_code:'pool-claim',person_id:'86991'},{action_code:'pool-collect',person_id:'86990'}]);
 const tasks=(await db.query('SELECT owner_person_id,responsible_person_id,metadata FROM work_items WHERE related_object_id=$1',[created.id])).rows;
 assert.equal(tasks.length,1);assert.equal(tasks[0].owner_person_id,'86992');
 assert.equal(tasks[0].responsible_person_id,'86992');
 assert.equal(tasks[0].metadata.stage,'need_source');
 const url=base+'/api/v1/selection-workspace/records/'+encodeURIComponent(created.id);
 const read=await fetch(url,{headers:{cookie:cookies.employeeB}});
 assert.equal(read.status,200);
 const before=await read.json();
 assert.equal(before.marketAssets.length,1);
 assert.equal(before.assets.length,0,'市场截图不能成为采购商品主图');
 const purchaseUrl='https://detail.1688.com/offer/'+Date.now()+'.html';
 const saved=await fetch(url,{method:'PATCH',headers:{cookie:cookies.employeeB,'content-type':'application/json'},body:JSON.stringify({version:before.version,data:{...before.data,sourceUrl:purchaseUrl,item_name:'测试收纳盒'}})});
 const savedBody=await saved.json();assert.equal(saved.status,200,JSON.stringify(savedBody));
 const original=(await db.query('SELECT selection_workspace FROM product_opportunities WHERE id=$1',[created.id])).rows[0].selection_workspace;
 assert.equal(original.pool.source.url,created.source.url);
 assert.equal(original.data.sourceUrl,purchaseUrl);
 assert.deepEqual(original.pool.originalAssetIds,[before.marketAssets[0].id]);
 const sourceWork=(await db.query("SELECT person_id FROM work_evidence WHERE related_object_id=$1 AND action_code='source-found'",[created.id])).rows;
 assert.deepEqual(sourceWork,[{person_id:'86992'}]);
 const list=await api('manager','/records?scope=all');
 assert.equal(list.stageCounts.reduce((sum,s)=>sum+s.count,0),list.total);
 const record=(await db.query('SELECT * FROM product_opportunities WHERE id=$1',[created.id])).rows[0];
 await recordSelectionWork(db,record,'erp-result',{occurrence:'isolated-result',detail:{status:'failed'}});
 await recordSelectionWork(db,record,'erp-result',{occurrence:'isolated-result',detail:{status:'succeeded'}});
 await recordSelectionWork(db,record,'erp-result',{occurrence:'isolated-result',detail:{status:'succeeded'}});
 const outcomes=(await db.query("SELECT person_id,result_code,work_item_id,payload FROM work_evidence WHERE related_object_id=$1 AND action_code='erp-result'",[created.id])).rows;
 assert.equal(outcomes.length,1);assert.equal(outcomes[0].result_code,'succeeded');
 assert.equal(outcomes[0].person_id,null);assert.equal(outcomes[0].work_item_id,'selection-research:'+created.id);
 assert.match(outcomes[0].payload.businessDate,/^\d{4}-\d{2}-\d{2}$/);
 // In-memory result fixture only; no ERP command is submitted or processed.
 await syncResearchTask(db,{...record,erp_job_status:'succeeded'},null);
 await syncResearchTask(db,{...record,erp_job_status:'succeeded'},null);
 const followups=(await db.query("SELECT owner_person_id,responsible_person_id,status FROM work_items WHERE id=$1",['selection-followup:'+created.id])).rows;
 assert.deepEqual(followups,[{owner_person_id:null,responsible_person_id:null,status:'pending'}]);
 console.log('PASS: 小红书来源、收集重试、认领重试、交接重试、原始资料保持、实际执行人、单一待办及阶段统计');
} finally {await db.end();}
