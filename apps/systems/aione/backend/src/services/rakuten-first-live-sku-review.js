import {buildSkuEntries} from "./product-entry-contract.js";
import {matchPersistedSkuByAttributes} from "../../../js/services/product-sku-image-identity.js";

// Owner explicitly approved these persistent SKU codes for the first live pilot.
// Never rename or reconstruct SKU identities after product images are bound.
const expectedByQuantity=Object.freeze({"1個":"zjl238-04","2個":"zjl238-05"});
const normalizeQuantity=value=>String(value??"").normalize("NFKC").replace(/[\s\u3000]/g,"").replace(/セット$/,"");
export function reviewFirstLiveSkuRows({product,skus,item}={}){
 const blocking=[],rows=[],seenIds=new Set(),seenQuantities=new Set();
 const variants=item?.variants||{};
 for(const entry of buildSkuEntries(product||{})){
  const sku=matchPersistedSkuByAttributes(skus||[],entry.attributes);
  const quantity=normalizeQuantity(Object.values(entry.attributes)[0]);
  if(!sku){blocking.push("sku_identity_not_uniquely_mapped");continue}
  if(seenIds.has(sku.id)){blocking.push("sku_identity_reused");continue}
  seenIds.add(sku.id);
  if(!expectedByQuantity[quantity]||seenQuantities.has(quantity)){
   blocking.push("sku_quantity_option_unverified");continue;
  }
  seenQuantities.add(quantity);
  const variant=variants[sku.sku_code];
  if(!variant){blocking.push("itemapi_variant_not_mapped");continue}
  const stock=Number(entry.stock);
  const price=Number(variant.standardPrice);
  const location=variant.images?.[0]?.location||null;
  if(!Number.isSafeInteger(stock)||stock<0)blocking.push("sku_stock_invalid");
  if(price!==980)blocking.push("pilot_price_not_980");
  if(!location)blocking.push("sku_image_missing");
  if(String(variant.selectorValues?.selector0||"")!==String(Object.values(entry.attributes)[0]))
   blocking.push("sku_selector_value_mismatch");
  rows.push({
   skuId:sku.id,
   skuCode:sku.sku_code,
   approvedCode:expectedByQuantity[quantity],
   option:quantity+"セット",
   actualOption:String(Object.values(entry.attributes)[0]),
   priceJpy:price,
   stock,
   skuImageLocation:location
  });
 }
 if(rows.length!==2||seenQuantities.size!==2||!seenQuantities.has("1個")||!seenQuantities.has("2個"))
  blocking.push("pilot_sku_option_set_mismatch");
 const ordered=rows.sort((a,b)=>a.option.localeCompare(b.option,"ja"));
 if(ordered.some(x=>x.skuCode!==x.approvedCode))blocking.push("persisted_sku_differs_from_owner_approved_mapping");
 const requiresSkuCodeAcknowledgement=false; // owner has approved precisely -04 / -05; no repeated second approval
 const skuAcknowledgementKey=ordered.map(x=>x.option+"="+x.skuCode).join("|");
 return {rows:ordered,blocking:[...new Set(blocking)],requiresSkuCodeAcknowledgement,skuAcknowledgementKey,ownerApprovedSkuMapping:true};
}
