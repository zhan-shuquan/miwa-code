import assert from 'node:assert/strict';
import pool from '../db.js';
import {readSharedParameters,activateSharedParameters} from '../src/services/shared-parameters-service.js';
import {saveManualProduct} from '../src/services/product-manual-entry-service.js';
import {readSettingsReferenceUsage} from '../src/services/settings-reference-usage.js';
import {addProductCatalogPresets} from '../../js/config/product-setting-catalogs.js';
if(process.env.AIONE_ENV!=='controlled-ci'||!process.env.DATABASE_URL)throw new Error('Requires disposable controlled-ci database');
async function run(){
 let state=await readSharedParameters();
 const activate=parameters=>activateSharedParameters({expectedVersion:state.version,parameters,updatedBy:'ci-catalogs',changeReason:'product catalog acceptance'});
 const p=structuredClone(state.parameters);p.customSettings=addProductCatalogPresets(p);
 state=await activate(p);
 const brands=state.parameters.customSettings.categories.find(c=>c.productField==='brand');
 const input={localCode:'bnd901',nameZh:'绑定字段验收',brand:'HOMEONE',category:'家居用品'};
 let result=await saveManualProduct(input,{personId:'ci'},{createOnly:true});
 const id=brands.rows.find(r=>r.businessValue==='HOMEONE').id;
 assert.equal(result.product.customSettings[brands.id],id);
 const count=(await readSettingsReferenceUsage())[brands.id][id];assert.ok(count>=1);
 result=await saveManualProduct({...result.product,remarks:'重复保存'},{personId:'ci'},{updateOnly:true,expectedVersion:result.product.version});
 assert.equal((await readSettingsReferenceUsage())[brands.id][id],count);
 // Pre-migration metadata without a stable row ID still counts once and prevents deletion.
 await pool.query("UPDATE public.products SET metadata=jsonb_set(metadata,'{manualEntry,customSettings}',(metadata->'manualEntry'->'customSettings')-$1) WHERE id=$2",[brands.id,result.product.id]);
 assert.equal((await readSettingsReferenceUsage())[brands.id][id],count);
 const removed=structuredClone(state.parameters);removed.customSettings.categories.find(c=>c.id===brands.id).rows=brands.rows.filter(r=>r.id!==id);
 await assert.rejects(activate(removed),e=>e.code==='settings_item_in_use');
 const renamed=structuredClone(state.parameters);renamed.customSettings.categories.find(c=>c.id===brands.id).rows.find(r=>r.id===id).name='HOMEONE 展示名称';state=await activate(renamed);
 result=await saveManualProduct({...result.product,customSettings:{}},{personId:'ci'},{updateOnly:true,expectedVersion:result.product.version});
 assert.equal(result.product.brand,'HOMEONE');assert.equal(result.product.customSettings[brands.id],id);
 const retired=structuredClone(state.parameters);retired.customSettings.categories.find(c=>c.id===brands.id).rows.find(r=>r.id===id).enabled=false;state=await activate(retired);
 await assert.rejects(saveManualProduct({...input,localCode:'bnd902'},{personId:'ci'},{createOnly:true}),e=>e.code==='inactive_product_setting');
 result=await saveManualProduct({...result.product,remarks:'保留停用品牌'},{personId:'ci'},{updateOnly:true,expectedVersion:result.product.version});assert.equal(result.product.brand,'HOMEONE');
 console.log('PASS Postgres bound catalogs: persisted IDs, legacy references, exact usage, repeated-save invariance, protected deletion, renamed labels and retired selections');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>pool.end());
