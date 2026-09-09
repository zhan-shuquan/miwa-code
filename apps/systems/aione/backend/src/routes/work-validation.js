import { Router } from "express";
import { getRequestContext, requireWriteActor } from "../http/context.js";
import { validate1688WeeklyEvidence } from "../services/work-evidence-validation-service.js";
import { validateDrive1688Evidence } from "../services/drive-work-evidence-service.js";
import { discover1688EvidenceForWorkItem } from "../services/work-evidence-discovery-service.js";

const router = Router();

router.get("/work-items/:id/evidence/discover-1688", async (req, res, next) => {
  try {
    const context = req.aioneContext || getRequestContext(req);
    const result = await discover1688EvidenceForWorkItem({ workItemId: req.params.id });
    if (String(result.personId) !== String(context.personId)) {
      return res.status(403).json({ error: "forbidden", message: "This work item belongs to another person." });
    }
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

// Runtime path: AIONE downloads the registered Drive file, parses the original XLSX and validates it deterministically.
router.post("/work-items/:id/evidence/:evidenceId/validate-1688-drive", requireWriteActor, async (req, res, next) => {
  try {
    const context = req.aioneContext || getRequestContext(req);
    const result = await validateDrive1688Evidence({
      workItemId: req.params.id,
      evidenceId: req.params.evidenceId,
      actorPersonId: context.personId,
      sourceSystem: context.sourceSystem || "aione-drive-work-validator"
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

// Preview/test seam: keep row-based validation so fixture rows can exercise business rules without Drive access.
router.post("/work-items/:id/evidence/:evidenceId/validate-1688", requireWriteActor, async (req, res, next) => {
  try {
    const context = req.aioneContext || getRequestContext(req);
    const extractedRows = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 10000) : [];
    if (!extractedRows.length) {
      return res.status(400).json({
        error: "bad_request",
        message: "No extracted 1688 spreadsheet rows supplied. Use validate-1688-drive for registered Google Drive XLSX evidence."
      });
    }
    const result = await validate1688WeeklyEvidence({
      workItemId: req.params.id,
      evidenceId: req.params.evidenceId,
      extractedRows,
      actorPersonId: context.personId,
      sourceSystem: context.sourceSystem || "aione-work-validator"
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

export default router;
