import assert from 'node:assert/strict';
import pool from '../db.js';
import {readSharedParameters,activateSharedParameters} from '../src/services/shared-parameters-service.js';
import {readSettingsReferenceUsage} from '../src/services/settings-reference-usage.js';
import {saveManualProduct,getManualProduct,listManualSkus} from '../src/services/product-manual-entry-service.js';
import {setCatalogRow,removeCatalogRow} from '../../js/config/settings-catalog.js';
import {exportProductEntries,parseProductEntryWorkbook} from '../src/services/product-entry-contract.js';
if(process.env.AIONE_ENV!=='controlled-ci'||!process.env.DATABASE_URL)throw new Error('Requires controlled-ci disposable database');
async function run(){
 let state=await readSharedParameters();
 const next=structuredClone(state.parameters);
 setCatalogRow(next,'chinaPackaging',{key:'CI-SKU包装',value:3,enabled:true,isDefault:false,sortOrder:99});
 setCatalogRow(next,'japanPackaging',{key:'CI-SKU纸盒',value:33,enabled:true,isDefault:false,sortOrder:99});
 setCatalogRow(next,'logistics',{key:'CI_SKU_AIR',value:{...Object.values(next.commerce.logistics)[0],name:'CI-SKU物流'},enabled:true,isDefault:false,sortOrder:99});
 next.customSettings??={categories:[]};
 for(const category of next.customSettings.categories.filter(c=>c.specBinding)){
  category.enabled=true;for(const row of category.rows)row.enabled=true;
 }
 next.customSettings.categories.push({id:'ci_sku_binding',name:'CI联合资料',owner:'商品之家',enabled:true,productBinding:true,fields:[{id:'memo',label:'说明',type:'text',required:false}],rows:[{id:'row_test',name:'测试引用',enabled:true,isDefault:false,sortOrder:1,values:{memo:'字段与SKU共同持久化'}}]});
 const activate=parameters=>activateSharedParameters({expectedVersion:state.version,parameters,updatedBy:'ci',changeReason:'Combined SKU/catalog acceptance'});
 state=await activate(next);
 const saved=await saveManualProduct({localCode:'qa20921',nameZh:'CI联合设置SKU持久化',targetShopRef:'',purchaseUnitCostCny:12,weightG:60,setQuantity:3,salePriceJpy:980,
  specs:[{name:'颜色',values:['黑色','白色']}],customSettings:{ci_sku_binding:'row_test'},extraAttributes:{independentSkuPricing:'true',independentSkuCosts:'false'},
  skuOverrides:[1,2].map(index=>({index,identity:'颜色='+(['黑色','白色'][index-1]),packagingMethod:'CI-SKU包装',packagingMaterial:'CI-SKU纸盒',logisticsMethod:'CI-SKU物流',purchaseCostCny:20,priceJpy:index===2?1580:980}))},{personId:'ci'});
 let loaded=await getManualProduct(saved.product.id);
 assert.equal(loaded.product.customSettings.ci_sku_binding,'row_test');
 const usages=await readSettingsReferenceUsage();
 for(const [kind,name] of [['chinaPackaging','CI-SKU包装'],['japanPackaging','CI-SKU纸盒'],['logistics','CI-SKU物流']]){
  assert.equal(usages[kind][name],1,'count products once, including retained disabled-mode overrides');
  const deleted=structuredClone(state.parameters);
  removeCatalogRow(deleted,kind,kind==='logistics'?'CI_SKU_AIR':name);
  await assert.rejects(activate(deleted),e=>e.code==='settings_item_in_use');
  assert.equal((await readSharedParameters()).version,state.version,'rejected deletion does not alter version/history');
 }
 const exported=await exportProductEntries([loaded.product],state.parameters);
 const round=(await parseProductEntryWorkbook(exported,'joint.xlsx')).items[0];
 assert.deepEqual(round.customSettings,loaded.product.customSettings);
 const updated=await saveManualProduct({...round,extraAttributes:{...round.extraAttributes,independentSkuCosts:'true'}},{personId:'ci'},{updateOnly:true,productId:saved.product.id,expectedVersion:loaded.product.version});
 const again=await getManualProduct(updated.product.id);
 assert.deepEqual(again.skus.map(s=>[s.id,s.sku_code]),loaded.skus.map(s=>[s.id,s.sku_code]));
 const index=await listManualSkus({query:'qa20921'});assert.equal(index.items.find(s=>s.label==='白色').price,1580);
 assert.equal(again.product.skuOverrides[0].packagingMaterial,'CI-SKU纸盒');
 console.log('PASS DB joint settings/SKU: persistence, Excel, retained-mode reference counts, deletion rollback, codes and effective prices');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>pool.end());
