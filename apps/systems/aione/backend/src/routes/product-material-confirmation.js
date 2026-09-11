import { Router } from "express";
import pool, { withTransaction } from "../../db.js";
import { requireWriteActor } from "../http/context.js";
import {
  confirmProductMaterial,
  getCurrentMaterialConfirmation,
  invalidateProductMaterialConfirmation
} from "../services/product-material-confirmation-service.js";

const router = Router();

function cleanText(value, maxLength = 1000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

router.get("/products/:productId/material-confirmation", async (req, res, next) => {
  try {
    const productId = cleanText(req.params.productId, 240);
    const confirmation = await getCurrentMaterialConfirmation(pool, productId);
    res.json({ productId, confirmation });
  } catch (error) {
    next(error);
  }
});

router.post("/products/:productId/material-confirmation/confirm", requireWriteActor, async (req, res, next) => {
  try {
    const result = await withTransaction((client) => confirmProductMaterial(client, {
      productId: cleanText(req.params.productId, 240),
      assetIds: Array.isArray(req.body?.assetIds) ? req.body.assetIds : [],
      metadata: req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {},
      context: req.aioneContext || {}
    }));
    res.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/products/:productId/material-confirmation/invalidate", requireWriteActor, async (req, res, next) => {
  try {
    const result = await withTransaction((client) => invalidateProductMaterialConfirmation(client, {
      productId: cleanText(req.params.productId, 240),
      reason: cleanText(req.body?.reason, 1000) || "product_truth_changed",
      context: req.aioneContext || {}
    }));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
