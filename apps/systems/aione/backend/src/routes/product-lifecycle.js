import { Router } from "express";
import { randomUUID } from "node:crypto";
import { withTransaction } from "../../db.js";
import { requireWriteActor } from "../http/context.js";
import { recordBusinessEvent } from "../services/event-service.js";

const router = Router();

function pad(value, width) {
  return String(value).padStart(width, "0");
}

function todayCode() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = pad(now.getUTCMonth() + 1, 2);
  const d = pad(now.getUTCDate(), 2);
  return `${y}${m}${d}`;
}

function productId() {
  return `prd_${randomUUID()}`;
}

function skuId() {
  return `sku_${randomUUID()}`;
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

router.post("/convert-selection", requireWriteActor, async (req, res, next) => {
  const opportunityId = String(req.body?.opportunityId || "").trim();
  const requestedSkuCount = Number(req.body?.skuCount ?? 1);
  const skuCount = Number.isInteger(requestedSkuCount) && requestedSkuCount > 0 && requestedSkuCount <= 99
    ? requestedSkuCount
    : null;

  if (!opportunityId) {
    return res.status(400).json({ error: "bad_request", message: "opportunityId is required." });
  }
  if (!skuCount) {
    return res.status(400).json({ error: "bad_request", message: "skuCount must be an integer from 1 to 99." });
  }

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

      let selectionCode = opportunity.selection_code;
      if (!selectionCode) {
        const seqResult = await client.query("SELECT nextval('public.aione_selection_code_seq') AS n");
        selectionCode = `SEL-${todayCode()}-${pad(seqResult.rows[0].n, 6)}`;
      }

      const productSeq = await client.query("SELECT nextval('public.aione_product_code_seq') AS n");
      const productCode = `MH${pad(productSeq.rows[0].n, 7)}`;
      const id = productId();

      const productData = {
        selectionCode,
        sourceTitle: opportunity.title,
        selectionMode: opportunity.selection_mode,
        qualificationData: opportunity.qualification_data || {},
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
          id,
          opportunity.id,
          opportunity.business_id,
          opportunity.category_id,
          opportunity.title,
          opportunity.owner_person_id || context.personId || null,
          opportunity.source_platform,
          opportunity.source_ref,
          opportunity.source_url,
          opportunity.supplier_ref,
          opportunity.estimated_cost,
          opportunity.currency || "JPY",
          productCode,
          JSON.stringify(productData),
          context.personId || null,
          context.sourceSystem || "aione"
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
            SET selection_code=$2,
                lifecycle_status='converted',
                metadata=COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('convertedProductId',$3,'convertedProductCode',$4),
                updated_at=NOW(),
                updated_by_person_id=$5,
                record_version=record_version+1
          WHERE id=$1`,
        [opportunity.id, selectionCode, id, productCode, context.personId || null]
      );

      await client.query(
        `INSERT INTO public.object_registry
          (id, object_type, object_id, canonical_table, display_name, lifecycle_status, business_id, owner_person_id, metadata, source_system)
         VALUES ($1,'product',$2,'products',$3,'draft',$4,$5,$6::jsonb,$7)
         ON CONFLICT (object_type, object_id) DO UPDATE
           SET display_name=EXCLUDED.display_name,
               lifecycle_status=EXCLUDED.lifecycle_status,
               business_id=EXCLUDED.business_id,
               owner_person_id=EXCLUDED.owner_person_id,
               metadata=EXCLUDED.metadata,
               updated_at=NOW()`,
        [
          `obj_${randomUUID()}`,
          id,
          opportunity.title,
          opportunity.business_id,
          opportunity.owner_person_id || context.personId || null,
          JSON.stringify({ productCode, selectionCode }),
          context.sourceSystem || "aione"
        ]
      );

      await recordBusinessEvent(client, {
        eventType: "selection.converted_to_product",
        objectType: "product",
        objectId: id,
        context,
        payload: { opportunityId: opportunity.id, selectionCode, productCode, skuCodes: skus.map((sku) => sku.sku_code) }
      });

      return { product: productResult.rows[0], skus, reused: false };
    });

    return res.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    return next(error);
  }
});

export default router;
