import { Router } from "express";
import { randomUUID } from "node:crypto";
import { withTransaction } from "../../db.js";
import { requireWriteActor } from "../http/context.js";
import { recordBusinessEvent } from "../services/event-service.js";
import { allocateSelectionNo } from "../services/selection-number-service.js";

const router = Router();

function pad(value, width) {
  return String(value).padStart(width, "0");
}

function selectionId() {
  return `sel_${randomUUID()}`;
}

function productId() {
  return `prd_${randomUUID()}`;
}

function skuId() {
  return `sku_${randomUUID()}`;
}

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

async function loadExistingProduct(client, opportunityId) {
  const productResult = await client.query(
    "SELECT * FROM public.products WHERE source_opportunity_id=$1 AND archived_at IS NULL LIMIT 1",
    [opportunityId]
  );
  if (!productResult.rowCount) return null;
  const product = productResult.rows[0];
  const skuResult = await client.query(
    "SELECT * FROM public.product_skus WHERE product_id=$1 AND archived_at IS NULL ORDER BY sku_no",
    [product.id]
  );
  return { product, skus: skuResult.rows };
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
    const context = req.aioneContext || {};
    const selection = await withTransaction(async (client) => {
      const current = await client.query(
        "SELECT * FROM public.product_opportunities WHERE id=$1 AND archived_at IS NULL FOR UPDATE",
        [opportunityId]
      );
      if (!current.rowCount) {
        const error = new Error("Selection not found.");
        error.statusCode = 404;
        error.code = "selection_not_found";
        throw error;
      }
      if (current.rows[0].lifecycle_status !== "pending") {
        const error = new Error(`Selection cannot be selected from status ${current.rows[0].lifecycle_status}.`);
        error.statusCode = 409;
        error.code = "selection_status_conflict";
        throw error;
      }

      const updated = await client.query(
        `UPDATE public.product_opportunities
            SET lifecycle_status='selected',
                qualification_data=COALESCE(qualification_data,'{}'::jsonb) || $2::jsonb,
                updated_at=NOW(),
                updated_by_person_id=$3,
                record_version=record_version+1
          WHERE id=$1
          RETURNING *`,
        [opportunityId, JSON.stringify(qualificationData), context.personId || null]
      );

      await recordBusinessEvent(client, {
        eventType: "selection.selected",
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
    const context = req.aioneContext || {};
    const result = await withTransaction(async (client) => {
      const existing = await loadExistingProduct(client, opportunityId);
      if (existing) return { ...existing, reused: true };

      const opportunityResult = await client.query(
        "SELECT * FROM public.product_opportunities WHERE id=$1 AND archived_at IS NULL FOR UPDATE",
        [opportunityId]
      );
      if (!opportunityResult.rowCount) {
        const error = new Error("Selection not found.");
        error.statusCode = 404;
        error.code = "selection_not_found";
        throw error;
      }

      const opportunity = opportunityResult.rows[0];
      if (opportunity.lifecycle_status !== "selected") {
        const error = new Error("Selection must be selected before Product creation.");
        error.statusCode = 409;
        error.code = "selection_not_selected";
        throw error;
      }

      const productSeq = await client.query("SELECT nextval('public.aione_product_code_seq') AS n");
      const productCode = `MH${pad(productSeq.rows[0].n, 7)}`;
      const id = productId();
      const productData = {
        selectionNo: opportunity.selection_no,
        sourceTitle: opportunity.title,
        qualificationData: opportunity.qualification_data || {},
        sourceFulfillmentHint: opportunity.source_fulfillment_hint || null,
        sourceWeightG: opportunity.source_weight_g || null,
        skuCount
      };

      const productResult = await client.query(
        `INSERT INTO public.products
          (id, source_opportunity_id, business_id, category_id, name, lifecycle_status,
           owner_person_id, source_platform, source_ref, source_url, supplier_ref,
           cost_amount, currency, product_code, product_data, created_by_person_id,
           updated_by_person_id, source_system)
         VALUES ($1,$2,$3,$4,$5,'draft',$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$15,$16)
         RETURNING *`,
        [
          id, opportunity.id, opportunity.business_id, opportunity.category_id, opportunity.title,
          opportunity.owner_person_id || context.personId || null, opportunity.source_platform,
          opportunity.source_ref, opportunity.source_url, opportunity.supplier_ref,
          opportunity.estimated_cost, opportunity.currency || "JPY", productCode,
          JSON.stringify(productData), context.personId || null, context.sourceSystem || "aione"
        ]
      );

      const skus = [];
      for (let i = 1; i <= skuCount; i += 1) {
        const code = `${productCode}-${pad(i, 2)}`;
        const skuResult = await client.query(
          `INSERT INTO public.product_skus
            (id, product_id, sku_code, sku_no, name, lifecycle_status, created_by_person_id,
             updated_by_person_id, source_system)
           VALUES ($1,$2,$3,$4,$5,'draft',$6,$6,$7)
           RETURNING *`,
          [skuId(), id, code, i, skuCount === 1 ? opportunity.title : `${opportunity.title} ${i}`, context.personId || null, context.sourceSystem || "aione"]
        );
        skus.push(skuResult.rows[0]);
      }

      await client.query(
        `UPDATE public.product_opportunities
            SET lifecycle_status='converted',
                metadata=COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('convertedProductId',$2::text,'convertedProductCode',$3::text),
                updated_at=NOW(), updated_by_person_id=$4, record_version=record_version+1
          WHERE id=$1`,
        [opportunity.id, id, productCode, context.personId || null]
      );

      await client.query(
        `INSERT INTO public.object_registry
          (id, object_type, object_id, canonical_table, display_name, lifecycle_status, business_id, owner_person_id, metadata, source_system)
         VALUES ($1,'product',$2,'products',$3,'draft',$4,$5,$6::jsonb,$7)
         ON CONFLICT (object_type, object_id) DO UPDATE
           SET display_name=EXCLUDED.display_name, lifecycle_status=EXCLUDED.lifecycle_status,
               business_id=EXCLUDED.business_id, owner_person_id=EXCLUDED.owner_person_id,
               metadata=EXCLUDED.metadata, updated_at=NOW()`,
        [`obj_${randomUUID()}`, id, opportunity.title, opportunity.business_id,
          opportunity.owner_person_id || context.personId || null,
          JSON.stringify({ productCode, selectionNo: opportunity.selection_no }), context.sourceSystem || "aione"]
      );

      await recordBusinessEvent(client, {
        eventType: "selection.converted_to_product",
        objectType: "product",
        objectId: id,
        context,
        payload: { opportunityId: opportunity.id, selectionNo: opportunity.selection_no, productCode, skuCodes: skus.map((sku) => sku.sku_code) }
      });

      return { product: productResult.rows[0], skus, reused: false };
    });

    return res.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    return next(error);
  }
});

export default router;
