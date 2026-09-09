import { Router } from "express";
import { getRequestContext, requireWriteActor } from "../http/context.js";
import { generateRecurringWork, markOverdueWork } from "../services/recurring-work-service.js";

const router = Router();

function requireSchedulerSecret(req, res, next) {
  const expected = String(process.env.AIONE_SCHEDULER_SECRET || "");
  if (!expected) return res.status(503).json({ error: "scheduler_not_configured" });
  const supplied = String(req.header("x-aione-scheduler-secret") || "");
  if (supplied !== expected) return res.status(403).json({ error: "scheduler_forbidden" });
  next();
}

router.post("/generate", requireSchedulerSecret, async (req, res, next) => {
  try {
    const context = getRequestContext(req);
    const ruleCode = String(req.body?.ruleCode || "").trim();
    if (!ruleCode) return res.status(400).json({ error: "bad_request", message: "ruleCode is required." });
    const result = await generateRecurringWork({
      ruleCode,
      cycleKey: req.body?.cycleKey || null,
      actorPersonId: context.personId || null,
      sourceSystem: context.sourceSystem || "aione-scheduler"
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.post("/mark-overdue", requireSchedulerSecret, async (req, res, next) => {
  try {
    const result = await markOverdueWork();
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.post("/generate/manual", requireWriteActor, async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === "production") return res.status(404).json({ error: "not_found" });
    const context = req.aioneContext || getRequestContext(req);
    const ruleCode = String(req.body?.ruleCode || "").trim();
    if (!ruleCode) return res.status(400).json({ error: "bad_request", message: "ruleCode is required." });
    const result = await generateRecurringWork({
      ruleCode,
      cycleKey: req.body?.cycleKey || null,
      actorPersonId: context.personId,
      sourceSystem: context.sourceSystem || "aione-manual-preview"
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

export default router;
