import assert from 'node:assert/strict';
const base='http://127.0.0.1:8765';
const login=await fetch(base+'/__preview/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account:'employeeA'})});
const cookie=login.headers.get('set-cookie').split(';')[0];
async function call(path,method='GET',body){const r=await fetch(base+'/api/v1/selection-workspace'+path,{method,headers:{cookie,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
const boot=(await call('/bootstrap')).data;
const axis=boot.itemAttributes.find(a=>a.name==='Colour')||boot.itemAttributes[0];
const data={custom_商品长标题中文:'隔离统一SKU确认验收',custom_单个采购价:6.8,custom_单个净重g:100,custom_实际售价:1980,has_variants:true,specificationAttributes:[{attribute:axis.name,sales:true}],fixedSpecifications:{},skus:[
 {code:'manual_one',origin:'manual',supplierSkuId:'fixture001',selected:true,confirmed:false,attributeValues:{[axis.name]:'隔离白'}},
 {code:'excluded',origin:'manual',supplierSkuId:'fixture002',selected:false,confirmed:false,attributeValues:{[axis.name]:'?'}}]};
const made=await call('/records','POST',{data,requestKey:crypto.randomUUID()});assert.equal(made.status,201,JSON.stringify(made));
const confirmed=await call('/batch','POST',{action:'confirm',items:[{id:made.data.id,version:made.data.version}]});assert.equal(confirmed.status,200,JSON.stringify(confirmed));
const record=(await call('/records/'+encodeURIComponent(made.data.id))).data;
assert.equal(record.data.skus[0].confirmed,true);
assert.equal(record.data.skus[0].spec,'隔离白');
assert.equal(record.data.skus[1].selected,false);
assert.equal(record.data.skus[1].confirmed,false);
assert.equal(record.data.skus[1].attributeValues[axis.name],'?');
assert.ok(['confirmed','number_pending'].includes(record.status));
const retry=await call('/batch','POST',{action:'confirm',items:[{id:record.id,version:record.version}]});
assert.ok([200,409].includes(retry.status),JSON.stringify(retry));
console.log(JSON.stringify({id:record.id,unifiedConfirmation:true,excludedPreserved:true,status:record.status,retry:retry.status}));
