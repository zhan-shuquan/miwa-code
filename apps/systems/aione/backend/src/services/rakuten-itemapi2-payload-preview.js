import {buildSkuEntries} from "./product-entry-contract.js";
import {matchPersistedSkuByAttributes} from "../../../js/services/product-sku-image-identity.js";

// Read-only, fail-closed ItemAPI 2.0 preview. Never send this object without
// explicit final verification and a separate, confirmed write flow.
const str=x=>String(x??"").trim();
const fail=(list,code)=>{if(!list.includes(code))list.push(code)};
export function previewRakutenItemV2({product,skus=[],assets=[],genre=null,shipping=null}={}){
 const blocking=[];
 const code=str(product?.localCode);
 const title=str(product?.rakutenTitle);
 const genreId=str(product?.rakutenGenreId);
 if(!product?.id||!code)fail(blocking,"product_identity_missing");
 if(product?.targetShopRef!=="永井GD")fail(blocking,"shop_binding_unverified");
 if(!title||title.length>255)fail(blocking,"item_title_required");
 if(!/^\d{6}$/.test(genreId))fail(blocking,"six_digit_genre_required");
 if(!genre||genre.lowest!==true||str(genre.genreId)!==genreId)fail(blocking,"genre_metadata_unverified");
 if(!Array.isArray(genre?.attributes))fail(blocking,"genre_attribute_definitions_unverified");
 const selections=buildSkuEntries(product||{});
 if(selections.length!==2||skus.length!==2||product?.specs?.length!==1)fail(blocking,"two_sku_selector_unverified");
 const spec=product?.specs?.[0];
 if(!str(spec?.name)||spec?.values?.length!==2)fail(blocking,"selector_values_invalid");
 const chosen=selections.map(entry=>matchPersistedSkuByAttributes(skus,entry.attributes));
 if(chosen.some(x=>!x)||new Set(chosen.filter(Boolean).map(x=>x.id)).size!==2)fail(blocking,"canonical_sku_identity_unverified");
 const published=assets.filter(x=>x.mapping_status==="active"&&x.external_asset_id);
 if(published.length!==12||new Set(published.map(x=>x.asset_id)).size!==12)fail(blocking,"twelve_mapped_images_required");
 const normalizeLocation=asset=>{
   // The source path must be an exact persisted R-Cabinet file path.
   const path=str(asset?.location);
   if(!/^\/[a-z0-9_-]+\/[a-z0-9_-]+\.(jpg|jpeg|png|gif)$/i.test(path)){
     fail(blocking,"cabinet_location_unverified");return null;
   }
   return {type:"CABINET",location:path};
 };
 const main=published.filter(x=>x.asset_role==="source_main_image");
 if(main.length!==1)fail(blocking,"main_image_not_unique");
 const general=published.filter(x=>x.asset_role!=="source_sku_image");
 const images=general.map(normalizeLocation).filter(Boolean);
 const price=Number(product?.salePriceJpy);
 if(!Number.isSafeInteger(price)||price<=0)fail(blocking,"tax_included_price_invalid");
 const deliverySetId=shipping?.deliverySetId;
 if(!shipping?.deliverySets?.some(x=>String(x.id)===String(deliverySetId))||!deliverySetId)
   fail(blocking,"shop_delivery_set_unverified");
 const dateId=shipping?.normalDeliveryDateId;
 if(!shipping?.deliveryDates?.some(x=>String(x.id)===String(dateId))||!dateId)
   fail(blocking,"delivery_date_unverified");
 const key="selector0";
 const variants={};
 for(let i=0;i<chosen.length;i++){
   const sku=chosen[i];if(!sku)continue;
   const linked=published.filter(x=>x.asset_role==="source_sku_image"&&String(x.sku_id)===String(sku.id));
   if(linked.length!==1)fail(blocking,"sku_cabinet_image_unverified:"+sku.sku_code);
   const skuImage=linked.length===1?normalizeLocation(linked[0]):null;
   const value=selections[i]&&Object.values(selections[i].attributes)[0];
   if(!str(value))fail(blocking,"sku_selector_value_missing");
   if(!/^[-A-Za-z0-9_]{1,96}$/.test(str(sku.sku_code)))fail(blocking,"sku_code_invalid");
   variants[sku.sku_code]={
     merchantDefinedSkuId:sku.sku_code,
     selectorValues:{[key]:str(value)},
     standardPrice:String(price),
     ...(skuImage?{images:[skuImage]}:{}),
     ...(dateId?{normalDeliveryDateId:Number(dateId)}:{}),
     shipping:{postageIncluded:true,...(deliverySetId?{shippingMethodGroup:String(deliverySetId)}:{})}
   };
 }
 const required=Array.isArray(genre?.attributes)?genre.attributes.filter(a=>a?.properties?.rmsMandatoryFlg):[];
 const existing=product?.extraAttributes||{};
 for(const attr of required){
   const value=str(existing[String(attr.id)]??existing[attr.nameJa]);
   if(!value)fail(blocking,"mandatory_genre_attribute_missing:"+attr.id);
 }
 // Genre attributes and catalog-ID exemptions require a verified renderer,
 // never a guessed '-' or undocumented reason code.
 if(required.length)fail(blocking,"genre_attributes_serialization_unverified");
 if(!shipping?.catalogExemptionVerified&&!str(product?.barcode))fail(blocking,"sku_catalog_id_or_exemption_unverified");
 if(!shipping?.itemapiContractVerified)fail(blocking,"final_itemapi_contract_not_verified");
 const item={
   itemNumber:code,title,itemType:"NORMAL",genreId,
   images,
   payment:{taxIncluded:true,taxRate:"0.1"},
   ...(str(product?.rakutenCatchCopy)?{tagline:str(product.rakutenCatchCopy)}:{}),
   ...(str(product?.pcDescription)||str(product?.spDescription)?{productDescription:{...(str(product.pcDescription)?{pc:str(product.pcDescription)}:{}),...(str(product.spDescription)?{sp:str(product.spDescription)}:{})}}:{}),
   ...(str(product?.salesDescription)?{salesDescription:str(product.salesDescription)}:{}),
   ...(spec?.values?.length===2?{variantSelectors:[{key,displayName:str(spec.name),values:spec.values.map(x=>({displayValue:str(x)}))}]}:{}),
   variants
 };
 return {ok:true,phase:"read_only_itemapi_payload",productId:product?.id,shopRef:product?.targetShopRef,manageNumber:code,
  item,blocking,readyForLiveCreate:blocking.length===0,skuCount:Object.keys(variants).length,mappedImageCount:published.length,
  notice:"No ItemAPI or InventoryAPI write is performed. Requires explicit approval of final product and verified Rakuten fields."};
}
