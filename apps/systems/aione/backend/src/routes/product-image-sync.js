import { Router } from "express";
import { createHash, randomUUID } from "node:crypto";
import pool, { withTransaction } from "../../db.js";
import { requireWriteActor } from "../http/context.js";
import { uploadGcsObjectIfAbsent, getGcsObjectMetadata, readGcsObject } from "../integrations/google-cloud-storage-client.js";
import { inspectLocalImageUpload, validProductIdentity, assertGcsImageMetadata, chooseExistingLocalImageAsset } from "../services/product-local-image-sync-contract.js";

const router=Router();
const err=(status,code,message)=>Object.assign(new Error(message),{statusCode:status,code});
async function verifyStoredImage({bucketName,objectName,digest,size,mime,readBack=false}){
 const metadata=await getGcsObjectMetadata({bucketName,objectName});
 const verifiedByMetadata=assertGcsImageMetadata(metadata,{digest,size,mime});
 if(readBack||!verifiedByMetadata){
  // Older blobs may lack custom SHA metadata. Re-read instead of claiming verified.
  const actual=await readGcsObject({bucketName,objectName});
  const actualHash=createHash("sha256").update(actual.bytes).digest("hex");
  if(actual.bytes.length!==size||actualHash!==digest)
   throw err(409,"image_storage_conflict","云端原图与登记哈希不匹配。");
 }
 return true;
}
async function recordVerifiedPrimaryReuse({productId,assetId,slotKey,digest,fileName,personId,size}){
 return withTransaction(async client=>{
  await client.query("SELECT id FROM public.products WHERE id=$1 FOR UPDATE",[productId]);
  const q=await client.query("SELECT id,asset_role,metadata FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL FOR UPDATE",[productId]);
  const decision=chooseExistingLocalImageAsset(q.rows,{slotKey,digest,kind:"main"});
  if(decision.action==="create"||decision.asset.id!==assetId)
   throw err(409,"main_image_conflict","商品主图关联发生变化，请重新核验。");
  // Only annotate the already verified ProductAsset; never touch or replace its GCS bytes.
  if(decision.action==="reuse_primary"){
   await client.query(
    "UPDATE public.product_assets SET metadata=metadata || $2::jsonb,updated_by_person_id=$3,updated_at=NOW(),record_version=record_version+1 WHERE id=$1",
    [assetId,JSON.stringify({localImageSlot:slotKey,localSyncedFileName:fileName,localVerifiedSha256:digest,byteSize:size}),personId||null]
   );
  }
  return assetId;
 });
}
function syncAllowed(req){
 const enabled=String(process.env.AIONE_LOCAL_IMAGE_SYNC_ENABLED||"false")==="true";
 const identity=req.aioneIdentity;
 const addresses=String(process.env.AIONE_LOCAL_IMAGE_SYNC_ALLOWED_EMAILS||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
 return enabled&&String(process.env.AIONE_REQUIRE_GOOGLE_AUTH||"false")==="true"&&identity?.authSource==="google"&&identity?.identitySource==="canonical_database"&&!!identity?.personId&&addresses.includes(String(identity.authenticatedEmail||"").toLowerCase());
}
function gate(req,res,next){
 if(!syncAllowed(req))return res.status(403).json({error:"image_sync_not_authorized",message:"图片同步未启用或账户未获授权。"});
 next();
}

// A single image per request keeps the existing 4MB JSON request cap and
// allows local tools to checkpoint every verified file separately.
router.post("/products/:productId/local-image",gate,requireWriteActor,async(req,res,next)=>{
 try {
  const productId=String(req.params.productId||"").trim();
  if(!validProductIdentity(productId))throw err(400,"product_id_invalid","需要有效的商品内部ID。");
  const p=await pool.query("SELECT id,product_code,metadata FROM public.products WHERE id=$1 AND archived_at IS NULL",[productId]);
  if(p.rowCount!==1)throw err(404,"product_not_found","商品不存在或已归档。");
  const localCode=String(p.rows[0].metadata?.manualEntry?.localCode||"").trim();
  const {image:item,bytes,mime,digest,slotKey:imageSlot}=inspectLocalImageUpload(req.body,localCode);
  const name=item.originalName;
  const bucket=String(process.env.AIONE_PRODUCT_ASSET_BUCKET||"").trim();
  if(!bucket)throw err(503,"asset_storage_unconfigured","AIONE图片云存储尚未配置。");
  const current=await pool.query("SELECT id,asset_role,original_name,mime_type,metadata FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL",[productId]);
  const decision=chooseExistingLocalImageAsset(current.rows,{slotKey:imageSlot,digest,kind:item.kind});
  if(decision.action!=="create"){
   const existing=decision.asset;
   const m=existing.metadata||{};
   if(!m.gcsBucket||!m.gcsObject)throw err(409,"image_storage_missing","已登记图片缺少云端文件引用。");
   await verifyStoredImage({bucketName:m.gcsBucket,objectName:m.gcsObject,digest,size:bytes.length,mime});
   if(decision.action==="reuse_primary")await recordVerifiedPrimaryReuse({
    productId,assetId:existing.id,slotKey:imageSlot,digest,fileName:name,size:bytes.length,personId:req.aioneContext?.personId
   });
   return res.json({ok:true,reused:true,assetId:existing.id,originalName:name,kind:item.kind,slot:item.slot,verified:true});
  }
  const objectName="product/local/"+p.rows[0].product_code+"/"+digest+"."+item.extension;
  await uploadGcsObjectIfAbsent({bucketName:bucket,objectName,buffer:bytes,contentType:mime,metadata:{fileSha256:digest}});
  await verifyStoredImage({bucketName:bucket,objectName,digest,size:bytes.length,mime});
  const result=await withTransaction(async client=>{
   await client.query("SELECT id FROM public.products WHERE id=$1 FOR UPDATE",[productId]);
   const rows=await client.query("SELECT id,asset_role,mime_type,metadata FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL FOR UPDATE",[productId]);
   const locked=chooseExistingLocalImageAsset(rows.rows,{slotKey:imageSlot,digest,kind:item.kind});
   if(locked.action!=="create")return {id:locked.asset.id,reused:true};
   const max=await client.query("SELECT COALESCE(MAX(asset_no),0)+1 AS next FROM public.product_assets WHERE product_id=$1",[productId]);
   const assetNo=Number(max.rows[0].next);
   if(assetNo>999)throw err(409,"asset_limit_reached","图片登记数量已达上限。");
   const metadata={layer:"SOURCE",sourceFolder:item.kind==="sku"?"01_SKU图":"02_产品图",fileSha256:digest,localImageSlot:imageSlot,sourceOrder:item.index,byteSize:bytes.length,imagePurpose:item.kind==="main"?"system_primary":item.kind,gcsBucket:bucket,gcsObject:objectName};
   const canonicalName=p.rows[0].product_code+"_"+String(assetNo).padStart(2,"0")+"."+item.extension;
   const id="ast_"+randomUUID();
   await client.query(`INSERT INTO public.product_assets(id,product_id,asset_no,asset_type,asset_role,source_provider,original_name,canonical_name,mime_type,lifecycle_status,metadata,created_by_person_id,updated_by_person_id,source_system)
   VALUES($1,$2,$3,'image',$4,'aione_local_sync',$5,$6,$7,'formalized',$8::jsonb,$9,$9,'aione-local-image-sync')`,[id,productId,assetNo,item.role,name,canonicalName,mime,JSON.stringify(metadata),req.aioneContext?.personId||null]);
   return {id,reused:false};
  });
  res.status(result.reused?200:201).json({ok:true,reused:result.reused,assetId:result.id,originalName:name,kind:item.kind,slot:item.slot,verified:true});
 }catch(e){next(e);}
});
/** Read-only GCS-backed reconciliation. No image or Rakuten writes. */
router.get("/products/:productId/local-images/status",gate,async(req,res,next)=>{
 try{
  const productId=String(req.params.productId||"").trim();
  if(!validProductIdentity(productId))throw err(400,"product_id_invalid","需要有效的商品内部ID。");
  const p=await pool.query("SELECT id,metadata FROM public.products WHERE id=$1 AND archived_at IS NULL",[productId]);
  if(p.rowCount!==1)throw err(404,"product_not_found","商品不存在或已归档。");
  const rows=await pool.query("SELECT id,original_name,mime_type,metadata FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL AND metadata ? 'localImageSlot' ORDER BY asset_no",[productId]);
  const assets=[];
  for(const item of rows.rows){
   const m=item.metadata||{};
   const summary={assetId:item.id,fileName:m.localSyncedFileName||item.original_name,slot:m.localImageSlot||null,sha256:m.fileSha256||null,verified:false};
   try{
    if(!m.gcsBucket||!m.gcsObject||!m.fileSha256||!Number.isSafeInteger(Number(m.byteSize))||Number(m.byteSize)<1)
     throw err(409,"image_asset_metadata_missing","云端图片登记资料不完整。");
    await verifyStoredImage({bucketName:m.gcsBucket,objectName:m.gcsObject,digest:m.fileSha256,size:Number(m.byteSize),mime:item.mime_type,readBack:true});
    summary.verified=true;
   }catch(error){summary.error=String(error.code||"image_storage_check_failed");}
   assets.push(summary);
  }
  return res.json({ok:true,productId,localCode:p.rows[0].metadata?.manualEntry?.localCode||null,total:assets.length,verifiedCount:assets.filter(x=>x.verified).length,assets});
 }catch(e){next(e);}
});

export default router;
