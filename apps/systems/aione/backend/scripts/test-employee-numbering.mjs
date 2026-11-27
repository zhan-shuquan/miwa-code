// Only the pre-existing isolated ERP test employee/prefix is used, never a real member's series.
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=await readFile(new URL('./erp-selection-numbering.py',import.meta.url));
const docker=process.env.DOCKER_EXE;
if (!docker) throw Error('Explicit development Docker executable required');
function allocate(selectionId,memberId='86991') {
  return new Promise((resolve,reject)=>{
    const p=spawn(docker,['exec','-i','-w','/home/frappe/frappe-bench','miwa-erp-dev-backend-1','env/bin/python','-c',`import base64;exec(base64.b64decode('${source.toString('base64')}'))`],{windowsHide:true});
    let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);
    p.on('close',code=>{try{if(code)throw Error(err);resolve(JSON.parse(out));}catch(e){reject(e);}});
    p.stdin.end(JSON.stringify({kind:'formal_number',payload:{selectionId,memberId,selectionNo:'EMPLOYEE-MASTER-ACCEPTANCE',existingCodes:[]}}));
  });
}
const id='employee-master-v1:concurrent-a';
const [a,b,c]=await Promise.all([allocate(id),allocate(id),allocate('employee-master-v1:concurrent-b')]);
for (const r of [a,b,c]) assert.equal(r.status,'succeeded',JSON.stringify(r));
assert.equal(a.result.code,b.result.code);
assert.notEqual(a.result.code,c.result.code);
assert.match(a.result.code,/^qat\d+$/);
assert(Number(a.result.code.slice(3))>2);
const changed=await allocate(id,'86992');
assert.equal(changed.result.code,a.result.code);
assert.equal(changed.result.memberId,'86991');
console.log(JSON.stringify({checks:9,codes:[a.result.code,c.result.code],scope:'8081 test employee only; reservations retained for audit; no Item or publication created'}));
