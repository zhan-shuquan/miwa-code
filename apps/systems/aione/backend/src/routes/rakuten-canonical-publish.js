import { Router } from "express";
import { requireWriteActor } from "../http/context.js";
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

router.post("/integrations/rakuten/products/:productId/cabinet/publish-canonical", requireWriteActor, async (req, res, next) => {
  try {
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
