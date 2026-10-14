import {buildSkuEntries} from "./product-entry-contract.js";
import {matchPersistedSkuByAttributes} from "../../../js/services/product-sku-image-identity.js";

// Read-only, fail-closed ItemAPI 2.0 preview. Never send this object without
// explicit final verification and a separate, confirmed write flow.
const str=x=>String(x??"").trim();
const fail=(list,code)=>{if(!list.includes(code))list.push(code)};
const safeOption=(values,value)=>Array.isArray(values)?values.find(x=>String(x?.id)===String(value)):undefined;
const shippingChoices=(product,shipping)=>{
 const extras=product?.extraAttributes||{};
 const deliverySets=Array.isArray(shipping?.deliverySets)?shipping.deliverySets:[];
 const deliveryDates=Array.isArray(shipping?.deliveryDates)?shipping.deliveryDates:[];
 const explicitSet=str(extras.rakutenDeliverySetId);
 const explicitDate=str(extras.rakutenNormalDeliveryDateId);
 const automaticSet=shipping?.defaultDeliverySetId||(deliverySets.length===1?deliverySets[0].id:null);
 const setId=explicitSet||automaticSet||null;
 const dateId=explicitDate||(deliveryDates.length===1?deliveryDates[0].id:null);
 return {deliverySets,deliveryDates,setId,dateId,
  matchedSet:safeOption(deliverySets,setId),matchedDate:safeOption(deliveryDates,dateId),
  requiresSetSelection:!setId&&deliverySets.length>1,requiresDateSelection:!dateId&&deliveryDates.length>1};
};
const isSupportedTextMissingValue=(a)=>{
 // Only a confirmed plain-text attribute is eligible for the agreed "-" fallback.
 const type=str(a?.dataType).toUpperCase();
 const method=str(a?.properties?.rmsInputMethod).toUpperCase();
 return ["STRING","TEXT"].includes(type)&&["FREE_TEXT","TEXT","FREE"].includes(method);
};

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
 const general=[...main,...published.filter(x=>x.asset_role!=="source_sku_image"&&x.asset_role!=="source_main_image")];
 const images=general.map(normalizeLocation).filter(Boolean);
 if(images.length>20)fail(blocking,"rakuten_item_images_over_limit");
 const price=Number(product?.salePriceJpy);
 if(!Number.isSafeInteger(price)||price<=0)fail(blocking,"tax_included_price_invalid");
 const ship=shippingChoices(product,shipping);
 const deliverySetId=ship.setId;
 if(!ship.matchedSet)fail(blocking,ship.requiresSetSelection?"shop_delivery_set_selection_required":"shop_delivery_set_unverified");
 const dateId=ship.dateId;
 if(!ship.matchedDate)fail(blocking,ship.requiresDateSelection?"delivery_date_selection_required":"delivery_date_unverified");
 const explicitExemption=str(product?.extraAttributes?.rakutenCatalogExemptionReason);
 const catalog=str(product?.barcode);
 if(explicitExemption&&!/^[1-9][0-9]?$/.test(explicitExemption))fail(blocking,"catalog_exemption_reason_invalid");
 if(!catalog&&!explicitExemption)fail(blocking,"sku_catalog_id_or_exemption_unverified");
 const articleNumber=catalog?{value:catalog}:(explicitExemption?{exemptionReason:Number(explicitExemption)}:null);
 const required=Array.isArray(genre?.attributes)?genre.attributes.filter(a=>a?.properties?.rmsMandatoryFlg===true):[];
 const suppliedAttributes=product?.extraAttributes||{};
 const attributesForSku=(sku)=>{
  const rows=[];
  for(const attribute of required){
   const title=str(attribute?.nameJa);
   if(!title){fail(blocking,"mandatory_attribute_name_missing:"+String(attribute?.id||"unknown"));continue}
   const raw=sku?.attributes?.[title]??sku?.attributes?.[String(attribute?.id)]??suppliedAttributes[String(attribute?.id)]??suppliedAttributes[title];
   let value=str(raw);
   if(!value&&isSupportedTextMissingValue(attribute))value="-";
   if(!value){fail(blocking,"mandatory_attribute_value_missing:"+String(attribute.id));continue}
   const max=Number(attribute?.maxLength);
   if(Number.isSafeInteger(max)&&max>0&&value.length>max){fail(blocking,"mandatory_attribute_too_long:"+String(attribute.id));continue}
   rows.push({name:title,values:[value],...(str(attribute.unit)?{unit:str(attribute.unit)}:{})});
  }
  return rows;
 };
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
     ...(ship.matchedDate?{normalDeliveryDateId:Number(dateId)}:{}),
     ...(articleNumber?{articleNumber}:{}),
     ...(required.length?{attributes:attributesForSku(sku)}:{}),
     shipping:{postageIncluded:true,...(ship.matchedSet?{shippingMethodGroup:String(deliverySetId)}:{})}
   };
 }
 // Actual business fields are validated above. Execution authorization is a
 // separate human-confirmed server action, never a fabricated shop data flag.
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
  shippingOptions:{deliverySets:ship.deliverySets,deliveryDates:ship.deliveryDates,deliverySetId:ship.matchedSet?.id??null,normalDeliveryDateId:ship.matchedDate?.id??null},
  missingGenreAttributes:blocking.filter(x=>x.startsWith("mandatory_attribute_")),
  humanApprovalRequired:true,
  notice:"No ItemAPI or InventoryAPI write is performed. A separate confirmed write flow and RMS GET verification are mandatory."};
}
