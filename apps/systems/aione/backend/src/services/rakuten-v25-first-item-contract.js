import {findSkuOverride,resolveEffectiveSku} from "../../../js/config/product-effective-sku.js";
// Phase 1 deterministic policy: from canonical AIONE entry to Rakuten V2.5 draft.
// This deliberately does not guess the complete live ItemAPI JSON schema.
export function firstItemV25Policy(product,skuRows=[]){
 const effectivePrices=(Array.isArray(skuRows)?skuRows:[]).map((sku,index)=>{
  const identity=Object.entries(sku.attributes||{}).filter(([key])=>!key.startsWith("__aione")).map(([key,value])=>key+"="+value).join("|")||"default";
  return resolveEffectiveSku(product||{},findSkuOverride(product||{},identity,index+1)).priceJpy;
 });
 const price=product?.extraAttributes?.independentSkuPricing==="true"?null:product?.salePriceJpy;
 const errors=[];
 if((!effectivePrices.length&&(!Number.isSafeInteger(price)||price<=0))||effectivePrices.some(value=>!Number.isSafeInteger(value)||value<=0))errors.push("default_inclusive_price_missing");
 const code=String(product?.localCode||"").trim();
 if(!/^[a-z]{2,8}[0-9]{2,6}$/.test(code))errors.push("local_code_invalid");
 if(!["永井GD","幸せ屋","PrimeLife"].includes(String(product?.targetShopRef||"")))errors.push("target_shop_unverified");
 if(!Array.isArray(skuRows)||skuRows.length<1||skuRows.length>12)errors.push("sku_count_invalid");
 const skus=(Array.isArray(skuRows)?skuRows:[]).map((sku,index)=>({
  aioneSkuId:sku.id||null,
  persistedSkuCode:sku.sku_code||null,
  variantLabel:Object.entries(sku.attributes||{}).filter(([key])=>!key.startsWith("__aione")).map(([k,v])=>k+"="+v).join("|"),
  intendedSkuNumber:code+"-c"+String(index+1).padStart(2,"0"),
  taxIncludedPriceJpy:Number.isSafeInteger(effectivePrices[index])&&effectivePrices[index]>0?effectivePrices[index]:null,
  inventoryQuantity:null // Inventory API value MUST be independently confirmed.
 }));
 if(skus.some(s=>!s.aioneSkuId||!s.persistedSkuCode))errors.push("canonical_sku_identity_missing");
 return {
  contract:"AIONE-Rakuten-V25-Phase1",
  itemManageNumber:code,
  shopRef:String(product?.targetShopRef||""),
  itemType:"NORMAL",
  taxRate:"0.1",
  taxIncluded:true,
  freeShipping:true,
  commonPriceJpy:Number.isSafeInteger(price)&&price>0?price:null,
  optionalDescriptions:{
   pcDescription:product?.pcDescription||null,
   spDescription:product?.spDescription||null,
   salesDescription:product?.salesDescription||null
  },
  skus,
  blockers:[...new Set(errors)],
  safeToSubmit:false,
  note:"V2.5 phase-1 business projection. Requires validated ItemAPI payload, images, shipping IDs, genre attributes and remote existence verification before any live write."
 };
}
