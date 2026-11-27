import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base='http://127.0.0.1:8765/api/v1/selection-workspace',cookies={};
for(const account of ['manager','employeeA','employeeB']){const r=await fetch('http://127.0.0.1:8765/__preview/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({account})});cookies[account]=r.headers.get('set-cookie').split(';')[0];}
async function call(who,path,body,status=200){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{cookie:cookies[who],'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const out=await r.json();assert.equal(r.status,status,JSON.stringify(out));return out;}
const input={text:'隔离溯源验收\nhttps://example.com/origin/'+randomUUID(),requestKey:randomUUID()};
const [first,repeat]=await Promise.all([call('manager','/pool/collect',input,201),call('manager','/pool/collect',input,201)]);
assert.equal(first.items[0].id,repeat.items[0].id);const id=first.items[0].id,no=first.items[0].selectionNo;assert.match(no,/^qmt\d{9}$/);
await call('manager','/pool/action',{action:'assign',ids:[id],owner:'86991'});
const r=await call('employeeA','/records/'+encodeURIComponent(id));
assert.equal(r.selectionNo,no);assert.equal(r.selectorEmployeeId,'FIXTURE-86990');assert.equal(r.ownerEmployeeId,'FIXTURE-86991');assert.equal(r.selector,'86990');assert.equal(r.owner,'86991');
await call('employeeB','/records/'+encodeURIComponent(id),null,404);
const directInput={data:{custom_商品长标题中文:'隔离自主选品'},requestKey:randomUUID()};
const [a,b]=await Promise.all([call('employeeB','/records',directInput,201),call('employeeB','/records',directInput,201)]);
assert.equal(a.id,b.id);assert.match(a.selectionNo,/^qbt\d{9}$/);assert.equal(a.ownerEmployeeId,a.selectorEmployeeId);
console.log(JSON.stringify({passed:true,pool:{id,number:no,selector:r.selectorEmployeeId,owner:r.ownerEmployeeId},direct:{id:a.id,number:a.selectionNo},retry:'same record',isolation:'404'}));
