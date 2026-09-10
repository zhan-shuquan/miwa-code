import { Router } from "express";
import { getProductAssetReadiness } from "../services/product-asset-readiness-service.js";

const router = Router();

router.get("/products/:productId/readiness", async (req, res, next) => {
  try {
    const result = await getProductAssetReadiness(req.params.productId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
