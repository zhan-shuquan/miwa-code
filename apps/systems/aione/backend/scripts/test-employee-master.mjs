import {readFile} from "node:fs/promises";
const development=JSON.parse(await readFile(new URL("../config/local-development.json",import.meta.url),"utf8"));
import assert from 'node:assert/strict';
import {createEmployeeMaster,validateEmployeeSnapshot,employeeFields} from '../src/services/employee-master.js';
const cache=new Map([['pool-grants',{'fixture-a':{research:true},'fixture-b':{collect:true}}]]);
const pool={query:async(sql)=>sql==='SELECT id FROM people' ? {rows:[{id:'fixture-a'},{id:'fixture-b'}]} : sql.includes('SELECT value FROM selection_workspace_config') ? {rows:cache.has('erp-employees')?[{value:cache.get('erp-employees')}]:[]} : {rows:[]}};
const service=createEmployeeMaster({pool,config:async key=>cache.get(key),putConfig:async(key,value)=>cache.set(key,value)});
const employee=(memberId,name)=>({employeeId:'ERP-'+memberId,memberId,name,status:'Active',prefix:memberId,version:'1',updatedAt:new Date().toISOString()});
const snapshot=(employees)=>({schemaVersion:1,employees,version:'v1',capturedAt:new Date().toISOString()});
const req=id=>({aioneIdentity:{personId:id,identitySource:'canonical_database'}});
let checks=0;
function check(value){assert(value);checks++;}
await service.receive(snapshot([{...employee('fixture-a','员工甲'),salary:999,bank_account:'secret'},employee('fixture-b','员工乙'),employee('unregistered','不可见')]));
check(cache.get('erp-employees').employees.length===2);
const first=await service.profile('fixture-a');
check(Object.keys(first.employee).every(k=>employeeFields.includes(k)));
check(!JSON.stringify(first).includes('secret') && !first.employee.salary);
check(!(await service.profile('someone-else')).employee);
check((await service.eligible()).length===2);
await service.requireActive(req('fixture-a'));checks++;
await assert.rejects(service.requireActive(req('missing')),/尚未关联/);checks++;
await assert.rejects(service.requireActive({aioneIdentity:{personId:'fixture-a',identitySource:'isolated_test'}}),/测试身份/);checks++;
assert.throws(()=>validateEmployeeSnapshot(snapshot([employee('fixture-a','甲'),employee('fixture-a','乙')])),/重复/);checks++;
assert.throws(()=>validateEmployeeSnapshot(snapshot([{...employee('fixture-a','甲'),prefix:'ABC'},{...employee('fixture-b','乙'),prefix:'abc'}])),/重复/);checks++;
const cached=cache.get('erp-employees');
await assert.rejects(service.receive({...snapshot([]),capturedAt:'2000-01-01T00:00:00Z'}),/过期/);checks++;
await assert.rejects(service.receive({schemaVersion:1,employees:[]}),/无效/);check(cache.get('erp-employees')===cached);
cached.receivedAt='2000-01-01T00:00:00Z';check((await service.profile('fixture-a')).cached);
await service.requireActive(req('fixture-a'));checks++;
await service.receive(snapshot([employee('fixture-a','甲改名'),{...employee('fixture-b','乙'),status:'Left'}]));
check((await service.profile('fixture-a')).employee.name==='甲改名');
check((await service.eligible()).length===1);
await assert.rejects(service.requireActive(req('fixture-b')),/停用/);checks++;
cache.set('pool-grants',{});
check((await service.eligible()).length===0);
check((await service.eligible({includeUnassigned:true})).length===1);
await assert.rejects(service.requireActive(req('fixture-a')),/业务权限/);checks++;
await service.receive(snapshot([]));
check(!(await service.profile('fixture-a')).employee);
await assert.rejects(service.requireActive(req('fixture-a')),/尚未关联/);checks++;
// Real development endpoint must reject all test-account and forged identity paths.
for (const [path,options,status] of [
  ['/__preview/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({account:'manager'})},404],
  ['/api/v1/selection-workspace/employees/me',{headers:{'x-aione-person-id':'86000'}},401],
  ['/auth/google',{method:'POST',headers:{'content-type':'application/json',origin:development.origin},body:JSON.stringify({credential:'forged'})},401],
]) {const r=await fetch(development.origin+path,options);assert.equal(r.status,status);checks++;}
console.log(JSON.stringify({checks,scope:'Employee cache/permissions and real-development auth rejection; no real Google login simulated'}));
