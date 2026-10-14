import {Router} from "express";
import {requireWriteActor} from "../http/context.js";
import {prepareFirstLive,publishFirstLive} from "../services/rakuten-first-live-publish.js";
import {getItemV2ReadOnly,getRakutenShopPublishingOptions} from "../integrations/rakuten-rms-client.js";
import {getGenreAttributesV2,getAttributeDictionaryV2} from "../integrations/rakuten-commerce-client.js";
import pool from "../../db.js";
import {getManualProduct} from "../services/product-manual-entry-service.js";
import {rakutenFirstItemPreflight} from "../services/rakuten-itemapi-preflight.js";
import {firstItemV25Policy} from "../services/rakuten-v25-first-item-contract.js";
import {buildRakutenFirstItemCandidate} from "../services/rakuten-first-item-candidate.js";
import {previewRakutenItemV2} from "../services/rakuten-itemapi2-payload-preview.js";
import {getRakutenCanonicalPackReadiness} from "../services/rakuten-canonical-publish-service.js";
const router=Router();
router.get("/integrations/rakuten/products/:productRef/live-create-review",async(req,res,next)=>{
 try {res.set("Cache-Control","no-store").json(await prepareFirstLive(req.params.productRef));}catch(e){next(e)}
});
router.post("/integrations/rakuten/products/:productRef/live-create",requireWriteActor,async(req,res,next)=>{
 try {
  const result=await publishFirstLive(req.params.productRef,{digest:req.body?.digest,confirmation:req.body?.confirmation,skuAcknowledgementKey:req.body?.skuAcknowledgementKey,actor:req.aioneContext});
  res.set("Cache-Control","no-store").status(result.ok?200:207).json(result);
 }catch(e){next(e)}
});

router.get("/integrations/rakuten/products/:productRef/shipping-options",async(req,res,next)=>{
 try {
  const {product}=await getManualProduct(String(req.params.productRef||""));
  if(product.targetShopRef!==String(process.env.AIONE_RAKUTEN_SHOP_REF||"").trim())
   return res.status(403).json({error:"rakuten_shop_binding_mismatch"});
  const options=await getRakutenShopPublishingOptions();
  res.set("Cache-Control","no-store").json({ok:true,shopRef:product.targetShopRef,productId:product.id,...options,
   notice:"Read-only RMS shipping IDs; no ItemAPI write. Multiple options require an explicit verified choice."});
 }catch(error){next(error)}
});

router.get("/integrations/rakuten/products/:productRef/genre-attributes",async(req,res,next)=>{
 try{
  const {product}=await getManualProduct(String(req.params.productRef||""));
  const genreId=String(product.rakutenGenreId||"").trim();
  if(!genreId)return res.status(409).json({error:"rakuten_genre_id_missing",message:"Please save a verified leaf genre ID before checking attributes."});
  const result=await getGenreAttributesV2({shopRef:product.targetShopRef,genreId});
  const definitions=result.genre.attributes.map(attr=>({
   id:attr.id,nameJa:attr.nameJa,type:attr.dataType,unit:attr.unit||null,
   mandatory:Boolean(attr.properties?.rmsMandatoryFlg),
   inputMethod:attr.properties?.rmsInputMethod||null,
   skuUnified:Boolean(attr.properties?.rmsSkuUnifyFlg)
  }));
  res.set("Cache-Control","no-store").json({ok:true,productId:product.id,shopRef:product.targetShopRef,
    genreId,genreName:result.genre.nameJa,lowest:true,version:result.version||null,definitions,
    mandatoryCount:definitions.filter(x=>x.mandatory).length,notice:"Read-only genre metadata; attributes and shipping must be validated before ItemAPI writes."});
 }catch(error){next(error)}
});

