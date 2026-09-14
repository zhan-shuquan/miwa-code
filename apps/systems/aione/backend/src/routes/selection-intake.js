import { Router } from "express";
import { intakeSelectionRecords } from "../services/selection-intake-service.js";

const router = Router();
const clean = (value, maxLength = 200) => String(value ?? "").trim().slice(0, maxLength);

router.post("/selection-intake", async (req, res, next) => {
  try {
    const context = req.aioneContext || {};
    if (!context.personId) return res.status(401).json({ error: "authenticated_actor_required" });
    const result = await intakeSelectionRecords({
      records: req.body?.records,
      selectionType: clean(req.body?.selectionType, 40),
      ownerPersonId: context.personId,
      materialManifest: req.body?.materialManifest || {},
      intakeFile: req.body?.intakeFile || {}
    });
    return res.status(result.createdCount ? 201 : 200).json({ ok: true, ...result });
  } catch (error) {
    return next(error);
  }
});

export default router;
