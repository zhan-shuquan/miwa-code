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
 res.set("Cache-Control","no-store").json(await readSharedParameters());
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
export default router;
