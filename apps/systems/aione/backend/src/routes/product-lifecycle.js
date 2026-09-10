import { Router } from "express";
import { randomUUID } from "node:crypto";
import { withTransaction } from "../../db.js";
import { requireWriteActor } from "../http/context.js";
import { recordBusinessEvent } from "../services/event-service.js";
import { allocateSelectionNo } from "../services/selection-number-service.js";
import {
  selectProductOpportunity,
  convertProductOpportunityToProduct
} from "../services/product-lifecycle-service.js";

const router = Router();

function selectionId() {
  return `sel_${randomUUID()}`;
}

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

// One canonical Selection / ProductOpportunity model. Fulfillment is not a selection type.
router.post("/selections", requireWriteActor, async (req, res, next) => {
  const sourcePlatform = cleanText(req.body?.sourcePlatform, 80);
  const sourceRef = cleanText(req.body?.sourceRef, 240) || null;
  const sourceUrl = cleanText(req.body?.sourceUrl, 2000) || null;
  const title = cleanText(req.body?.title, 500);
  const supplierRef = cleanText(req.body?.supplierRef, 240) || null;
  const selectionDateInput = req.body?.selectionDate || req.body?.sourceAddedAt || new Date();
  const qualificationData = req.body?.qualificationData && typeof req.body.qualificationData === "object"
    ? req.body.qualificationData
    : {};
  const metadata = req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {};

  if (!sourcePlatform || !title) {
    return res.status(400).json({ error: "bad_request", message: "sourcePlatform and title are required." });
  }

  try {
    const context = req.aioneContext || {};
    const result = await withTransaction(async (client) => {
      if (sourceRef) {
        const existingResult = await client.query(
          `SELECT * FROM public.product_opportunities
            WHERE source_platform=$1 AND source_ref=$2 AND archived_at IS NULL
            LIMIT 1`,
          [sourcePlatform, sourceRef]
        );
        if (existingResult.rowCount) return { selection: existingResult.rows[0], reused: true };
      }

      const id = selectionId();
      const { selectionNo, selectionDate } = await allocateSelectionNo(client, selectionDateInput);
      const inserted = await client.query(
        `INSERT INTO public.product_opportunities
          (id, source_platform, source_ref, source_url, supplier_ref, title, selection_mode,
           lifecycle_status, owner_person_id, qualification_data, metadata, selection_no,
           selection_date, created_by_person_id, updated_by_person_id, source_system)
         VALUES ($1,$2,$3,$4,$5,$6,'selection','pending',$7,$8::jsonb,$9::jsonb,$10,$11::date,$12,$12,$13)
         RETURNING *`,
        [
          id,
          sourcePlatform,
          sourceRef,
          sourceUrl,
          supplierRef,
          title,
          context.personId || null,
          JSON.stringify(qualificationData),
          JSON.stringify(metadata),
          selectionNo,
          selectionDate,
          context.personId || null,
          context.sourceSystem || "aione"
        ]
      );

      await recordBusinessEvent(client, {
        eventType: "selection.created",
        objectType: "product_opportunity",
        objectId: id,
        context,
        payload: { selectionNo, sourcePlatform, sourceRef }
      });

      return { selection: inserted.rows[0], reused: false };
    });

    return res.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    return next(error);
  }
});

// CURRENT human decision: pending -> selected.
router.post("/selections/:id/select", requireWriteActor, async (req, res, next) => {
  const opportunityId = cleanText(req.params.id, 240);
  const qualificationData = req.body?.qualificationData && typeof req.body.qualificationData === "object"
    ? req.body.qualificationData
    : {};

  try {
    const result = await selectProductOpportunity({
      opportunityId,
      qualificationData,
      context: req.aioneContext || {}
    });
    return res.json({ selection: result.selection, reused: result.reused });
  } catch (error) {
    return next(error);
  }
});

router.post("/selections/:id/reject", requireWriteActor, async (req, res, next) => {
  const opportunityId = cleanText(req.params.id, 240);
  try {
    const context = req.aioneContext || {};
    const selection = await withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE public.product_opportunities
            SET lifecycle_status='rejected', updated_at=NOW(), updated_by_person_id=$2,
                record_version=record_version+1
          WHERE id=$1 AND lifecycle_status='pending' AND archived_at IS NULL
          RETURNING *`,
        [opportunityId, context.personId || null]
      );
      if (!updated.rowCount) {
        const error = new Error("Only a pending selection can be rejected.");
        error.statusCode = 409;
        error.code = "selection_status_conflict";
        throw error;
      }
      await recordBusinessEvent(client, {
        eventType: "selection.rejected",
        objectType: "product_opportunity",
        objectId: opportunityId,
        context,
        payload: { selectionNo: updated.rows[0].selection_no }
      });
      return updated.rows[0];
    });
    return res.json({ selection });
  } catch (error) {
    return next(error);
  }
});

router.post("/convert-selection", requireWriteActor, async (req, res, next) => {
  const opportunityId = cleanText(req.body?.opportunityId, 240);
  const requestedSkuCount = Number(req.body?.skuCount ?? 1);
  const skuCount = Number.isInteger(requestedSkuCount) && requestedSkuCount > 0 && requestedSkuCount <= 99
    ? requestedSkuCount
    : null;

  if (!opportunityId) return res.status(400).json({ error: "bad_request", message: "opportunityId is required." });
  if (!skuCount) return res.status(400).json({ error: "bad_request", message: "skuCount must be an integer from 1 to 99." });

  try {
    const result = await convertProductOpportunityToProduct({
      opportunityId,
      skuCount,
      context: req.aioneContext || {}
    });
    return res.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    return next(error);
  }
});

export default router;
