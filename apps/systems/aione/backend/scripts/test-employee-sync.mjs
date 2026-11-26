import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const docker=process.env.DOCKER_EXE;
if(!docker)throw Error('Explicit development Docker required');
function run(command,args,input,env=process.env){return new Promise((resolve,reject)=>{
 const p=spawn(command,args,{windowsHide:true,env});let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',code=>code?reject(Error(err||out)):resolve(out));p.stdin.end(input);
});}
async function edit(name){return JSON.parse(await run(docker,['exec','-i','-w','/home/frappe/frappe-bench','miwa-erp-dev-backend-1','env/bin/python','-'],`import os,json,frappe
os.chdir('/home/frappe/frappe-bench/sites');frappe.init(site='miwa-dev.localhost',sites_path='/home/frappe/frappe-bench/sites');frappe.connect();frappe.set_user('Administrator')
try:
 e=frappe.get_doc('Employee','HR-EMP-00002');assert e.custom_miwa_member_id=='86991'
 previous=e.first_name
 e.first_name=${JSON.stringify(name)};e.save();frappe.db.commit();print(json.dumps({'previous':previous,'current':e.employee_name},ensure_ascii=False))
finally:frappe.destroy()
`));}
async function sync(){return run(process.execPath,[fileURLToPath(new URL('./local-erp-selection-connector.mjs',import.meta.url))],undefined,{...process.env,AIONE_CLOUD_URL:'http://127.0.0.1:8765',AIONE_CONNECTOR_TOKEN:'isolated-connector-test-only',AIONE_CONNECTOR_ONCE:'1'});}
const login=await fetch('http://127.0.0.1:8765/__preview/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({account:'employeeA'})});
const cookie=login.headers.get('set-cookie').split(';')[0];
const profile=async()=>{const r=await fetch('http://127.0.0.1:8765/api/v1/selection-workspace/employees/me?memberId=86992',{headers:{cookie}});assert.equal(r.status,200);return r.json();};
await sync();const before=await profile();let saved;
try {
 saved=await edit('AIONE选品池测试甲·同步验证');await sync();const after=await profile();
 assert.equal(after.employee.memberId,'86991');assert.equal(after.employee.name,saved.current);assert.notEqual(after.employee.version,before.employee.version);
 assert(!JSON.stringify(after).includes('86992'));
 console.log(JSON.stringify({checks:4,result:'ERP edit → connector → authorized own profile updated; cross-member query ignored'}));
} finally {if(saved){await edit(saved.previous);await sync();assert.equal((await profile()).employee.name,before.employee.name);console.log('Original test employee name restored and synchronized');}}
