import { Router } from "express";
import pool, { withTransaction } from "../../db.js";
import { requireWriteActor } from "../http/context.js";
import { getDesignTemplate, listDesignTemplates } from "../services/design-template-service.js";
import {
  approveDesignTask,
  createDesignTask,
  getDesignTask,
  listProductDesignTasks,
  proposeDesignTask,
  reviewDesignTask
} from "../services/design-task-service.js";
import { listDesignTaskOutputs } from "../services/design-output-service.js";
import { executeDesignTask } from "../services/design-execution-service.js";

const router = Router();

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

router.get("/design/templates", async (req, res, next) => {
  try {
    const templates = await listDesignTemplates(pool, {
      categoryScope: req.query.categoryScope,
      channelScope: req.query.channelScope,
      lifecycleStatus: req.query.lifecycleStatus
    });
    res.json({ templates });
  } catch (error) {
    next(error);
  }
});

router.get("/design/templates/:id", async (req, res, next) => {
  try {
    const template = await getDesignTemplate(pool, cleanText(req.params.id, 240));
    res.json({ template });
  } catch (error) {
    next(error);
  }
});

router.post("/products/:productId/design/tasks", requireWriteActor, async (req, res, next) => {
  try {
    const context = req.aioneContext || {};
    const result = await withTransaction((client) => createDesignTask(client, {
      productId: cleanText(req.params.productId, 240),
      templateId: cleanText(req.body?.templateId, 240),
      taskType: cleanText(req.body?.taskType, 120) || null,
      inputAssetIds: Array.isArray(req.body?.inputAssetIds) ? req.body.inputAssetIds : [],
      inputFactSnapshot: req.body?.inputFactSnapshot && typeof req.body.inputFactSnapshot === "object" ? req.body.inputFactSnapshot : {},
      instructionSnapshot: req.body?.instructionSnapshot && typeof req.body.instructionSnapshot === "object" ? req.body.instructionSnapshot : {},
      context
    }));
    res.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/products/:productId/design/tasks", async (req, res, next) => {
  try {
    const tasks = await listProductDesignTasks(pool, cleanText(req.params.productId, 240));
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

router.get("/design/tasks/:taskId", async (req, res, next) => {
  try {
    const task = await getDesignTask(pool, cleanText(req.params.taskId, 240));
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

router.get("/design/tasks/:taskId/outputs", async (req, res, next) => {
  try {
    const outputs = await listDesignTaskOutputs(pool, cleanText(req.params.taskId, 240));
    res.json({ outputs });
  } catch (error) {
    next(error);
  }
});

router.post("/design/tasks/:taskId/propose", requireWriteActor, async (req, res, next) => {
  try {
    const task = await withTransaction((client) => proposeDesignTask(
      client,
      cleanText(req.params.taskId, 240),
      req.aioneContext || {}
    ));
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

router.post("/design/tasks/:taskId/approve", requireWriteActor, async (req, res, next) => {
  try {
    const task = await withTransaction((client) => approveDesignTask(
      client,
      cleanText(req.params.taskId, 240),
      req.aioneContext || {}
    ));
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

router.post("/design/tasks/:taskId/execute", requireWriteActor, async (req, res, next) => {
  try {
    const result = await executeDesignTask(
      pool,
      cleanText(req.params.taskId, 240),
      req.aioneContext || {}
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/design/tasks/:taskId/review", requireWriteActor, async (req, res, next) => {
  try {
    const task = await withTransaction((client) => reviewDesignTask(
      client,
      cleanText(req.params.taskId, 240),
      {
        outcome: req.body?.outcome,
        detail: req.body?.detail && typeof req.body.detail === "object" ? req.body.detail : {}
      },
      req.aioneContext || {}
    ));
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

export default router;
