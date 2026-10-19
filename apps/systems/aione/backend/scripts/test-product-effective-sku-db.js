import assert from 'node:assert/strict';
import pool from '../db.js';
import {saveManualProduct,getManualProduct,listManualSkus} from '../src/services/product-manual-entry-service.js';
import {buildSkuEntries} from '../src/services/product-entry-contract.js';
async function run(){
 const draft={localCode:'zjl951',nameZh:'CI有效SKU成本验收',purchaseUnitCostCny:10,weightG:60,setQuantity:3,salePriceJpy:980,specs:[{name:'颜色',values:['黑色','白色']}],extraAttributes:{independentSkuPricing:'true'},skuOverrides:[{index:2,identity:'颜色=白色',purchaseCostCny:20,purchaseCostBasis:'set',setQuantity:5,actualShipmentWeightG:380,domesticFreightCny:0,priceJpy:1580}]};
 const saved=await saveManualProduct(draft,{personId:'ci'});
 const first=await getManualProduct(saved.product.id);
 assert.equal(buildSkuEntries(first.product)[1].priceJpy,1580);
 assert.equal(buildSkuEntries(first.product)[1].actualShipmentWeightG,380);
 const skus=await listManualSkus({query:'zjl951'});
 assert.equal(skus.items.length,2);assert.equal(skus.items.find(x=>x.label==='白色').cost,20);assert.equal(skus.items.find(x=>x.label==='白色').price,1580);
 const updated=await saveManualProduct({...first.product,purchaseUnitCostCny:12,extraAttributes:{...first.product.extraAttributes,independentSkuCosts:'false',independentSkuPricing:'false'}},{personId:'ci'},{updateOnly:true,productId:first.product.id,expectedVersion:first.product.version});
 const second=await getManualProduct(updated.product.id);
 assert.equal(buildSkuEntries(second.product)[1].purchaseCostCny,12);assert.equal(buildSkuEntries(second.product)[1].priceJpy,980);
 assert.equal(second.product.skuOverrides[0].priceJpy,1580,'disabled override persists in database');
 assert.deepEqual(second.skus.map(x=>x.id).sort(),first.skus.map(x=>x.id).sort(),'mode toggles do not rebuild persistent SKU identity');
 console.log('PASS database: effective SKU save/read, index, mode toggle, retained overrides and persistent SKU IDs');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>pool.end());
