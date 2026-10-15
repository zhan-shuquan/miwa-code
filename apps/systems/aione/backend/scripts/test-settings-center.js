import assert from 'node:assert/strict';
import {INITIAL_PARAMETERS} from '../../js/config/shared-parameter-defaults.js';
import {catalogRows,catalogOptions,setCatalogRow,catalogDefault,removeCatalogRow} from '../../js/config/settings-catalog.js';
import {applyProductCatalogSelections} from '../src/services/product-catalog-selection.js';
import {normalizeProductEntry} from '../src/services/product-entry-contract.js';
import {calculateProductCosts} from '../../js/config/product-shared-cost-engine.js';
import {validateSharedParameters,activateSharedParameters} from '../src/services/shared-parameters-service.js';
import pool from '../db.js';
import express from 'express';
import sharedParametersRouter from '../src/routes/shared-parameters.js';
const p=structuredClone(INITIAL_PARAMETERS);
setCatalogRow(p,'japanPackaging',{key:'新纸盒',value:77,enabled:true,sortOrder:0});
setCatalogRow(p,'chinaPackaging',{key:'防潮包装',value:3,enabled:true,sortOrder:2});
setCatalogRow(p,'logistics',{key:'test_sea',value:{name:'测试海运',billing:'kg',fulfillment:'warehouse',perKgCny:12},enabled:true,sortOrder:0});
assert.equal(Object.keys(validateSharedParameters(p).commerce.logistics).length,9);
assert.equal(catalogRows(p,'japanPackaging')[0].name,'新纸盒');
assert.ok(catalogOptions(p,'japanPackaging').includes('新纸盒'));
const product={logisticsMethod:'测试海运',purchaseUnitCostCny:10,setQuantity:1,actualShipmentWeightG:1000,packagingMethod:'防潮包装',packagingMaterial:'新纸盒',sizeClass:'60cm',salePriceJpy:2000};
const q=calculateProductCosts(product,null,p);
assert.equal(q.status,'priced');assert.equal(q.japan,577);assert.equal(q.ledger[0][2][2][1],75);assert.equal(q.ledger[0][2][3][1],300);
p.settingsCatalogMeta.japanPackaging['新纸盒'].enabled=false;
assert.ok(!catalogOptions(p,'japanPackaging').includes('新纸盒'));
assert.ok(catalogOptions(p,'japanPackaging','新纸盒').includes('新纸盒'));
assert.equal(calculateProductCosts(product,null,p).japan,577);
assert.deepEqual(catalogOptions(p,'japanPackaging','历史包装').slice(0,1),['历史包装']);
assert.throws(()=>setCatalogRow(p,'japanPackaging',{key:'__proto__',value:1}));
for(const bad of [-1,NaN,'10',Infinity]){const x=structuredClone(p);x.commerce.japanPackagingJpy['新纸盒']=bad;assert.throws(()=>validateSharedParameters(x));}
const invalidMeta=structuredClone(p);invalidMeta.settingsCatalogMeta.japanPackaging['新纸盒'].sortOrder=-1;assert.throws(()=>validateSharedParameters(invalidMeta));
// Defaults are unique, enabled, and apply only to new product selections.
setCatalogRow(p,'chinaPackaging',{key:'防潮包装',value:3,enabled:true,sortOrder:2,isDefault:true});
assert.equal(catalogDefault(p,'chinaPackaging','原装'),'防潮包装');
const normalized=normalizeProductEntry({localCode:'test901',nameZh:'新增包装保存测试',packagingMethod:'防潮包装'});
assert.equal(applyProductCatalogSelections(normalized,{packagingMethod:'防潮包装'},null,p).packagingMethod,'防潮包装');
const defaults=applyProductCatalogSelections(normalizeProductEntry({localCode:'test902',nameZh:'默认值'}),{},null,p);
assert.equal(defaults.packagingMethod,'防潮包装');
assert.throws(()=>applyProductCatalogSelections({...product},product,null,p),e=>e.code==='inactive_product_setting');
assert.equal(applyProductCatalogSelections({...product},product,product,p).packagingMaterial,'新纸盒');
const twoDefaults=structuredClone(p);twoDefaults.settingsCatalogMeta.chinaPackaging['原装']={enabled:true,isDefault:true,sortOrder:0};assert.throws(()=>validateSharedParameters(twoDefaults));
const inactiveDefault=structuredClone(p);inactiveDefault.settingsCatalogMeta.chinaPackaging['防潮包装'].enabled=false;assert.throws(()=>validateSharedParameters(inactiveDefault));
// Exercise the real transaction boundary and optimistic concurrency without a production DB.
const originalConnect=pool.connect;let statements=[],currentVersion=3,usedReference=false;
pool.connect=async()=>({query:async(sql,args)=>{statements.push({sql,args});if(sql.startsWith('SELECT product_code FROM'))return {rows:usedReference?[{product_code:'MH0000001'}]:[]};if(sql.startsWith('SELECT version,payload FROM'))return {rows:[{version:currentVersion,payload:INITIAL_PARAMETERS}]};if(sql.startsWith('SELECT version,payload'))return {rowCount:1,rows:[{version:currentVersion,payload:INITIAL_PARAMETERS}]};return {rows:[],rowCount:1};},release(){statements.push({sql:'RELEASE'});}});
try{
 await assert.rejects(activateSharedParameters({expectedVersion:2,parameters:p,updatedBy:'tester',changeReason:'conflict'}),e=>e.statusCode===409);
 assert.ok(statements.some(x=>x.sql==='ROLLBACK'));assert.ok(!statements.some(x=>x.sql.startsWith('UPDATE ')));
 statements=[];
 const renamed=structuredClone(p);renamed.commerce.logistics.air_direct_normal.name='改名';
 await assert.rejects(activateSharedParameters({expectedVersion:3,parameters:renamed,updatedBy:'tester',changeReason:'rename'}),e=>e.code==='referenced_catalog_change');
 const deletion=structuredClone(p);removeCatalogRow(deletion,'japanPackaging','A4信封');usedReference=true;
 await assert.rejects(activateSharedParameters({expectedVersion:3,parameters:deletion,updatedBy:'tester',changeReason:'in use'}),e=>e.code==='settings_item_in_use');
 usedReference=false;
 await activateSharedParameters({expectedVersion:3,parameters:deletion,updatedBy:'tester',changeReason:'unused delete'});
 assert.ok(statements.some(x=>x.sql==='LOCK TABLE public.products IN SHARE MODE'));
 statements=[];
 const saved=await activateSharedParameters({expectedVersion:3,parameters:p,updatedBy:'tester',changeReason:'new packaging'});
 assert.equal(saved.version,4);assert.equal(saved.parameters.commerce.japanPackagingJpy['新纸盒'],77);
 assert.ok(statements.some(x=>x.sql==='COMMIT'));
 const history=statements.find(x=>x.sql.startsWith('INSERT INTO public.aione_shared_parameter_history')&&x.args);
 assert.equal(history.args[2],'tester');assert.equal(history.args[3],'new packaging');
 // Verify existing HTTP read/write role enforcement with upstream identity fixtures.
 const originalQuery=pool.query,previousAllowlist=process.env.AIONE_SHARED_PARAMETER_EDITOR_PERSON_IDS;
 process.env.AIONE_SHARED_PARAMETER_EDITOR_PERSON_IDS='tester';
 pool.query=async sql=>sql.startsWith('SELECT version,payload')?{rowCount:1,rows:[{version:3,payload:INITIAL_PARAMETERS}]}:{rowCount:1,rows:[]};
 const app=express();app.use(express.json());
 for(const [prefix,identity] of [['anon',{}],['reader',{personId:'reader',identitySource:'canonical_database'}],['editor',{personId:'tester',identitySource:'canonical_database'}]])app.use('/'+prefix,(req,res,next)=>{req.aioneIdentity=identity;next();},sharedParametersRouter);
 const server=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));});
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const options={method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedVersion:3,parameters:p,changeReason:'HTTP test'})};
  assert.equal((await fetch(base+'/anon/shared-parameters',options)).status,401);
  assert.equal((await fetch(base+'/reader/shared-parameters',options)).status,403);
  assert.equal((await (await fetch(base+'/reader/shared-parameters')).json()).capabilities.canEdit,false);
  assert.equal((await (await fetch(base+'/editor/shared-parameters')).json()).capabilities.canEdit,true);
  assert.equal((await fetch(base+'/editor/shared-parameters',options)).status,200);
 }finally{await new Promise(r=>server.close(r));pool.query=originalQuery;if(previousAllowlist===undefined)delete process.env.AIONE_SHARED_PARAMETER_EDITOR_PERSON_IDS;else process.env.AIONE_SHARED_PARAMETER_EDITOR_PERSON_IDS=previousAllowlist;}
}finally{pool.connect=originalConnect;await pool.end();}
console.log('PASS settings catalogs: arbitrary additions, cost consumption, disable/legacy selection, validation, version conflict rollback, audited commit');
