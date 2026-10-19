import {readSharedParameters} from "../services/shared-parameters-service.js";
import { Router } from "express";
import { requireWriteActor } from "../http/context.js";
import pool from "../../db.js";
import {
  getManualProduct, listManualProducts, listManualSkus, saveManualProduct,
  previewImportProducts, importManualProducts, applyApprovedZjl238RakutenDraft
} from "../services/product-manual-entry-service.js";
import {
  parseProductEntryWorkbook, exportProductEntries, normalizeProductEntry
} from "../services/product-entry-contract.js";

const router = Router();
function invalid(code,message){const e=new Error(message);e.code=code;e.statusCode=400;throw e;}
function readBytes(body){
  const b64=String(body?.base64||"");
  if(!b64||b64.length>2_700_000||!/^[a-zA-Z0-9+/]+={0,2}$/.test(b64))
    invalid("invalid_upload","上传文件过大或不是有效的Excel数据；当前接口限2MB，超过请拆批。");
  return Buffer.from(b64,"base64");
}
function filename(body){return String(body?.filename||"upload.xlsx").replace(/[\\/:*?"<>|]/g,"").slice(0,180);}

router.get("/sku-contract",(req,res)=>res.set("Cache-Control","no-store").json({ok:true,version:"effective-sku-v1"}));

router.get("/",async(req,res,next)=>{
  try{res.json({ok:true,items:await listManualProducts({query:req.query.q,limit:req.query.limit,offset:req.query.offset,category:req.query.category})});}
  catch(e){next(e);}
});
router.get("/export.xlsx",async(req,res,next)=>{
  try {
    const items=await listManualProducts({query:req.query.q,category:req.query.category,limit:201,offset:0});
    if(items.length>200)invalid("export_limit","超过200件，请缩小筛选范围后导出，避免文件缺行。");
    const settings=await readSharedParameters();
    const bytes=await exportProductEntries(items,settings.parameters);
    res.set("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.set("Content-Disposition",'attachment; filename="aione_products_export.xlsx"');
    res.set("Cache-Control","private, no-store");
    res.send(bytes);
  } catch(e){next(e);}
});
// Compact read-only image index for the unified ERP Image List.
// Uses the existing Product and ProductAsset sources. No new image table.
// Store columns are derived from registered store facts, never from front-end constants.
// Product category filter uses canonical product metadata; empty legacy values stay unclassified.
router.get("/skus",async(req,res,next)=>{
 try{
  const result=await listManualSkus({query:req.query.q,limit:req.query.limit,offset:req.query.offset});
  res.set("Cache-Control","no-store").json({ok:true,...result});
 }catch(error){next(error)}
});
router.get("/categories",async(req,res,next)=>{
 try{
  const rows=await pool.query("SELECT DISTINCT metadata->'manualEntry'->>'category' AS category FROM public.products WHERE metadata->'manualEntry'->>'category' IS NOT NULL AND BTRIM(metadata->'manualEntry'->>'category')<>'' ORDER BY category LIMIT 500");
  res.set("Cache-Control","no-store").json({ok:true,categories:rows.rows.map(x=>x.category)});
 }catch(error){next(error)}
});
router.get("/store-catalog",async(req,res,next)=>{
 try{
   let shops=[];
   // Current-baseline schema, when canonical stores exist.
   try{
     const r=await pool.query("SELECT name FROM public.stores WHERE name IS NOT NULL ORDER BY name LIMIT 250");
     shops=r.rows.map(x=>String(x.name||"").trim()).filter(Boolean);
   }catch(error){
     if(error.code!=="42P01"&&error.code!=="42703")throw error;
   }
   // Existing lifecycle schema: discover actually associated stores only.
   if(!shops.length){
     try{
       const r=await pool.query("SELECT DISTINCT shop_ref AS name FROM public.channel_listings WHERE shop_ref IS NOT NULL ORDER BY name LIMIT 250");
       shops=r.rows.map(x=>String(x.name||"").trim()).filter(Boolean);
     }catch(error){if(error.code!=="42P01"&&error.code!=="42703")throw error;}
   }
   res.set("Cache-Control","no-store").json({ok:true,shops:[...new Set(shops)]});
 }catch(error){next(error)}
});
router.get("/image-index",async(req,res,next)=>{
 try{
   const limit=Math.min(200,Math.max(1,Number(req.query.limit)||100));
   const offset=Math.max(0,Number(req.query.offset)||0);
   if(!Number.isInteger(limit)||!Number.isInteger(offset))invalid("invalid_pagination","分页参数无效");
   const batch=await listManualProducts({query:req.query.q,limit:limit+1,offset});
   const hasMore=batch.length>limit;
   const products=batch.slice(0,limit);
   const ids=products.map(p=>String(p.id));
   if(!ids.length)return res.set("Cache-Control","no-store").json({ok:true,products:[],assets:[],truncated:false,hasMore:false});
   const maxAssets=10001;
   const result=await pool.query(
    "SELECT id::text AS id,product_id::text AS product_id,original_name,canonical_name,asset_role,sku_id::text AS sku_id,asset_no FROM public.product_assets WHERE product_id::text=ANY($1::text[]) AND archived_at IS NULL AND asset_type='image' ORDER BY product_id,asset_no LIMIT $2",
    [ids,maxAssets]
   );
   const truncated=result.rows.length===maxAssets;
   return res.set("Cache-Control","no-store").json({ok:true,products:products.map(p=>({id:p.id,localCode:p.localCode,nameZh:p.nameZh})),assets:result.rows.slice(0,maxAssets-1),truncated,hasMore});
 }catch(error){next(error)}
});
router.get("/:ref",async(req,res,next)=>{
  try{res.json({ok:true,...await getManualProduct(req.params.ref)});}
  catch(e){next(e);}
});
router.post("/:ref/approved-rakuten-draft",requireWriteActor,async(req,res,next)=>{
 try{
  const result=await applyApprovedZjl238RakutenDraft(req.params.ref,req.aioneContext,req.body?.version);
  res.set("Cache-Control","no-store").json(result);
 }catch(e){next(e)}
});
router.post("/",requireWriteActor,async(req,res,next)=>{
  try{res.status(201).json({ok:true,...await saveManualProduct(req.body,req.aioneContext,{createOnly:true,source:"aione-web"})});}
  catch(e){next(e);}
});
router.patch("/:ref",requireWriteActor,async(req,res,next)=>{
  try {
    const current=await getManualProduct(req.params.ref);
    if(!req.body||!req.body.localCode)invalid("local_code_required","商品货号不能为空。");
    const expected=Number(req.body.version);
    if(!Number.isInteger(expected)||expected<1)invalid("version_required","编辑时必须提交商品版本号。");
    res.json({ok:true,...await saveManualProduct(req.body,req.aioneContext,{updateOnly:true,expectedVersion:expected,source:"aione-web",productId:current.product.id})});
  }catch(e){next(e);}
});
router.post("/import/preview",requireWriteActor,async(req,res,next)=>{
  try{
    const result=await parseProductEntryWorkbook(readBytes(req.body),filename(req.body));
    res.json({ok:true,sourceKind:result.sourceKind,items:await previewImportProducts(result.items),warnings:result.warnings,validCount:result.items.length});
  }catch(e){next(e);}
});
router.post("/import/commit",requireWriteActor,async(req,res,next)=>{
  try{
    if(req.body?.confirmed!==true)invalid("confirmation_required","批量导入必须经过预览并明确确认。");
    const result=await parseProductEntryWorkbook(readBytes(req.body),filename(req.body));
    // No promotion to Rakuten publishing. Import only creates drafts and never updates existing products.
    res.json({ok:true,sourceKind:result.sourceKind,warnings:result.warnings,...await importManualProducts(result.items,req.aioneContext)});
  }catch(e){next(e);}
});
export default router;
