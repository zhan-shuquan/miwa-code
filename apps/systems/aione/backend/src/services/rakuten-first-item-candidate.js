import {buildSkuEntries} from "./product-entry-contract.js";

// The candidate is evidence-oriented, not an automatic publication approval.
// It deliberately refuses invented shipping IDs, image paths, or genre values.
const txt=x=>String(x??"").trim();
export function buildRakutenFirstItemCandidate({product,skus=[],mappedImages=[],genre=null,shipping=null}={}){
 const blocking=[];
 const fail=code=>{if(!blocking.includes(code))blocking.push(code)};
 const manageNumber=txt(product?.localCode);
 const shopRef=txt(product?.targetShopRef);
 if(!product?.id||!manageNumber)fail("product_identity_missing");
 if(shopRef!=="永井GD")fail("rakuten_pilot_shop_mismatch");
 if(!txt(product?.rakutenTitle))fail("rakuten_title_missing");
 if(!/^\d{6}$/.test(txt(product?.rakutenGenreId)))fail("rakuten_six_digit_genre_required");
 if(genre?.lowest!==true || txt(genre?.genreId)!==txt(product?.rakutenGenreId))fail("rakuten_leaf_genre_not_verified");
 if(!Number.isInteger(Number(product?.salePriceJpy))||Number(product.salePriceJpy)<=0)fail("tax_included_price_missing");
 const assignments=buildSkuEntries(product||{});
 if(skus.length!==2||assignments.length!==2)fail("pilot_two_skus_required");
 const selector=product?.specs?.[0];
 if(product?.specs?.length!==1||!txt(selector?.name)||selector?.values?.length!==2)fail("pilot_selector_contract_unverified");
 const skusByCode=new Map(skus.map(s=>[txt(s.sku_code),s]));
 const images=mappedImages.filter(x=>x.mapping_status==="active" && x.external_asset_id);
 if(images.length!==12 || new Set(images.map(x=>x.asset_id)).size!==12)fail("rakuten_12_cabinet_images_not_verified");
 const main=images.find(x=>x.asset_role==="source_main_image");
 if(!main)fail("rakuten_main_image_missing");
 if(images.filter(x=>x.asset_role==="source_sku_image").length!==2)fail("rakuten_two_sku_images_missing");
 const missingUrl=images.filter(x=>!/^\/?cabinet\//.test(txt(x.location)) && !/^https:\/\/image\.rakuten\.co\.jp\//.test(txt(x.location)));
 if(missingUrl.length)fail("rakuten_image_location_unverified");
 const options=shipping?.deliverySets||[];
 const selected=options.filter(x=>x.id===shipping?.deliverySetId);
 if(selected.length!==1)fail("rakuten_shipping_method_group_unverified");
 const dates=shipping?.deliveryDates||[];
 if(dates.filter(x=>x.id===shipping?.normalDeliveryDateId).length!==1)fail("rakuten_normal_delivery_date_unverified");
 const mandatory=Array.isArray(genre?.attributes)?genre.attributes.filter(a=>a.properties?.rmsMandatoryFlg):null;
 if(!mandatory)fail("rakuten_mandatory_genre_definitions_missing");
 const genreValues=product?.extraAttributes||{};
 for(const attr of mandatory||[]){
  const raw=txt(genreValues[attr.nameJa]??genreValues[String(attr.id)]);
  if(!raw)fail("mandatory_attribute_missing:"+attr.id);
 }
 const variantIds=assignments.map((a,i)=>manageNumber+"-c"+String(i+1).padStart(2,"0"));
 for(let i=0;i<assignments.length;i++){
  const persisted=skusByCode.get(variantIds[i]);
  if(!persisted)fail("persisted_sku_identity_mismatch:"+variantIds[i]);
  if(!images.some(x=>x.asset_role==="source_sku_image"&&x.sku_id===persisted?.id))fail("sku_image_mapping_missing:"+variantIds[i]);
 }
 // ItemAPI expects explicit articleNumber information for each variant.
 // Do not borrow the historical exemption 5 without verifying its applicability.
 if(!shipping?.catalogExemptionVerified && !txt(product?.barcode))fail("sku_catalog_id_or_verified_exemption_required");
 if(!shipping?.itemapiContractVerified)fail("itemapi_payload_final_contract_not_verified");
 return {contract:"AIONE-Rakuten-ItemAPI2-first-item-candidate",manageNumber,shopRef,
  productId:product?.id||null,
  itemType:"NORMAL",taxRate:"0.1",taxIncluded:true,postageIncluded:true,
  imageCount:images.length,skuCount:skus.length,variantIds,
  genreId:txt(product?.rakutenGenreId),
  deliverySetId:selected[0]?.id??null,normalDeliveryDateId:shipping?.normalDeliveryDateId??null,
  title:txt(product?.rakutenTitle),priceJpy:Number(product?.salePriceJpy)||null,
  candidateReady:blocking.length===0,blocking,
  // No live write here. Delivery and attributes remain evidence-gated.
  notice:"Candidate projection; requires a separate reviewed live JSON payload and explicit customer-facing publication confirmation."};
}
