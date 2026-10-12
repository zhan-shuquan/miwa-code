import { Router } from "express";
import { createHash, randomUUID } from "node:crypto";
import pool, { withTransaction } from "../../db.js";
import { requireWriteActor } from "../http/context.js";
import { uploadGcsObjectIfAbsent, getGcsObjectMetadata } from "../integrations/google-cloud-storage-client.js";
import { inspectLocalImageUpload, validProductIdentity, assertGcsImageMetadata } from "../services/product-local-image-sync-contract.js";

const router=Router();
const err=(status,code,message)=>Object.assign(new Error(message),{statusCode:status,code});
const slotKey=x=>x.kind+":"+x.index;
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
  const p=await pool.query("SELECT id,product_code,metadata FROM public.products WHERE id=$1 AND archived_at IS NULL",[productId]);
  if(p.rowCount!==1)throw err(404,"product_not_found","商品不存在或已归档。");
  const localCode=String(p.rows[0].metadata?.manualEntry?.localCode||"").trim();
  const {image:item,bytes,mime,digest,slotKey:imageSlot}=inspectLocalImageUpload(req.body,localCode);
  const name=item.originalName;
  const bucket=String(process.env.AIONE_PRODUCT_ASSET_BUCKET||"").trim();
  if(!bucket)throw err(503,"asset_storage_unconfigured","AIONE图片云存储尚未配置。");
  const current=await pool.query("SELECT id,original_name,metadata FROM public.product_assets WHERE product_id=$1 AND source_provider='aione_local_sync' AND archived_at IS NULL",[productId]);
  const sameSlot=current.rows.find(x=>x.metadata?.localImageSlot===imageSlot);
  if(sameSlot){
   if(sameSlot.metadata?.fileSha256!==digest)throw err(409,"image_slot_changed","该图片位置已有不同版本；请先在AIONE确认替换，禁止自动覆盖。");
   // Confirm GCS existence even for an idempotent rerun.
   const object=sameSlot.metadata?.gcsObject;
   const storageBucket=sameSlot.metadata?.gcsBucket;
   if(!object||!storageBucket)throw err(409,"image_storage_missing","已登记图片缺失云端引用。");
   assertGcsImageMetadata(await getGcsObjectMetadata({bucketName:storageBucket,objectName:object}),{digest,size:bytes.length,mime});
   return res.json({ok:true,reused:true,assetId:sameSlot.id,originalName:name,kind:item.kind,slot:item.slot,verified:true});
  }
  const objectName="product/local/"+p.rows[0].product_code+"/"+digest+"."+item.extension;
  const cloud=await uploadGcsObjectIfAbsent({bucketName:bucket,objectName,buffer:bytes,contentType:mime,metadata:{fileSha256:digest}});
  assertGcsImageMetadata(cloud.metadata,{digest,size:bytes.length,mime});
  const result=await withTransaction(async client=>{
   await client.query("SELECT id FROM public.products WHERE id=$1 FOR UPDATE",[productId]);
   const rows=await client.query("SELECT id,metadata FROM public.product_assets WHERE product_id=$1 AND archived_at IS NULL FOR UPDATE",[productId]);
   const collision=rows.rows.find(row=>row.metadata?.localImageSlot===slotKey(item));
   if(collision){
    if(collision.metadata?.fileSha256!==digest)throw err(409,"image_slot_changed","该位置已有不同文件，不能覆盖。");
    return {id:collision.id,reused:true};
   }
   const max=await client.query("SELECT COALESCE(MAX(asset_no),0)+1 AS next FROM public.product_assets WHERE product_id=$1",[productId]);
   const assetNo=Number(max.rows[0].next);
   if(assetNo>999)throw err(409,"asset_limit_reached","图片登记数量已达上限。");
   const metadata={layer:"SOURCE",sourceFolder:item.kind==="sku"?"01_SKU图":"02_产品图",fileSha256:digest,localImageSlot:slotKey(item),sourceOrder:item.index,byteSize:bytes.length,imagePurpose:item.kind==="main"?"system_primary":item.kind,gcsBucket:bucket,gcsObject:objectName};
   const canonicalName=p.rows[0].product_code+"_"+String(assetNo).padStart(2,"0")+"."+item.extension;
   const id="ast_"+randomUUID();
   await client.query(`INSERT INTO public.product_assets(id,product_id,asset_no,asset_type,asset_role,source_provider,original_name,canonical_name,mime_type,lifecycle_status,metadata,created_by_person_id,updated_by_person_id,source_system)
   VALUES($1,$2,$3,'image',$4,'aione_local_sync',$5,$6,$7,'formalized',$8::jsonb,$9,$9,'aione-local-image-sync')`,[id,productId,assetNo,item.role,name,canonicalName,mime,JSON.stringify(metadata),req.aioneContext?.personId||null]);
   return {id,reused:false};
  });
  res.status(result.reused?200:201).json({ok:true,reused:result.reused,assetId:result.id,originalName:name,kind:item.kind,slot:item.slot,verified:true});
 }catch(e){next(e);}
});
export default router;
