import { Router } from "express";
import pool, { withTransaction } from "../../db.js";
import { requireWriteActor } from "../http/context.js";
import { getDesignCenterWorkbench } from "../services/design-center-workbench-service.js";
import { getProductTagCard, upsertProductTagCard } from "../services/product-tag-card-service.js";
import {
  getProductHeroSpec,
  listInstructionPresets,
  upsertProductHeroSpec
} from "../services/product-hero-spec-service.js";
import {
  createDesignLayoutTemplate,
  listDesignLayoutTemplates
} from "../services/design-layout-template-service.js";

const router = Router();

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

router.get("/design-center/workbench", async (req, res, next) => {
  try {
    const productRef = cleanText(req.query.product || req.query.productCode, 240);
    const workbench = await getDesignCenterWorkbench(pool, productRef);
    res.json({ workbench });
  } catch (error) {
    next(error);
  }
});

router.get("/design-center/instruction-presets", async (req, res, next) => {
  try {
    const presets = await listInstructionPresets(pool, {
      instructionKind: req.query.instructionKind,
      categoryScope: req.query.categoryScope
    });
    res.json({ presets });
  } catch (error) {
    next(error);
  }
});

router.get("/design-center/layout-templates", async (req, res, next) => {
  try {
    const templates = await listDesignLayoutTemplates(pool, {
      pageType: req.query.pageType,
      categoryScope: req.query.categoryScope,
      channelScope: req.query.channelScope
    });
    res.json({ templates });
  } catch (error) {
    next(error);
  }
});

router.post("/design-center/layout-templates", requireWriteActor, async (req, res, next) => {
  try {
    const template = await withTransaction((client) => createDesignLayoutTemplate(client, {
      input: req.body && typeof req.body === "object" ? req.body : {},
      context: req.aioneContext || {}
    }));
    res.status(201).json({ template });
  } catch (error) {
    next(error);
  }
});

router.get("/products/:productRef/design/tag-card", async (req, res, next) => {
  try {
    const result = await getProductTagCard(pool, cleanText(req.params.productRef, 240));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch("/products/:productRef/design/tag-card", requireWriteActor, async (req, res, next) => {
  try {
    const result = await withTransaction((client) => upsertProductTagCard(client, {
      productRef: cleanText(req.params.productRef, 240),
      input: req.body && typeof req.body === "object" ? req.body : {},
      context: req.aioneContext || {}
    }));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/products/:productRef/design/hero-spec", async (req, res, next) => {
  try {
    const result = await getProductHeroSpec(pool, cleanText(req.params.productRef, 240));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch("/products/:productRef/design/hero-spec", requireWriteActor, async (req, res, next) => {
  try {
    const result = await withTransaction((client) => upsertProductHeroSpec(client, {
      productRef: cleanText(req.params.productRef, 240),
      input: req.body && typeof req.body === "object" ? req.body : {},
      context: req.aioneContext || {}
    }));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
