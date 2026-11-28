import assert from 'node:assert/strict';
import {INITIAL_PARAMETERS} from '../../js/config/shared-parameter-defaults.js';
import {addStoreCatalogPreset,applyStoreDefaults,storePlatformRate} from '../../js/config/product-store-settings.js';
import {validateSharedParameters} from '../src/services/shared-parameters-service.js';
import {applyProductCatalogSelections} from '../src/services/product-catalog-selection.js';
import {normalizeProductEntry} from '../src/services/product-entry-contract.js';
import {assertStoreProfileReferences,assertProductStoreReference,readSettingsStoreState} from '../src/services/settings-stores.js';
import {setCatalogRow,catalogRows,deliveryOptions,deliveryDefault} from '../../js/config/settings-catalog.js';
import {calculateProductCosts} from '../../js/config/product-shared-cost-engine.js';
import {customSettingsWorkbook,parseCustomSettingsWorkbook} from '../src/services/custom-settings-workbook.js';
import {exportCatalogWorkbook,parseCatalogWorkbook} from '../src/services/settings-catalog-workbook.js';
import {previewRakutenItemV2} from '../src/services/rakuten-itemapi2-payload-preview.js';
import pool from '../db.js';
const p=structuredClone(INITIAL_PARAMETERS);
const store={id:'12345678-1234-1234-1234-123456789abc',name:'永井GD',code:'NAGAI',status:'active',platform_status:'active'};
p.customSettings=addStoreCatalogPreset(p,[store]);
assert.equal(addStoreCatalogPreset(p,[store]).categories[0].rows.length,1);
assert.throws(()=>addStoreCatalogPreset({},[]),/正式店铺/);
const c=p.customSettings.categories[0],r=c.rows[0];r.isDefault=true;
Object.assign(r.values,{platform_fee_rate:12,coupon_rate:3,point_rate:1,advertising_rate:2,pc_description:'<p>店铺说明</p>\n'.repeat(100),sp_description:'手机模板',delivery_set_id:'999',normal_delivery_date_id:'888'});
validateSharedParameters(p);
const source={localCode:'store001',nameZh:'店铺引用',weightG:100,purchaseUnitCostCny:10};
const product=applyProductCatalogSelections(normalizeProductEntry(source),source,null,p);
assert.equal(product.targetShopRef,store.name);assert.equal(product.customSettings[c.id],r.id);
assert.equal(product.rates.coupon,3);assert.equal(product.pcDescription,r.values.pc_description);
assert.equal(product.extraAttributes.rakutenDeliverySetId,'999');assert.equal(storePlatformRate(p,store.name),12);
assert.equal(calculateProductCosts({...product,salePriceJpy:1000},null,p).platform,120);
const explicit={...source,targetShopRef:store.name,pcDescription:'商品自己的说明',rates:{coupon:0},extraAttributes:{rakutenDeliverySetId:'42'}};
const kept=applyProductCatalogSelections(normalizeProductEntry(explicit),explicit,null,p);
assert.equal(kept.pcDescription,'商品自己的说明');assert.equal(kept.rates.coupon,0);assert.equal(kept.extraAttributes.rakutenDeliverySetId,'42');
applyStoreDefaults(kept,{...kept,pcDescription:''},kept,p);assert.equal(kept.pcDescription,'商品自己的说明');
const legacy={...source,targetShopRef:'历史店铺',sizeClass:'60cm',rates:{coupon:0}};
assert.equal(applyProductCatalogSelections(normalizeProductEntry(legacy),legacy,legacy,p).targetShopRef,'历史店铺');
assert.throws(()=>applyProductCatalogSelections(normalizeProductEntry(legacy),legacy,null,p),/启用/);
const db={query:async sql=>({rows:sql.includes('information_schema.columns')?[{columns_count:9}]:[store]})};await assertStoreProfileReferences(db,p,{});await assertProductStoreReference(db,product,null,p);
await assert.rejects(assertStoreProfileReferences({query:async sql=>({rows:sql.includes('information_schema.columns')?[{columns_count:9}]:[]})},p,{}),/不存在/);
await assert.rejects(assertProductStoreReference({query:async sql=>({rows:sql.includes('information_schema.columns')?[{columns_count:9}]:[]})},product,null,p),/正式店铺/);
const unavailable=await readSettingsStoreState({query:async()=>({rows:[{columns_count:0}]})});assert.equal(unavailable.ready,false);assert.deepEqual(unavailable.stores,[]);
await assert.rejects(assertStoreProfileReferences({query:async()=>({rows:[{columns_count:0}]})},p,{}),/尚未就绪/);
const changed=structuredClone(p);changed.customSettings.categories[0].rows[0].values.store_id='aaaaaaaa-1234-1234-1234-123456789abc';
await assert.rejects(assertStoreProfileReferences({query:async sql=>({rows:sql.includes('information_schema.columns')?[{columns_count:9}]:[{...store,id:'aaaaaaaa-1234-1234-1234-123456789abc'}]})},changed,p),/不能更换/);
for(const values of [{platform_fee_rate:-1},{coupon_rate:100},{store_id:'made-up'},{delivery_set_id:'bad'}]){const bad=structuredClone(p);Object.assign(bad.customSettings.categories[0].rows[0].values,values);assert.throws(()=>validateSharedParameters(bad));}
const longRoundtrip=await parseCustomSettingsWorkbook(c,await customSettingsWorkbook(c));assert.deepEqual(longRoundtrip.errors,[]);assert.equal(longRoundtrip.rows[0].values.pc_description,r.values.pc_description);
// Platform IDs in defaults do not bypass the existing candidate verification.
const preview=previewRakutenItemV2({product:{...product,localCode:'zjl238',rakutenTitle:'test',rakutenGenreId:'123456'},shipping:{deliverySets:[{id:1}],deliveryDates:[{id:2}]}});
assert.ok(preview.blocking.includes('shop_delivery_set_unverified'));assert.ok(preview.blocking.includes('normal_delivery_date_unverified'));
setCatalogRow(p,'delivery',{key:'SIZE_140',value:{name:'140サイズ',fee:1100},enabled:true,isDefault:true,sortOrder:0});
assert.equal(deliveryDefault(p),'SIZE_140');assert.ok(deliveryOptions(p).some(r=>r.value==='SIZE_140'));
const shippingProduct={...product,sizeClass:'SIZE_140',salePriceJpy:3000};assert.equal(calculateProductCosts(shippingProduct,null,p).deliveryQuote.amountJpy,1100);
assert.equal(calculateProductCosts(shippingProduct,{sizeClass:'60cm'},p).deliveryQuote.amountJpy,500);
const wb=await parseCatalogWorkbook('delivery',await exportCatalogWorkbook('delivery',catalogRows(p,'delivery')));assert.deepEqual(wb.errors,[]);assert.equal(wb.rows.find(r=>r.key==='SIZE_140').value.fee,1100);
setCatalogRow(p,'delivery',{key:'SIZE_140',value:{name:'改名后的140',fee:1200},enabled:false,sortOrder:0});
assert.ok(!deliveryOptions(p).some(r=>r.value==='SIZE_140'));assert.ok(deliveryOptions(p,'SIZE_140').some(r=>r.value==='SIZE_140'));
assert.equal(calculateProductCosts(shippingProduct,null,p).deliveryQuote.amountJpy,1200);
assert.throws(()=>applyProductCatalogSelections({...shippingProduct},shippingProduct,null,p),/配送尺寸/);
assert.equal(applyProductCatalogSelections({...shippingProduct},shippingProduct,shippingProduct,p).sizeClass,'SIZE_140');
const collision=structuredClone(p);collision.delivery['60cm']={name:'重叠',fee:1};assert.throws(()=>validateSharedParameters(collision),/引用值重复/);

