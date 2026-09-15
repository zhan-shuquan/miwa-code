import { Router } from "express";
import { withTransaction } from "../../db.js";
import { recordBusinessEvent } from "../services/event-service.js";
import {
  selectProductOpportunity,
  convertProductOpportunityToProduct
} from "../services/product-lifecycle-service.js";

const router = Router();

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function requireAuthenticatedIdentity(req, res, next) {
  const identity = req.aioneIdentity || null;
  if (!identity) {
    return res.status(401).json({ error: "authenticated_actor_required" });
  }
  req.aioneContext = {
    personId: identity.personId || null,
    assignmentId: identity.assignmentId || null,
    actorKind: "human",
    authenticatedEmail: identity.authenticatedEmail || identity.primaryEmail || null,
    sourceSystem: req.header("x-aione-source-system") || "aione",
    correlationId: req.header("x-correlation-id") || null
  };
  return next();
}

router.post("/selections/:id/select", requireAuthenticatedIdentity, async (req, res, next) => {
  const opportunityId = cleanText(req.params.id, 240);
  const qualificationData = req.body?.qualificationData && typeof req.body.qualificationData === "object"
    ? req.body.qualificationData
    : {};
  try {
    const result = await selectProductOpportunity({
      opportunityId,
      qualificationData: {
        ...qualificationData,
        decisionEvidence: qualificationData.decisionEvidence || "selection-center-human-approval",
        authenticatedEmail: req.aioneContext.authenticatedEmail
      },
      context: req.aioneContext
    });
    return res.json({ selection: result.selection, reused: result.reused });
  } catch (error) {
    return next(error);
  }
});

router.post("/selections/:id/reject", requireAuthenticatedIdentity, async (req, res, next) => {
  const opportunityId = cleanText(req.params.id, 240);
  try {
    const context = req.aioneContext;
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
        payload: {
          selectionNo: updated.rows[0].selection_no,
          authenticatedEmail: context.authenticatedEmail || null
        }
      });
      return updated.rows[0];
    });
    return res.json({ selection });
  } catch (error) {
    return next(error);
  }
});

router.post("/selections/:id/convert", requireAuthenticatedIdentity, async (req, res, next) => {
  const opportunityId = cleanText(req.params.id, 240);
  const requestedSkuCount = Number(req.body?.skuCount ?? 1);
  const skuCount = Number.isInteger(requestedSkuCount) && requestedSkuCount > 0 && requestedSkuCount <= 99
    ? requestedSkuCount
    : null;
  if (!skuCount) {
    return res.status(400).json({ error: "bad_request", message: "skuCount must be an integer from 1 to 99." });
  }
  try {
    const result = await convertProductOpportunityToProduct({
      opportunityId,
      skuCount,
      context: req.aioneContext
    });
    return res.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    return next(error);
  }
});

export default router;
