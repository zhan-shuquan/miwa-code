import { Router } from "express";
import { requireWriteActor } from "../http/context.js";
import {
  getManualProduct, listManualProducts, saveManualProduct,
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

router.get("/",async(req,res,next)=>{
  try{res.json({ok:true,items:await listManualProducts({query:req.query.q,limit:req.query.limit,offset:req.query.offset})});}
  catch(e){next(e);}
});
router.get("/export.xlsx",async(req,res,next)=>{
  try {
    const items=await listManualProducts({query:req.query.q,limit:201,offset:0});
    if(items.length>200)invalid("export_limit","超过200件，请缩小筛选范围后导出，避免文件缺行。");
    const bytes=await exportProductEntries(items);
    res.set("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.set("Content-Disposition",'attachment; filename="aione_products_export.xlsx"');
    res.set("Cache-Control","private, no-store");
    res.send(bytes);
  } catch(e){next(e);}
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