/* PR #206: three provisional CURRENT store records are readable but NEVER selectable. */
const provisional=[
 {id:'213fcda7-5a18-4cec-b7af-226f0c57b826',code:'NAGAI_GD',name:'永井GD',status:'inactive',platform_status:'inactive',platform_code:'RAKUTEN',platform_name:'楽天市場'},
 {id:'66946b22-7cc0-4a95-92a4-66da000dbae8',code:'SHIAWASEYA',name:'幸せ屋',status:'inactive',platform_status:'inactive',platform_code:'RAKUTEN',platform_name:'楽天市場'},
 {id:'401ae081-6d0c-4a01-ab4f-7db950e08c24',code:'PRIMELIFE',name:'PrimeLife',status:'inactive',platform_status:'inactive',platform_code:'RAKUTEN',platform_name:'楽天市場'}
];
const readOnlyDb={query:async sql=>{
 if(sql.includes('information_schema.columns'))return {rows:[{columns_count:9}]};
 if(sql.includes('SELECT s.id,s.code,s.name,s.status'))return {rows:provisional};
 if(sql.includes('FOR SHARE'))return {rows:[]};
 throw new Error('unexpected query in read-only store contract test');
}};
const registry=await readSettingsStoreState(readOnlyDb);
assert.equal(registry.ready,true);
assert.deepEqual(registry.stores.map(s=>s.name).sort(),['PrimeLife','幸せ屋','永井GD'].sort());
assert.ok(registry.stores.every(s=>s.status==='inactive'&&s.platform_status==='inactive'));
const seededParams=structuredClone(INITIAL_PARAMETERS);
seededParams.customSettings=addStoreCatalogPreset(seededParams,registry.stores);
const seededRows=seededParams.customSettings.categories.find(c=>c.productField==='targetShopRef').rows;
assert.equal(seededRows.length,3);
assert.ok(seededRows.every(row=>row.enabled===false),'provisional stores must not become editable product choices');
const disabledRow=seededRows.find(row=>row.businessValue==='永井GD');
disabledRow.enabled=true;
await assert.rejects(assertStoreProfileReferences({
 query:async sql=>sql.includes('information_schema.columns')?{rows:[{columns_count:9}]}:{rows:[provisional[0]]}
},seededParams,{}),/已停用/);
const dormantParams=structuredClone(INITIAL_PARAMETERS);
dormantParams.customSettings=addStoreCatalogPreset(dormantParams,registry.stores);
await assert.rejects(assertProductStoreReference(readOnlyDb,{targetShopRef:'永井GD'},null,dormantParams),/请选择有效的正式店铺/);

await pool.end();console.log('PASS canonical store identity, blank-only defaults, rates, multiline XLSX, platform ID blockers, configurable delivery and historic preservation');
