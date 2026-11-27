import assert from 'node:assert/strict';
const base='http://127.0.0.1:8765';
async function login(account){const r=await fetch(base+'/__preview/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
const cookie=await login('employeeA'), other=await login('employeeB');
async function call(path,method='GET',body,auth=cookie){const r=await fetch(base+'/api/v1/selection-workspace'+path,{method,headers:{cookie:auth,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
for(const [title,name] of [['厨房吸水去油抹布','抹布'],['针织毛线手套冬季保暖','针织手套'],['办公室披肩毯','披肩毯'],['家用迷你封口器','迷你封口机']]){
 const recognized=await call('/identify','POST',{title});assert.equal(recognized.status,200,JSON.stringify(recognized.body));assert.equal(recognized.body.shortName.name,name);
 const created=await call('/records','POST',{requestKey:crypto.randomUUID(),data:{custom_商品长标题中文:title,item_name:'',shortNameManual:true}});
 assert.equal(created.status,201,JSON.stringify(created.body));assert.equal(created.body.data.item_name,name);assert.equal(created.body.data.shortNameManual,false);
 const path='/records/'+encodeURIComponent(created.body.id);
 const loaded=await call(path);assert.equal(loaded.body.data.item_name,name);
 assert.equal((await call(path,'GET',undefined,other)).status,404);
 const saved=await call(path,'PATCH',{version:loaded.body.version,data:{...loaded.body.data,item_name:'人工核实简称',shortNameManual:true}});
 assert.equal(saved.status,200,JSON.stringify(saved.body));assert.equal(saved.body.data.item_name,'人工核实简称');
 assert.equal((await call(path)).body.data.item_name,'人工核实简称');
}
const unknown=await call('/identify','POST',{title:'新品多用途神器'});assert.equal(unknown.body.shortName.review,true);assert.equal(unknown.body.shortName.name,null);
console.log('PASS: ordinary employee recognition, empty/manual flag recovery, draft save/reload, manual name preservation, employee isolation, unknown-title review');
