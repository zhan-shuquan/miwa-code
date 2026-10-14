import {Router} from "express";
import {getRequestContext,requireWriteActor} from "../http/context.js";
import {readSharedParameters,activateSharedParameters} from "../services/shared-parameters-service.js";
const router=Router();
router.get("/shared-parameters",async(req,res,next)=>{try{
 res.set("Cache-Control","no-store").json(await readSharedParameters());
}catch(error){next(error)}});
router.patch("/shared-parameters",requireWriteActor,async(req,res,next)=>{try{
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
