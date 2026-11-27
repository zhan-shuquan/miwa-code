import assert from 'node:assert/strict';
import {createEmployeeMaster} from '../src/services/employee-master.js';
const cache=new Map([['pool-grants',{'existing-admin':{manage:true,manageGrants:true}}]]);
const pool={query:async(sql,args)=>{
 if(sql==='SELECT id FROM people')return {rows:[{id:'ordinary'},{id:'existing-admin'}]};
 if(sql.includes('SELECT value FROM selection_workspace_config')){const key=sql.includes("'pool-grants'")?'pool-grants':'erp-employees';return {rows:cache.has(key)?[{value:structuredClone(cache.get(key))}]:[]};}
 return {rows:[]};
}};
const svc=createEmployeeMaster({pool,config:async k=>cache.get(k),putConfig:async(k,v)=>cache.set(k,structuredClone(v))});
const row=(id,permissions,status='Active')=>({employeeId:'ERP-'+id,memberId:id,name:id,status,version:'1',businessPermissions:permissions});
const req={aioneIdentity:{personId:'ordinary',identitySource:'canonical_database'}};
let checks=0;
const receive=async(p,status='Active')=>svc.receive({schemaVersion:1,permissionsSchemaVersion:1,capturedAt:new Date().toISOString(),employees:[row('ordinary',p,status),row('existing-admin',null)]});
await receive({research:true,collect:true});await svc.requireActive(req);checks++;
assert.deepEqual(cache.get('pool-grants')['existing-admin'],{manage:true,manageGrants:true});checks++;
assert.equal(cache.get('pool-grants').ordinary.manage,false);checks++;
assert.equal(cache.get('pool-grants').ordinary.assign,false);checks++;
await receive({});await assert.rejects(svc.requireActive(req),/业务权限/);checks++;
await receive({research:true});await svc.requireActive(req);checks++;
await receive(null);await assert.rejects(svc.requireActive(req),/业务权限/);checks++;
await receive({research:true},'Left');await assert.rejects(svc.requireActive(req),/停用/);checks++;
await assert.rejects(svc.receive({schemaVersion:1,capturedAt:new Date().toISOString(),employees:[]}),/降级/);checks++;
console.log(JSON.stringify({checks,scope:'ERP permission snapshot, ordinary scope, revocation, disable, legacy preservation; isolated only'}));
