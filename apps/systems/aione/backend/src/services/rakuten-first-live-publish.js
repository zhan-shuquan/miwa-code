import {createHash} from "node:crypto";
import {reviewFirstLiveSkuRows} from "./rakuten-first-live-sku-review.js";
import pool,{withTransaction} from "../../db.js";
import {getManualProduct} from "./product-manual-entry-service.js";
import {previewRakutenItemV2} from "./rakuten-itemapi2-payload-preview.js";
import {getGenreAttributesV2,getAttributeDictionaryV2,putItemV2,getInventoryV2,putInventoryV2} from "../integrations/rakuten-commerce-client.js";
import {getRakutenShopPublishingOptions,getItemV2ReadOnly} from "../integrations/rakuten-rms-client.js";

const fail=(code,message,statusCode=409)=>Object.assign(new Error(message),{code,statusCode});
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const PILOT_CODE="zjl238",PILOT_SHOP="永井GD";
const pathFor=remote=>remote?"/rkc001/"+String(remote).split("/").at(-1):null;
export function checkFirstLiveEvidence(plan) {
 const blocks=[...(plan.blocking||[])];
 if(plan.shopRef!==PILOT_SHOP||plan.manageNumber!==PILOT_CODE)blocks.push("pilot_scope_rejected");
 if(plan.skuCount!==2||plan.mappedImageCount!==12)blocks.push("pilot_asset_count_invalid");
 if(!plan.item?.images?.length)blocks.push("main_images_missing");
 return [...new Set(blocks)];
}
export async function buildLivePilotPlan(ref){
 const {product,skus}=await getManualProduct(String(ref));
 if(product.localCode!==PILOT_CODE||product.targetShopRef!==PILOT_SHOP)throw fail("pilot_scope_rejected","Live pilot is restricted to zjl238 / 永井GD.",403);
 if(product.targetShopRef!==String(process.env.AIONE_RAKUTEN_SHOP_REF||"").trim())throw fail("rakuten_shop_binding_mismatch","Store credentials do not match.",403);
 const assetsResult=await pool.query("SELECT pa.id AS asset_id,pa.asset_role,pa.sku_id,cam.external_asset_id,cam.lifecycle_status AS mapping_status,cam.external_path FROM public.product_assets pa LEFT JOIN public.channel_asset_mappings cam ON cam.asset_id=pa.id AND cam.channel='rakuten' AND cam.shop_ref=$2 AND cam.archived_at IS NULL WHERE pa.product_id=$1 AND pa.archived_at IS NULL ORDER BY pa.asset_no",[product.id,PILOT_SHOP]);
 const assets=assetsResult.rows.map(x=>({...x,location:pathFor(x.external_path)}));
 const [g,shipping]=await Promise.all([getGenreAttributesV2({shopRef:PILOT_SHOP,genreId:product.rakutenGenreId}),getRakutenShopPublishingOptions()]);
 const genre={...g.genre,genreId:String(g.genre.genreId)};
 const dictionaries={};
 const selective=genre.attributes.filter(a=>a.properties?.rmsMandatoryFlg===true&&String(a.properties?.rmsInputMethod).toUpperCase()==="SELECTIVE");
 for(const a of selective){dictionaries[String(a.id)]=await getAttributeDictionaryV2({shopRef:PILOT_SHOP,genreId:product.rakutenGenreId,attributeId:a.id});}
 const preview=previewRakutenItemV2({product,skus,assets,genre,shipping,dictionaries});
 const blocking=checkFirstLiveEvidence(preview);
 const skuReview=reviewFirstLiveSkuRows({product,skus,item:preview.item});
 blocking.push(...skuReview.blocking);
 const skuCodes=skuReview.rows.map(x=>x.skuCode);
 const inventory=Object.fromEntries(skuReview.rows.map(x=>[x.skuCode,x.stock]));
 if(Object.values(inventory).some(v=>!Number.isSafeInteger(v)||v<0))blocking.push("inventory_quantities_invalid");
 const plan={shopRef:PILOT_SHOP,manageNumber:PILOT_CODE,productId:product.id,productVersion:product.version,item:preview.item,inventory,skuCodes,skuReview:skuReview.rows};
 return {plan,digest:hash(plan),blocking:[...new Set(blocking)],ready:blocking.length===0,preview,skuReview};
}
async function audit(productId,phase,event,details={}){
 return withTransaction(async db=>{
  const q=await db.query("SELECT metadata FROM public.products WHERE id=$1 FOR UPDATE",[productId]);
  if(!q.rowCount)throw fail("product_not_found","Product has disappeared.",404);
  const meta=q.rows[0].metadata||{};
  const history=Array.isArray(meta.rakutenFirstPublishHistory)?meta.rakutenFirstPublishHistory:[];
  const entry={phase,event,details,at:new Date().toISOString()};
  const next={...meta,rakutenFirstPublishPhase:phase,rakutenFirstPublishHistory:[...history.slice(-49),entry]};
  await db.query("UPDATE public.products SET metadata=$2::jsonb,updated_at=NOW() WHERE id=$1",[productId,JSON.stringify(next)]);
  return entry;
 });
}
export async function prepareFirstLive(ref){
 const prepared=await buildLivePilotPlan(ref);
 const remote=await getItemV2ReadOnly({shopRef:PILOT_SHOP,manageNumber:PILOT_CODE});
 return {ok:true,phase:"review_only",productId:prepared.plan.productId,shopRef:PILOT_SHOP,manageNumber:PILOT_CODE,skuCodes:prepared.plan.skuCodes,skuReview:prepared.skuReview,inventory:prepared.plan.inventory,priceJpy:prepared.plan.item?.variants?.[prepared.plan.skuCodes[0]]?.standardPrice||null,images:prepared.preview.mappedImageCount,genreId:prepared.plan.item?.genreId,title:prepared.plan.item?.title,shipping:prepared.preview.shippingOptions,remoteExists:remote.exists,digest:prepared.digest,ready:prepared.ready&&!remote.exists,blocking:[...prepared.blocking,...(remote.exists?["remote_item_exists"]:[])],notice:"Read-only. Confirming this digest separately will create a sellable RMS item."};
}
export async function publishFirstLive(ref,{digest,confirmation,skuAcknowledgementKey,actor}={}){
 if(!actor?.personId)throw fail("authenticated_actor_required","Live publication requires an authenticated human.",401);
 if(confirmation!=="CREATE zjl238 永井GD")throw fail("publish_confirmation_required","Explicit exact confirmation is required.",400);
 const data=await buildLivePilotPlan(ref);
 if(!data.ready)throw fail("itemapi_payload_not_ready","Current source data is not ready to publish.");
 if(data.skuReview.requiresSkuCodeAcknowledgement&&skuAcknowledgementKey!==data.skuReview.skuAcknowledgementKey)
  throw fail("sku_code_acknowledgement_required","Persisted SKU IDs differ from the earlier approved names. Review actual SKU, image and stock before publication.");
 if(digest!==data.digest)throw fail("publish_plan_changed","ItemAPI payload changed. Review again.");
 const id=data.plan.productId;
 const remote=await getItemV2ReadOnly({shopRef:PILOT_SHOP,manageNumber:PILOT_CODE});
 if(remote.exists)throw fail("remote_item_already_exists","The RMS item already exists. Use reconciliation, not upsert.");
 // Lock the database publication state against concurrent users.
 await withTransaction(async db=>{
  const q=await db.query("SELECT metadata FROM public.products WHERE id=$1 FOR UPDATE",[id]);
  const phase=q.rows[0]?.metadata?.rakutenFirstPublishPhase;
  if(!q.rowCount||["submitted","uncertain","item_verified","inventory_partial","complete"].includes(phase))
   throw fail("publish_requires_reconciliation","A prior publication may exist. Reconcile before retry.");
  const meta=q.rows[0].metadata||{};
  await db.query("UPDATE public.products SET metadata=$2::jsonb WHERE id=$1",[id,JSON.stringify({...meta,rakutenFirstPublishPhase:"submitted",rakutenFirstPublishDigest:data.digest})]);
 });
 try{
  await putItemV2({shopRef:PILOT_SHOP,manageNumber:PILOT_CODE,payload:data.plan.item});
 }catch(error){
  await audit(id,"uncertain","itemapi_submit_unconfirmed",{code:error.code||"unknown",remoteStatus:error.rakutenStatus||null});
  throw fail("itemapi_submission_requires_readback","Write rejected or uncertain; reconcile RMS before any retry.",502);
 }
 const created=await getItemV2ReadOnly({shopRef:PILOT_SHOP,manageNumber:PILOT_CODE});
 if(!created.exists){await audit(id,"uncertain","item_readback_missing");throw fail("itemapi_readback_missing","Created item was not confirmed by GET.",502);}
 const remoteVariants=created.item?.variants||{};
 const actualCodes=new Set(Object.keys(remoteVariants));
 const expectedCodes=new Set(data.plan.skuCodes);
 if(actualCodes.size!==expectedCodes.size || [...expectedCodes].some(code=>!actualCodes.has(code))){
  await audit(id,"uncertain","item_variants_mismatch",{expectedCount:expectedCodes.size,actualCount:actualCodes.size});
  throw fail("item_variants_readback_mismatch","The created RMS item SKU identities did not match. Inventory will not be written.",502);
 }
 const actualImages=created.item?.images||[];
 const expectedImages=data.plan.item.images||[];
 const locations=new Set(actualImages.map(x=>x.location));
 if(actualImages.length!==expectedImages.length||expectedImages.some(x=>!locations.has(x.location))){
  await audit(id,"uncertain","item_image_readback_mismatch",{expectedCount:expectedImages.length,actualCount:actualImages.length});
  throw fail("item_images_readback_mismatch","RMS image readback did not match the approved payload.",502);
 }
 await audit(id,"item_verified","itemapi_created_readback",{manageNumber:PILOT_CODE,skuCodes:data.plan.skuCodes,actor:actor.personId});
 const results=[];
 for(const variantId of data.plan.skuCodes){
  try{
   const quantity=data.plan.inventory[variantId];
   await putInventoryV2({shopRef:PILOT_SHOP,manageNumber:PILOT_CODE,variantId,quantity});
   const actual=await getInventoryV2({shopRef:PILOT_SHOP,manageNumber:PILOT_CODE,variantId});
   if(Number(actual.body?.quantity)!==quantity)throw fail("inventory_readback_mismatch","Inventory quantity did not match.");
   results.push({variantId,quantity,verified:true});
   await audit(id,"inventory_partial","inventory_verified",{variantId,quantity});
  }catch(e){
   await audit(id,"inventory_partial","inventory_unconfirmed",{variantId,code:e.code||"unknown"});
   return {ok:false,phase:"inventory_partial",manageNumber:PILOT_CODE,results,failedVariantId:variantId,notice:"Item created. Do not repeat ItemAPI upsert. Inventory reconciliation required."};
  }
 }
 await audit(id,"complete","first_publish_verified",{actor:actor.personId,skuCodes:data.plan.skuCodes,imageCount:data.preview.mappedImageCount});
 return {ok:true,phase:"complete",manageNumber:PILOT_CODE,results,imageCount:data.preview.mappedImageCount,notice:"Item GET and both inventory GET checks passed."};
}