router.get("/integrations/rakuten/products/:productRef/itemapi-payload-preview",async(req,res,next)=>{
 try{
  const {product,skus}=await getManualProduct(String(req.params.productRef||""));
  if(product.targetShopRef!==String(process.env.AIONE_RAKUTEN_SHOP_REF||"").trim())
    return res.status(403).json({error:"rakuten_shop_binding_mismatch"});
  const q=await pool.query(
   "SELECT pa.id AS asset_id,pa.asset_role,pa.sku_id,cam.external_asset_id,cam.lifecycle_status AS mapping_status,cam.external_path FROM public.product_assets pa LEFT JOIN public.channel_asset_mappings cam ON cam.asset_id=pa.id AND cam.channel='rakuten' AND cam.shop_ref=$2 AND cam.archived_at IS NULL WHERE pa.product_id=$1 AND pa.archived_at IS NULL ORDER BY pa.asset_no",
   [product.id,product.targetShopRef]);
  const assets=q.rows.map(a=>({...a,location:a.external_path?"/rkc001/"+String(a.external_path).split("/").at(-1):null}));
  const [g,sh]=await Promise.allSettled([
    product.rakutenGenreId?getGenreAttributesV2({shopRef:product.targetShopRef,genreId:product.rakutenGenreId}):Promise.resolve(null),
    getRakutenShopPublishingOptions()
  ]);
  const genre=g.status==="fulfilled"&&g.value?{...g.value.genre,genreId:String(g.value.genre.genreId)}:null;
  const shipping=sh.status==="fulfilled"?sh.value:null;
  const selective=(genre?.attributes||[]).filter(a=>a.properties?.rmsMandatoryFlg===true&&String(a.properties?.rmsInputMethod).toUpperCase()==="SELECTIVE");
  const dictionaries={};
  const dictionaryErrors=[];
  for(const attribute of selective){
    try{dictionaries[String(attribute.id)]=await getAttributeDictionaryV2({shopRef:product.targetShopRef,genreId:product.rakutenGenreId,attributeId:attribute.id});}
    catch(error){dictionaryErrors.push("rms_attribute_dictionary_unverified:"+attribute.id+":"+String(error.code||"error"));}
  }
  const result=previewRakutenItemV2({product,skus,assets,genre,shipping,dictionaries});
  const blocking=[...result.blocking,...dictionaryErrors];
  if(g.status==="rejected")blocking.push("genre_api:"+String(g.reason?.code||"unverified"));
  if(sh.status==="rejected")blocking.push("shop_shipping_api:"+String(sh.reason?.code||"unverified"));
  res.set("Cache-Control","no-store").json({...result,blocking:[...new Set(blocking)],readyForLiveCreate:!blocking.length});
 }catch(error){next(error)}
});

router.get("/integrations/rakuten/products/:productRef/itemapi-candidate",async(req,res,next)=>{
 try{
  const {product,skus}=await getManualProduct(String(req.params.productRef||""));
  if(product.targetShopRef!==String(process.env.AIONE_RAKUTEN_SHOP_REF||"").trim())
   return res.status(403).json({error:"rakuten_shop_binding_mismatch"});
  const assets=await pool.query(
   "SELECT pa.id AS asset_id,pa.asset_role,pa.sku_id,cam.external_asset_id,cam.lifecycle_status AS mapping_status,cam.external_path,cam.metadata AS mapping_metadata FROM public.product_assets pa LEFT JOIN public.channel_asset_mappings cam ON cam.asset_id=pa.id AND cam.channel='rakuten' AND cam.shop_ref=$2 AND cam.archived_at IS NULL WHERE pa.product_id=$1 AND pa.archived_at IS NULL ORDER BY pa.asset_no",
   [product.id,product.targetShopRef]);
  const mappedImages=assets.rows.map(x=>{const fileName=String(x.external_path||"").split("/").at(-1);return {...x,location:fileName?"/cabinet/rkc001/"+fileName:null};});
  const [genreResult,shippingResult]=await Promise.allSettled([
   product.rakutenGenreId?getGenreAttributesV2({shopRef:product.targetShopRef,genreId:product.rakutenGenreId}):Promise.resolve(null),
   getRakutenShopPublishingOptions()
  ]);
  const genre=genreResult.status==="fulfilled"&&genreResult.value?{...genreResult.value.genre,genreId:String(genreResult.value.genre.genreId)}:null;
  const shipping=shippingResult.status==="fulfilled"?shippingResult.value:null;
  const candidate=buildRakutenFirstItemCandidate({product,skus,mappedImages,genre,shipping});
  const blockers=[...candidate.blocking];
  if(genreResult.status==="rejected")blockers.push("rakuten_genre_api_read_failed:"+String(genreResult.reason?.code||"unknown"));
  if(shippingResult.status==="rejected")blockers.push("rakuten_shop_shipping_read_failed:"+String(shippingResult.reason?.code||"unknown"));
  res.set("Cache-Control","no-store").json({ok:true,phase:"candidate_read_only",...candidate,
   candidateReady:!blockers.length,blocking:[...new Set(blockers)],
   genreMetadataLoaded:Boolean(genre),shippingMetadataLoaded:Boolean(shipping),
   verifiedShippingOptions:shipping?{deliverySets:shipping.deliverySets,deliveryDates:shipping.deliveryDates,defaultDeliverySetId:shipping.defaultDeliverySetId}:null,
   notice:"This endpoint does not create items or modify inventory."});
 }catch(error){next(error)}
});

