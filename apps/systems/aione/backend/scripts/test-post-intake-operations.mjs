import assert from 'node:assert/strict';
import pg from 'pg';
import {OPERATING_FIELDS} from '../../js/services/selection-operating-fields.js';
const code='qop'+Date.now().toString(36).slice(-8);
const origin='http://127.0.0.1:8765';
const db=new pg.Client({connectionString:'postgres://aione_test:isolated-local-test-only@127.0.0.1:15432/aione_selection'});
await db.connect();
async function login(account){const r=await fetch(origin+'/__preview/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({account})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
const owner=await login('employeeA'),other=await login('employeeB'),manager=await login('manager');
async function api(path,method='GET',body,cookie=owner,status=200){const r=await fetch(origin+'/api/v1/selection-workspace'+path,{method,headers:{cookie,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;}
const protectedData=d=>Object.fromEntries(Object.entries(d).filter(([key])=>!OPERATING_FIELDS.includes(key)));
try{
 let r=await api('/records','POST',{requestKey:crypto.randomUUID(),data:{item_name:'建档后运营隔离验收',shortNameManual:true,sourceUrl:'https://example.invalid/operations-'+crypto.randomUUID(),custom_单个采购价:5,custom_单个净重g:80,custom_套装数量:1,custom_国际物流方式:'空运大件（普货）',custom_中国包装方式:'原装',custom_日本包装物:'A4信封',custom_日本发货尺寸:'3cm厚',custom_实际售价:1000}},owner,201);
 const path='/records/'+encodeURIComponent(r.id);
 const workspace=(await db.query('SELECT selection_workspace FROM product_opportunities WHERE id=$1',[r.id])).rows[0].selection_workspace;
 workspace.status='submitted';workspace.formalNumber={code:code};workspace.erpResult={stage:'item_created',itemCode:code,skuCount:1,skus:[{name:code+'_c01',supplierSkuId:'original-sku'}]};workspace.data.item_code=code;workspace.data.skus=[{code:code+'_c01',name:'原规格',supplierSkuId:'original-sku',erpSku:code+'_c01'}];
 await db.query('UPDATE product_opportunities SET selection_workspace=$2 WHERE id=$1',[r.id,JSON.stringify(workspace)]);
 r=await api(path);const before=structuredClone(r),protectedBefore=protectedData(r.data);
 const counts=async()=> (await db.query('SELECT (SELECT count(*) FROM selection_erp_jobs WHERE selection_id=$1)::int AS jobs,(SELECT count(*) FROM selection_erp_commands WHERE selection_id=$1)::int AS commands',[r.id])).rows[0];
 const beforeCounts=await counts();
 for(const [mode,value,fee] of [['百分比',50,299],['固定金额',2990,299],['百分比',0,598]]){
  const patch={custom_实际售价:5980,custom_aione_coupon_mode:mode,...(mode==='固定金额'?{custom_aione_coupon_amount:value}:{custom_aione_coupon:value}),custom_aione_points:1,custom_aione_ads:2,custom_aione_other:3,operatingStrategy:'运营回归：'+mode};
  r=await api(path,'PATCH',{version:r.version,data:patch});r=await api(path);
  assert.equal(r.status,'submitted');assert.deepEqual(r.erpResult,before.erpResult);assert.deepEqual(r.formalNumber,before.formalNumber);assert.deepEqual(protectedData(r.data),protectedBefore);assert.equal(r.pricing.results.custom_平台交易成本,fee);assert.equal(r.data.operatingStrategy,patch.operatingStrategy);assert.equal(r.data.custom_实际售价,5980);
 }
 const savedVersion=r.version;
 await api(path,'PATCH',{version:r.version,data:{item_code:'changed'}},owner,409);
 await api(path,'PATCH',{version:r.version,data:{skus:[]}},owner,409);
 await api(path,'PATCH',{version:r.version,data:{custom_单个采购价:999}},owner,409);
 await api(path,'PATCH',{version:r.version,data:{custom_aione_ads:4}},other,404);
 await api(path,'PATCH',{version:r.version,data:{custom_aione_ads:-1}},owner,400);
 await api(path,'PATCH',{version:r.version,data:{custom_aione_coupon_mode:'unknown'}},owner,400);
 r=await api(path,'PATCH',{version:r.version,data:{operatingStrategy:''}},manager);assert.equal(r.data.operatingStrategy,'');
 await api(path,'PATCH',{version:savedVersion,data:{custom_aione_ads:4}},owner,409);
 assert.deepEqual(await counts(),beforeCounts);
 await db.query('UPDATE product_opportunities SET archived_at=now() WHERE id=$1',[r.id]);
 await api(path,'PATCH',{version:r.version,data:{...r.data,custom_aione_ads:4}},owner,409);
 console.log(JSON.stringify({passed:true,id:r.id,checks:['post-intake coupon modes and trial price','save/reload','strategy clearing','identity and SKU immutable','no new ERP/file jobs','existing owner/manager scope','other employee denied','invalid values rejected','stale version rejected','archived remains locked']}));
}finally{await db.end();}
