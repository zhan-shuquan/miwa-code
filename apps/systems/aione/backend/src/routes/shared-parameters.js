import {exportCatalogWorkbook,parseCatalogWorkbook} from "../services/settings-catalog-workbook.js";
import {customSettingsWorkbook,parseCustomSettingsWorkbook} from "../services/custom-settings-workbook.js";
import {Router} from "express";
import {getRequestContext,requireWriteActor} from "../http/context.js";
import {readSharedParameters,activateSharedParameters,validateSharedParameters} from "../services/shared-parameters-service.js";
import {readSettingsReferenceUsage} from '../services/settings-reference-usage.js';
import pool from '../../db.js';
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
 res.set("Cache-Control","no-store").json({...await readSharedParameters(),usage:await readSettingsReferenceUsage(),capabilities:{canEdit:canEditSharedParameters(req.aioneIdentity),customSettings:true,fieldManagerV2:true}});
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
router.get('/shared-parameters/history',async(req,res,next)=>{try{
 const before=req.query.before===undefined?Number.MAX_SAFE_INTEGER:Number(req.query.before);
 if(!Number.isSafeInteger(before)||before<1)throw Object.assign(new Error('历史版本无效'),{statusCode:400});
 const result=await pool.query("SELECT version,updated_at,updated_by,change_reason FROM public.aione_shared_parameter_history WHERE scope='global' AND version<$1 ORDER BY version DESC LIMIT 20",[before]);
 res.set('Cache-Control','no-store').json({items:result.rows});
}catch(e){next(e);}});
router.get('/shared-parameters/history/:version',async(req,res,next)=>{try{
 const version=Number(req.params.version);if(!Number.isSafeInteger(version)||version<1)throw Object.assign(new Error('历史版本无效'),{statusCode:400});
 const result=await pool.query("SELECT version,payload,updated_at,updated_by,change_reason FROM public.aione_shared_parameter_history WHERE scope='global' AND version=$1",[version]);
 if(!result.rows.length)throw Object.assign(new Error('历史版本不存在'),{statusCode:404});
 const row=result.rows[0];res.set('Cache-Control','no-store').json({...row,parameters:validateSharedParameters(row.payload),payload:undefined});
}catch(e){next(e);}});
router.post('/shared-parameters/backup',async(req,res,next)=>{try{
 const parameters=validateSharedParameters(req.body?.parameters);
 res.set({'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="aione-settings-backup.json"','Cache-Control':'no-store'}).send(JSON.stringify({format:'AIONE_SETTINGS_V1',parameters},null,2));
}catch(e){next(e);}});
router.post('/shared-parameters/backup-preview',requireWriteActor,requireSettingsEditor,async(req,res,next)=>{try{
 if(req.body?.format!=='AIONE_SETTINGS_V1')throw Object.assign(new Error('配置备份格式不正确'),{statusCode:400});
 res.set('Cache-Control','no-store').json({parameters:validateSharedParameters(req.body.parameters)});
}catch(e){next(e);}});
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
// Preview endpoints validate the supplied draft schema and never activate settings.
router.post('/shared-parameters/custom-workbook',async(req,res,next)=>{try{
 const bytes=await customSettingsWorkbook(req.body?.category,{template:req.body?.template===true});
 res.set({'Content-Type':workbookType,'Content-Disposition':'attachment; filename="aione-custom-settings.xlsx"','Cache-Control':'no-store'}).send(bytes);
}catch(e){next(e);}});
router.post('/shared-parameters/custom-import-preview',requireWriteActor,requireSettingsEditor,async(req,res,next)=>{try{
 const raw=req.body?.base64;
 if(typeof raw!=='string'||!raw||raw.length>2796204||raw.length%4||!/^[a-zA-Z0-9+/]*={0,2}$/.test(raw))throw Object.assign(new Error('请上传不超过2MB的xlsx文件'),{statusCode:400});
 res.set('Cache-Control','no-store').json(await parseCustomSettingsWorkbook(req.body.category,Buffer.from(raw,'base64')));
}catch(e){next(e);}});
export default router;
