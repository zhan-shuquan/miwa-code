import { Router } from "express";
import { requireWriteActor } from "../http/context.js";
import { inspectRakutenCabinetProduct } from "../services/rakuten-cabinet-reconciliation.js";
import {
  getRakutenCanonicalPackReadiness,
  publishRakutenCanonicalPack
} from "../services/rakuten-canonical-publish-service.js";

const router = Router();

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

router.get("/product-assets/products/:productId/rakuten-pack", async (req, res, next) => {
  try {
    const result = await getRakutenCanonicalPackReadiness({
      productId: cleanText(req.params.productId, 240),
      shopRef: cleanText(req.query.shopRef, 240),
      containerCode: cleanText(req.query.containerCode, 120)
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/integrations/rakuten/products/:productId/cabinet/reconcile", async (req,res,next)=>{
 try {
  const shopRef=cleanText(req.query.shopRef,240);
  const result=await inspectRakutenCabinetProduct({productId:cleanText(req.params.productId,240),shopRef,containerCode:cleanText(req.query.containerCode||"rkc001",120)});
  res.set("Cache-Control","no-store").json(result);
 }catch(error){next(error)}
});

router.post("/integrations/rakuten/products/:productId/cabinet/publish-canonical", requireWriteActor, async (req, res, next) => {
  try {
    const requestedShop = cleanText(req.body?.shopRef, 240);
    if (!process.env.AIONE_RAKUTEN_SHOP_REF || requestedShop !== process.env.AIONE_RAKUTEN_SHOP_REF) {
      return res.status(403).json({ error: "rakuten_shop_binding_mismatch" });
    }
    const productId=cleanText(req.params.productId,240);
    const audit=await inspectRakutenCabinetProduct({productId,shopRef:requestedShop,containerCode:cleanText(req.body?.containerCode||"rkc001",120)});
    if(audit.blocking.length) {
      return res.status(409).json({error:"rakuten_cabinet_reconciliation_required",message:"Remote R-Cabinet contains unverified image state. Reconcile before uploading.",remoteFileCount:audit.totalRemoteFiles,verifiedMappings:audit.verifiedMappings,blocking:audit.blocking});
    }
    const result = await publishRakutenCanonicalPack({
      productId: cleanText(req.params.productId, 240),
      shopRef: cleanText(req.body?.shopRef, 240),
      containerCode: cleanText(req.body?.containerCode, 120),
      packVersion: cleanText(req.body?.packVersion || "v1", 80),
      assignments: Array.isArray(req.body?.assignments) ? req.body.assignments : null,
      context: req.aioneContext || {}
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
