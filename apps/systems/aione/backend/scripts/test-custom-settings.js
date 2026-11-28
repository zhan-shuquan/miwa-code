import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {validateCustomSettings,customProductSelections,assertCustomSchemaTransition} from '../../js/config/custom-settings.js';
import {customSettingsWorkbook,parseCustomSettingsWorkbook} from '../src/services/custom-settings-workbook.js';
import {INITIAL_PARAMETERS} from '../../js/config/shared-parameter-defaults.js';
import {validateSharedParameters,activateSharedParameters} from '../src/services/shared-parameters-service.js';
import {applyProductCatalogSelections} from '../src/services/product-catalog-selection.js';
import {normalizeProductEntry} from '../src/services/product-entry-contract.js';
import pool from '../db.js';
import express from 'express';
import router from '../src/routes/shared-parameters.js';
const category={id:'c_test',name:'防护等级',owner:'商品之家',enabled:true,productBinding:true,fields:[{id:'f_num',label:'克重',type:'number',required:true},{id:'f_sel',label:'等级',type:'select',required:true,options:['普通','加强']},{id:'f_bool',label:'防水',type:'boolean',required:true},{id:'f_date',label:'确认日期',type:'date',required:false}],rows:[{id:'r_one',name:'加强防护',values:{f_num:12.5,f_sel:'加强',f_bool:false,f_date:'2026-10-15'},enabled:true,isDefault:true,sortOrder:0}]};
const settings={categories:[category]},p={...structuredClone(INITIAL_PARAMETERS),customSettings:settings};
validateCustomSettings(settings);validateSharedParameters(p);
for(const mutate of [x=>x.categories.push(structuredClone(category)),x=>x.categories[0].rows[0].values.f_num='12',x=>x.categories[0].rows[0].values.f_sel='不存在',x=>x.categories[0].rows[0].values.f_date='2026-02-30',x=>x.categories[0].fields[0].id='constructor',x=>x.categories[0].rows[0].enabled=false]){const bad=structuredClone(settings);mutate(bad);assert.throws(()=>validateCustomSettings(bad));}
const rename=structuredClone(settings);rename.categories[0].rows[0].name='新版防护';assertCustomSchemaTransition(settings,rename);
const typeChange=structuredClone(settings);typeChange.categories[0].fields[0].type='text';assert.throws(()=>assertCustomSchemaTransition(settings,typeChange));
const drop=structuredClone(settings);drop.categories[0].fields.shift();assert.throws(()=>assertCustomSchemaTransition(settings,drop));
assert.deepEqual(customProductSelections(p,{},null),{c_test:'r_one'});
assert.deepEqual(customProductSelections(p,{c_test:''},null),{});
const product=applyProductCatalogSelections(normalizeProductEntry({localCode:'test987',nameZh:'扩展选项'}),{},null,p);assert.equal(product.customSettings.c_test,'r_one');
const retired=structuredClone(p);retired.customSettings.categories[0].rows[0].enabled=false;retired.customSettings.categories[0].rows[0].isDefault=false;
assert.throws(()=>customProductSelections(retired,{c_test:'r_one'},null));assert.equal(customProductSelections(retired,undefined,{c_test:'r_one'}).c_test,'r_one');
assert.throws(()=>customProductSelections(p,{c_missing:'r_one'},null));
const bytes=await customSettingsWorkbook(category);assert.equal(bytes.subarray(0,2).toString(),'PK');
const parsed=await parseCustomSettingsWorkbook(category,bytes);assert.deepEqual(parsed.rows,category.rows);assert.deepEqual(parsed.errors,[]);
const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);book.getWorksheet('设置资料').getCell('C2').value={formula:'1+1',result:2};
const formula=await parseCustomSettingsWorkbook(category,Buffer.from(await book.xlsx.writeBuffer()));assert.equal(formula.errors[0].row,2);assert.match(formula.errors[0].message,/公式/);
const changed=structuredClone(category);changed.fields[0].label='新字段';await assert.rejects(parseCustomSettingsWorkbook(changed,bytes),/版本/);
const template=await customSettingsWorkbook(category,{template:true});const blank=new ExcelJS.Workbook();await blank.xlsx.load(template);const ws=blank.getWorksheet('设置资料');ws.addRow(['','新增防护',4,'普通','是','2026-10-16',2,'启用','否']);const fresh=await parseCustomSettingsWorkbook(category,Buffer.from(await blank.xlsx.writeBuffer()));assert.equal(fresh.errors.length,0);assert.match(fresh.rows[0].id,/^r_/);assert.equal(fresh.rows[0].values.f_bool,true);
const original=pool.connect;let statements=[],used=true;
pool.connect=async()=>({query:async(sql,args)=>{statements.push(sql);if(sql.startsWith('SELECT version,payload'))return {rowCount:1,rows:[{version:1,payload:p}]};if(sql.startsWith('SELECT product_code'))return {rows:used?[{product_code:'p_used'}]:[]};return {rowCount:1,rows:[]};},release(){}});
try{
 const deleted=structuredClone(p);deleted.customSettings.categories=[];
 await assert.rejects(activateSharedParameters({expectedVersion:1,parameters:deleted,updatedBy:'test',changeReason:'delete'}),e=>e.code==='settings_item_in_use');assert.ok(statements.includes('ROLLBACK'));
 used=false;await activateSharedParameters({expectedVersion:1,parameters:deleted,updatedBy:'test',changeReason:'delete unused'});
 const renamed=structuredClone(p);renamed.customSettings=rename;await activateSharedParameters({expectedVersion:1,parameters:renamed,updatedBy:'test',changeReason:'rename'});
 const oldAllow=process.env.AIONE_SHARED_PARAMETER_EDITOR_PERSON_IDS;process.env.AIONE_SHARED_PARAMETER_EDITOR_PERSON_IDS='test';
 const app=express();app.use(express.json({limit:'4mb'}));
 for(const [path,personId] of [['reader','reader'],['editor','test']])app.use('/'+path,(req,res,next)=>{req.aioneIdentity={personId,identitySource:'canonical_database'};next();},router);
 app.use((e,req,res,next)=>res.status(e.statusCode||500).json({message:e.message}));
 const server=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));});
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const request=(path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const exportResponse=await request('/reader/shared-parameters/custom-workbook',{category});assert.equal(exportResponse.status,200);assert.match(exportResponse.headers.get('content-type'),/spreadsheetml/);
  const base64=Buffer.from(await exportResponse.arrayBuffer()).toString('base64');
  assert.equal((await request('/reader/shared-parameters/custom-import-preview',{category,base64})).status,403);
  const preview=await request('/editor/shared-parameters/custom-import-preview',{category,base64});assert.equal(preview.status,200);assert.equal((await preview.json()).rows[0].id,'r_one');
  assert.equal((await request('/editor/shared-parameters/custom-import-preview',{category,base64:'bad!'})).status,400);
  const backup=await request('/reader/shared-parameters/backup',{parameters:p});assert.equal(backup.status,200);assert.match(backup.headers.get('content-disposition'),/backup.json/);const document=await backup.json();assert.equal(document.format,'AIONE_SETTINGS_V1');
  assert.equal((await request('/reader/shared-parameters/backup-preview',document)).status,403);
  assert.equal((await request('/editor/shared-parameters/backup-preview',document)).status,200);
  assert.equal((await request('/editor/shared-parameters/backup-preview',{format:'wrong',parameters:p})).status,400);

 }finally{await new Promise(r=>server.close(r));if(oldAllow===undefined)delete process.env.AIONE_SHARED_PARAMETER_EDITOR_PERSON_IDS;else process.env.AIONE_SHARED_PARAMETER_EDITOR_PERSON_IDS=oldAllow;}
}finally{pool.connect=original;await pool.end();}
console.log('PASS custom settings: schema, stable references, defaults, retired selections, protected schema changes, product save adapter, dynamic XLSX, formula rejection, template versions, referenced deletion rollback');
