// One source of truth for AIONE -> Rakuten first-item publication checks.
// This is a validation projection, NOT an ItemAPI payload or publish permission.
import {mapRakutenGenreAttributes} from "./rakuten-attribute-mapper.js";
const txt=v=>String(v??"").trim();
export function rakutenFirstItemPreflight({product,skus,assets,shopConfigured=false,genreAttributesVerified=false,shippingConfigured=false,taxConfigured=false,remoteExistenceChecked=false,genreDefinitions=null,genreValues={}}={}){
 const blocking=[];
 const requireField=(condition,code)=>{if(!condition)blocking.push(code)};
 requireField(Boolean(product?.id&&product?.localCode),"product_identity_missing");
 requireField(txt(product?.targetShopRef)==="永井GD"||txt(product?.targetShopRef)==="幸せ屋"||txt(product?.targetShopRef)==="PrimeLife","shop_not_selected");
 requireField(shopConfigured,"rakuten_shop_credentials_unverified");
 requireField(Boolean(txt(product?.rakutenGenreId)),"rakuten_genre_id_missing");
 const mappedAttributes=Array.isArray(genreDefinitions)?mapRakutenGenreAttributes(genreDefinitions,genreValues):null;
 requireField(genreAttributesVerified&&Boolean(mappedAttributes?.ready),"rakuten_genre_mandatory_attributes_unverified");
 requireField(Boolean(txt(product?.rakutenTitle)),"rakuten_item_name_missing");
 requireField(Boolean(txt(product?.rakutenCatchCopy)),"rakuten_copy_missing");
 // Empty optional PC/mobile/sales descriptions do not block first-item publishing.
 requireField(shippingConfigured,"rakuten_shipping_leadtime_unverified");
 requireField(taxConfigured,"rakuten_tax_payment_unverified");
 requireField(remoteExistenceChecked,"rakuten_remote_duplicate_check_required");
 const rows=Array.isArray(skus)?skus:[];
 requireField(rows.length>0&&rows.length<=12,"sku_count_invalid");
 if(rows.length){
  requireField(rows.every(s=>s.id&&s.sku_code),"sku_canonical_identity_missing");
  requireField(rows.every(s=>s.priceJpy!==null&&s.priceJpy!==undefined&&s.priceJpy!==""&&Number.isInteger(Number(s.priceJpy))&&Number(s.priceJpy)>0),"sku_price_not_verified");
  requireField(rows.every(s=>s.stock!==null&&s.stock!==undefined&&s.stock!==""&&Number.isSafeInteger(Number(s.stock))&&Number(s.stock)>=0),"sku_inventory_not_verified");
 }
 const images=Array.isArray(assets)?assets:[];
 requireField(images.some(a=>a.asset_role==="source_main_image"&&a.metadata?.gcsBucket&&a.metadata?.gcsObject),"rakuten_main_image_missing");
 requireField(rows.length>0&&rows.every(s=>images.some(a=>a.asset_role==="source_sku_image"&&a.sku_id&&String(a.sku_id)===String(s.id)&&a.metadata?.gcsObject)),"sku_image_binding_incomplete");
 requireField(images.some(a=>a.asset_role==="source_detail_image"&&a.metadata?.gcsObject),"rakuten_detail_images_missing");
 requireField(false,"rakuten_cabinet_mapping_not_verified");
 return {canPublish:false,phase:"preflight_only",blocking:[...new Set(blocking)],skuCount:rows.length,imageCount:images.length,attributes:mappedAttributes||{ready:false,blocking:["genre_definition_not_loaded"],autoFilled:[]},notice:"No RMS ItemAPI / InventoryAPI calls or publication performed."};
}
