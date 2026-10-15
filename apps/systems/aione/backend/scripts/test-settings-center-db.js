import assert from 'node:assert/strict';
import pool from '../db.js';
import {readSharedParameters,activateSharedParameters} from '../src/services/shared-parameters-service.js';
import {saveManualProduct,getManualProduct} from '../src/services/product-manual-entry-service.js';
import {setCatalogRow,removeCatalogRow} from '../../js/config/settings-catalog.js';
if(process.env.AIONE_ENV!=='controlled-ci'||!process.env.DATABASE_URL)throw new Error('Requires controlled-ci disposable database');
async function run(){
 let state=await readSharedParameters();
 const activate=parameters=>activateSharedParameters({expectedVersion:state.version,parameters,updatedBy:'ci',changeReason:'settings catalog DB acceptance'});
 const p=structuredClone(state.parameters);
 setCatalogRow(p,'chinaPackaging',{key:'CI防潮包装',value:3,enabled:true,sortOrder:0,isDefault:true});
 setCatalogRow(p,'japanPackaging',{key:'CI纸盒',value:77,enabled:true,sortOrder:0,isDefault:true});
 setCatalogRow(p,'japanPackaging',{key:'CI未引用',value:10,enabled:true,sortOrder:1});
 state=await activate(p);
 const input={localCode:'set901',nameZh:'设置中心真实保存验证',weightG:100,purchaseUnitCostCny:10,sizeClass:'60cm'};
 const created=await saveManualProduct(input,{personId:'ci'},{createOnly:true});
 assert.equal(created.product.packagingMethod,'CI防潮包装');assert.equal(created.product.packagingMaterial,'CI纸盒');
 assert.equal((await getManualProduct('set901')).product.packagingMethod,'CI防潮包装');
 const removingUsed=structuredClone(state.parameters);removeCatalogRow(removingUsed,'japanPackaging','CI纸盒');
 await assert.rejects(activate(removingUsed),e=>e.code==='settings_item_in_use');
 assert.equal((await readSharedParameters()).version,state.version);
 const removingUnused=structuredClone(state.parameters);removeCatalogRow(removingUnused,'japanPackaging','CI未引用');
 state=await activate(removingUnused);assert.equal(state.parameters.commerce.japanPackagingJpy['CI未引用'],undefined);
 const retiring=structuredClone(state.parameters);retiring.settingsCatalogMeta.japanPackaging['CI纸盒'].enabled=false;retiring.settingsCatalogMeta.japanPackaging['CI纸盒'].isDefault=false;
 state=await activate(retiring);
 await assert.rejects(saveManualProduct({...input,localCode:'set902',packagingMethod:'CI防潮包装',packagingMaterial:'CI纸盒'},{personId:'ci'},{createOnly:true}),e=>e.code==='inactive_product_setting');
 const edited=await saveManualProduct({...created.product,remarks:'停用项保留原商品引用'},{personId:'ci'},{updateOnly:true,expectedVersion:created.product.version});
 assert.equal(edited.product.packagingMaterial,'CI纸盒');
 const racing=structuredClone(state.parameters);setCatalogRow(racing,'japanPackaging',{key:'CI并发',value:12,enabled:true,sortOrder:1});state=await activate(racing);
 const deleted=structuredClone(state.parameters);removeCatalogRow(deleted,'japanPackaging','CI并发');
 const results=await Promise.allSettled([
  saveManualProduct({...input,localCode:'set903',packagingMethod:'CI防潮包装',packagingMaterial:'CI并发'},{personId:'ci'},{createOnly:true}),
  activate(deleted)
 ]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1,'Concurrent creation and deletion cannot both succeed');
 const rejected=results.find(x=>x.status==='rejected').reason;
 assert.ok(['settings_item_in_use','inactive_product_setting'].includes(rejected.code),rejected.message);
 const history=await pool.query("SELECT updated_by,change_reason FROM public.aione_shared_parameter_history WHERE scope='global' ORDER BY version DESC LIMIT 1");
 assert.equal(history.rows[0].updated_by,'ci');assert.ok(history.rows[0].change_reason);
 console.log('PASS real Postgres: configured defaults, custom packaging persistence, referenced deletion rollback, unused deletion, retired selection, concurrent save/delete integrity, audit history');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>pool.end());
