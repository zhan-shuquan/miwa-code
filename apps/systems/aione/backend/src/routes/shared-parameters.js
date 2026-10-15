import {exportCatalogWorkbook,parseCatalogWorkbook} from "../services/settings-catalog-workbook.js";
import {Router} from "express";
import {getRequestContext,requireWriteActor} from "../http/context.js";
import {readSharedParameters,activateSharedParameters} from "../services/shared-parameters-service.js";
const router=Router();
export function canEditSharedParameters(identity,allowlist=process.env.AIONE_SHARED_PARAMETER_EDITOR_PERSON_IDS){
 const ids=String(allowlist||"").split(/[,;\s]+/).filter(Boolean);
 return identity?.identitySource==="canonical_database"&&Boolean(identity.personId)&&ids.includes(String(identity.personId));
}
function requireSettingsEditor(req,res,next){
 if(!canEditSharedParameters(req.aioneIdentity))return res.status(403).json({error:"shared_parameter_editor_permission_denied"});
 next();
}
router.get("/shared-parameters",async(req,res,next)=>{try{
 res.set("Cache-Control","no-store").json({...await readSharedParameters(),capabilities:{canEdit:canEditSharedParameters(req.aioneIdentity)}});
}catch(error){next(error)}});
router.patch("/shared-parameters",requireWriteActor,requireSettingsEditor,async(req,res,next)=>{try{
 const actor=getRequestContext(req);
 const result=await activateSharedParameters({
  expectedVersion:Number(req.body?.expectedVersion),
  parameters:req.body?.parameters,
  changeReason:req.body?.changeReason,
  updatedBy:actor.personId||"authenticated-admin"
 });
 res.set("Cache-Control","no-store").json(result);
}catch(error){next(error)}});
const workbookType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
router.get("/shared-parameters/catalogs/:kind/template.xlsx",async(req,res,next)=>{try{
 const bytes=await exportCatalogWorkbook(req.params.kind,[],{template:true});
 res.set({"Content-Type":workbookType,"Content-Disposition":'attachment; filename="aione-'+req.params.kind+'-template.xlsx"',"Cache-Control":"no-store"}).send(bytes);
}catch(e){next(e);}});
router.post("/shared-parameters/catalogs/:kind/export.xlsx",async(req,res,next)=>{try{
 const bytes=await exportCatalogWorkbook(req.params.kind,req.body?.rows);
 res.set({"Content-Type":workbookType,"Content-Disposition":'attachment; filename="aione-'+req.params.kind+'.xlsx"',"Cache-Control":"no-store"}).send(bytes);
}catch(e){next(e);}});
router.post("/shared-parameters/catalogs/:kind/import-preview",requireWriteActor,requireSettingsEditor,async(req,res,next)=>{try{
 const raw=req.body?.base64;
 if(typeof raw!=="string"||raw.length>2796204||!raw||raw.length%4!==0||!/^[a-zA-Z0-9+/]*={0,2}$/.test(raw))return res.status(400).json({error:"invalid_workbook_upload",message:"请上传不超过2MB的Excel .xlsx文件"});
 res.set("Cache-Control","no-store").json(await parseCatalogWorkbook(req.params.kind,Buffer.from(raw,"base64")));
}catch(e){next(e);}});
export default router;
