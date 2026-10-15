import assert from 'node:assert/strict';
import pool from '../db.js';
import {readSharedParameters,activateSharedParameters} from '../src/services/shared-parameters-service.js';
import {saveManualProduct,getManualProduct} from '../src/services/product-manual-entry-service.js';
import {readSettingsReferenceUsage} from '../src/services/settings-reference-usage.js';
import {addSpecCatalogPresets} from '../../js/config/product-spec-settings.js';
if(process.env.AIONE_ENV!=='controlled-ci'||!process.env.DATABASE_URL)throw new Error('Requires disposable controlled-ci database');
async function run(){
 let state=await readSharedParameters();const activate=parameters=>activateSharedParameters({expectedVersion:state.version,parameters,updatedBy:'ci-specs',changeReason:'spec catalog acceptance'});
 // Create a legacy product before installation; no special settings IDs are required.
 const input={localCode:'spc901',nameZh:'规格目录验收',specs:[{name:'颜色',values:['黑色','白色']}]};
 let legacy=await saveManualProduct(input,{personId:'ci'},{createOnly:true});
 const config=structuredClone(state.parameters);config.customSettings=addSpecCatalogPresets(config);state=await activate(config);
 let usage=await readSettingsReferenceUsage();const count=usage.spec_colors.r_0;assert.ok(count>=1);const dimCount=usage.spec_dimensions.r_0;
 const before=legacy.skus.map(s=>({id:s.id,code:s.skuCode})).sort((a,b)=>a.id.localeCompare(b.id));
 const next=structuredClone(state.parameters);next.customSettings.categories.find(c=>c.id==='spec_colors').rows[0].name='黑色新显示名';next.customSettings.categories.find(c=>c.id==='spec_colors').rows[0].values.name_ja='ブラック';state=await activate(next);
 legacy=await saveManualProduct({...legacy.product,remarks:'设置改名后保存'},{personId:'ci'},{updateOnly:true,expectedVersion:legacy.product.version});
 assert.deepEqual(legacy.skus.map(s=>({id:s.id,code:s.skuCode})).sort((a,b)=>a.id.localeCompare(b.id)),before);
 usage=await readSettingsReferenceUsage();assert.equal(usage.spec_colors.r_0,count);assert.equal(usage.spec_dimensions.r_0,dimCount);
 assert.deepEqual((await getManualProduct('spc901')).product.specs,input.specs);
 const remove=structuredClone(state.parameters);remove.customSettings.categories.find(c=>c.id==='spec_colors').rows.shift();await assert.rejects(activate(remove),e=>e.code==='settings_item_in_use');
 const retire=structuredClone(state.parameters);retire.customSettings.categories.find(c=>c.id==='spec_colors').rows[0].enabled=false;state=await activate(retire);
 await assert.rejects(saveManualProduct({...input,localCode:'spc902'},{personId:'ci'},{createOnly:true}),e=>e.code==='inactive_product_spec_setting');
 legacy=await saveManualProduct({...legacy.product,remarks:'停用颜色仍保留旧SKU'},{personId:'ci'},{updateOnly:true,expectedVersion:legacy.product.version});assert.deepEqual(legacy.skus.map(s=>s.id).sort(),before.map(s=>s.id).sort());
 // Japanese legacy dimension/value names count against the same immutable references.
 await pool.query("UPDATE public.products SET metadata=jsonb_set(metadata,'{manualEntry,specs}',$1::jsonb) WHERE id=$2",[JSON.stringify([{name:'カラー',values:['ブラック','ホワイト']}]),legacy.product.id]);
 usage=await readSettingsReferenceUsage();assert.equal(usage.spec_colors.r_0,count);assert.equal(usage.spec_dimensions.r_0,dimCount);
 const raceSettings=structuredClone(state.parameters);raceSettings.customSettings.categories.find(c=>c.id==='spec_colors').rows.push({id:'r_race',name:'CI新颜色',businessValue:'CI新颜色',values:{name_ja:'CIカラー'},enabled:true,isDefault:false,sortOrder:10});state=await activate(raceSettings);
 const deleting=structuredClone(state.parameters);deleting.customSettings.categories.find(c=>c.id==='spec_colors').rows=deleting.customSettings.categories.find(c=>c.id==='spec_colors').rows.filter(r=>r.id!=='r_race');
 const races=await Promise.allSettled([saveManualProduct({localCode:'spc903',nameZh:'并发规格引用',specs:[{name:'颜色',values:['CI新颜色']}]},{personId:'ci'},{createOnly:true}),activate(deleting)]);
 assert.equal(races.filter(r=>r.status==='fulfilled').length,1);assert.ok(['settings_item_in_use','inactive_product_spec_setting'].includes(races.find(r=>r.status==='rejected').reason.code));
 console.log('PASS Postgres spec catalogs: legacy + Japanese references, exact usage, repeat-save invariance, persistent SKU IDs/codes, protected deletion, retired choices and concurrent save/delete');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>pool.end());
