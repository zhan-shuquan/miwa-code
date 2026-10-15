import assert from 'node:assert/strict';
const {JSDOM}=await import(process.env.AIONE_JSDOM_MODULE||'jsdom');
const dom=new JSDOM('<!doctype html><div id="app-main-host"></div>',{url:'http://localhost/#/shared-settings'});
for(const key of ['window','document','location','localStorage','sessionStorage','CustomEvent','Event','FormData','HTMLElement','HTMLDialogElement','AbortController','FileReader'])globalThis[key]=dom.window[key];
window.confirm=()=>true;
window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new Event('close'));};
const {INITIAL_PARAMETERS}=await import('../../js/config/shared-parameter-defaults.js');
const {validateSharedParameters}=await import('../src/services/shared-parameters-service.js');
const {normalizeProductEntry}=await import('../src/services/product-entry-contract.js');
const {applyProductCatalogSelections}=await import('../src/services/product-catalog-selection.js');
let saved=structuredClone(INITIAL_PARAMETERS),version=1,writes=0,storedProduct=null,allow=true;
const downloads=[];window.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);};
globalThis.fetch=async(url,options={})=>{
 if(url.includes('/product-assets/'))return {ok:true,json:async()=>({assets:[]})};
 if(url.includes('/product-entry')&&!url.endsWith('/product-entry')&&options.method!=='PATCH')return {ok:true,json:async()=>storedProduct?{product:structuredClone(storedProduct),skus:[]}:{items:[]}};
 if(url.endsWith('/product-entry')&&options.method==='POST'){
  const input=JSON.parse(options.body);storedProduct={...applyProductCatalogSelections(normalizeProductEntry(input),input,null,saved),id:'p_test',version:1};return {ok:true,json:async()=>({product:storedProduct})};
 }
 if(url.includes('/product-entry'))return {ok:true,json:async()=>({items:[],total:0})};
 if(options.method==='PATCH'){writes++;const body=JSON.parse(options.body);assert.equal(body.expectedVersion,version);saved=validateSharedParameters(body.parameters);version++;}
 return {ok:true,json:async()=>({parameters:structuredClone(saved),version,capabilities:{canEdit:allow,customSettings:true}})};
};
const {mountSettingsCenter}=await import('../../js/pages/settings-center.js');
const host=document.getElementById('app-main-host'),tick=()=>new Promise(r=>setTimeout(r,20));
const click=selector=>{const el=host.querySelector(selector);assert.ok(el,selector);el.click();};
const submit=()=>host.querySelector('[data-custom-form] form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
await mountSettingsCenter(host);click('[data-kind=custom]');
click('[data-custom=new-category]');host.querySelector('[name=name]').value='防护等级';click('[data-add-field]');
host.querySelector('[data-field-key=label]').value='说明';submit();
assert.equal(writes,0);click('[data-custom=new-row]');host.querySelector('[name=rowName]').value='加强包装';const field=host.querySelector('[data-custom-form] input[name^=f_]');assert.ok(field);field.value='防潮袋';host.querySelector('[name=isDefault]').checked=true;submit();
host.querySelector('[data-reason]').value='新增自定义选项';click('[data-action=save]');await tick();assert.equal(writes,1);
const c=saved.customSettings.categories[0],r=c.rows[0];assert.equal(r.name,'加强包装');assert.equal(r.values[c.fields[0].id],'防潮袋');
await mountSettingsCenter(host);click('[data-kind=custom]');assert.ok(host.textContent.includes('加强包装'));
// Pending category/row edits must block global save and directory changes.
click('[data-custom=edit-category]');click('[data-action=save]');await tick();assert.equal(writes,1);assert.ok(host.textContent.includes('请先完成'));
click('[data-cancel-custom]');
// Extend the same table with French; preserve existing ID, fields and rows.
click('[data-custom=edit-category]');click('[data-add-field]');const frBox=host.querySelector('[data-field-index="1"]');frBox.querySelector('[data-field-key=label]').value='法语名称';submit();
click('[data-edit-row]');const frId=host.querySelectorAll('[data-custom-form] input[name^=f_]')[1].name;host.querySelector('[name="'+frId+'"]').value='Noir';submit();host.querySelector('[data-reason]').value='同一张表增加法语';click('[data-action=save]');await tick();
assert.equal(saved.customSettings.categories[0].id,c.id);assert.equal(saved.customSettings.categories[0].rows[0].id,r.id);assert.equal(saved.customSettings.categories[0].rows[0].values[frId],'Noir');assert.equal(saved.customSettings.categories[0].rows[0].values[c.fields[0].id],'防潮袋');
click('[data-custom=edit-category]');host.querySelector('[data-field-index="1"] [data-field-key=hidden]').checked=true;submit();host.querySelector('[data-reason]').value='隐藏法语保留数据';click('[data-action=save]');await tick();assert.equal(saved.customSettings.categories[0].rows[0].values[frId],'Noir');
const {openProductEditor}=await import('../../js/pages/product-manual-entry.js');
openProductEditor(host);await tick();const dropdown=host.querySelector('[data-custom-category]');assert.ok(dropdown);assert.equal(dropdown.value,r.id);
host.querySelector('[data-f=localCode]').value='test986';host.querySelector('[data-f=localCode]').dispatchEvent(new Event('input',{bubbles:true}));
host.querySelector('[data-f=nameZh]').value='自定义字段验收商品';host.querySelector('[data-f=nameZh]').dispatchEvent(new Event('input',{bubbles:true}));
click('[data-save]');await tick();assert.equal(storedProduct.customSettings[c.id],r.id);
// Display labels change while product references remain stable.
saved.customSettings.categories[0].rows[0].name='更名防护';
openProductEditor(host,storedProduct);await tick();assert.equal(host.querySelector('[data-custom-category]').value,r.id);assert.ok(host.textContent.includes('更名防护'));
// Read-only mode cannot create categories or rows.
allow=false;await mountSettingsCenter(host);click('[data-kind=custom]');assert.equal(host.querySelector('[data-custom=new-category]').disabled,true);assert.equal(host.querySelector('[data-custom=new-row]').disabled,true);
console.log('PASS custom settings DOM: category + field + row creation, audited save, remount persistence, pending-edit protection, product selection/default/save adapter, rename-safe references and readonly controls');
dom.window.close();
