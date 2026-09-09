import { Router } from "express";
import { getRequestContext, requireWriteActor } from "../http/context.js";
import { validate1688WeeklyEvidence } from "../services/work-evidence-validation-service.js";

const router = Router();

router.post("/work-items/:id/evidence/:evidenceId/validate-1688", requireWriteActor, async (req, res, next) => {
  try {
    const context = req.aioneContext || getRequestContext(req);
    const extractedRows = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 10000) : [];
    if (!extractedRows.length) {
      return res.status(400).json({
        error: "bad_request",
        message: "No extracted 1688 spreadsheet rows supplied. Drive/XLSX adapter must parse the file before deterministic validation."
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