router.get("/integrations/rakuten/products/:productRef/itemapi-preflight",async(req,res,next)=>{
 try{
  const {product,skus}=await getManualProduct(String(req.params.productRef||""));
  const assets=await pool.query("SELECT id,sku_id,asset_role,metadata FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL",[product.id]);
  // Stored SKU identity is real; per-SKU inventory and price still require a verified RMS contract.
  const evaluatedSkus=skus.map(s=>({id:s.id,sku_code:s.sku_code,priceJpy:null,stock:null}));
  const credentialShop=String(process.env.AIONE_RAKUTEN_SHOP_REF||"").trim();
  const shopBound=Boolean(credentialShop&&credentialShop===product.targetShopRef);
  const hasSecrets=Boolean(process.env.AIONE_RAKUTEN_SERVICE_SECRET&&process.env.AIONE_RAKUTEN_LICENSE_KEY);
  const result=rakutenFirstItemPreflight({product,skus:evaluatedSkus,assets:assets.rows,shopConfigured:shopBound&&hasSecrets});
  res.set("Cache-Control","no-store").json({ok:true,productId:product.id,localCode:product.localCode,rmsConfiguration:{credentialShopBound:shopBound,credentialsPresent:hasSecrets,readyForRead:shopBound&&hasSecrets},...result});
 }catch(error){next(error)}
});
router.get("/integrations/rakuten/products/:productRef/remote-existence",async(req,res,next)=>{
 try{
  const {product}=await getManualProduct(String(req.params.productRef||""));
  const result=await getItemV2ReadOnly({shopRef:product.targetShopRef,manageNumber:product.localCode});
  // Keep the raw provider item private; an existence check only needs boolean evidence.
  res.set("Cache-Control","no-store").json({ok:true,productId:product.id,shopRef:result.shopRef,manageNumber:result.manageNumber,exists:result.exists,remoteStatus:result.httpStatus});
 }catch(error){next(error)}
});
router.get("/integrations/rakuten/products/:productRef/first-item-dry-run",async(req,res,next)=>{
 try{
  const {product,skus}=await getManualProduct(String(req.params.productRef||""));
  const policy=firstItemV25Policy(product,skus);
  const remote=await getItemV2ReadOnly({shopRef:product.targetShopRef,manageNumber:product.localCode});
  const result=await pool.query("SELECT pa.id,pa.asset_role,pa.sku_id,cam.external_asset_id,cam.lifecycle_status AS mapping_status FROM public.product_assets pa LEFT JOIN public.channel_asset_mappings cam ON cam.asset_id=pa.id AND cam.channel='rakuten' AND cam.shop_ref=$2 AND cam.archived_at IS NULL WHERE pa.product_id=$1 AND pa.archived_at IS NULL",[product.id,product.targetShopRef]);
  const mapped=result.rows.filter(x=>x.mapping_status==="active"&&x.external_asset_id);
  const cabinet=await getRakutenCanonicalPackReadiness({productId:product.id,shopRef:product.targetShopRef});
  const blockers=[...policy.blockers];
  if(remote.exists)blockers.push("remote_item_already_exists");
  if(!cabinet.container)blockers.push("rakuten_cabinet_container_missing");
  else if(!cabinet.container.rakutenFolderId)blockers.push("rakuten_cabinet_folder_not_resolved");
  if(!mapped.some(x=>x.asset_role==="source_main_image"))blockers.push("main_cabinet_image_not_published");
  if(!skus.every(s=>mapped.some(x=>x.asset_role==="source_sku_image"&&x.sku_id===s.id)))blockers.push("sku_cabinet_image_not_published");
  blockers.push("verified_itemapi_payload_and_shipping_attributes_still_required");
  res.set("Cache-Control","no-store").json({ok:true,phase:"read_only_dry_run",manageNumber:product.localCode,shopRef:product.targetShopRef,remoteExists:remote.exists,remoteStatus:remote.httpStatus,skuCount:skus.length,imageCount:result.rows.length,mappedImageCount:mapped.length,cabinet:{containerCode:cabinet.container?.containerCode||null,folderConfigured:Boolean(cabinet.container?.rakutenFolderId),proposalCount:cabinet.proposal.length,proposalBlocking:cabinet.proposalValidation.blocking},policy:{taxRate:policy.taxRate,taxIncluded:policy.taxIncluded,freeShipping:policy.freeShipping,commonPriceJpy:policy.commonPriceJpy},blocking:[...new Set(blockers)],canPublish:false});
 }catch(error){next(error)}
});
export default router;
