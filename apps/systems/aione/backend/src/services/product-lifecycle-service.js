import { randomUUID } from "node:crypto";
import { withTransaction } from "../../db.js";
import { recordBusinessEvent } from "./event-service.js";

function pad(value, width) {
  return String(value).padStart(width, "0");
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

export async function selectProductOpportunity({ opportunityId, qualificationData = {}, context = {} }) {
  return withTransaction(async (client) => {
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

    const existing = current.rows[0];
    if (existing.lifecycle_status === "selected" || existing.lifecycle_status === "converted") {
      return { selection: existing, reused: true };
    }
    if (existing.lifecycle_status !== "pending") {
      const error = new Error(`Selection cannot be selected from status ${existing.lifecycle_status}.`);
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
      [opportunityId, JSON.stringify(qualificationData || {}), context.personId || null]
    );

    await recordBusinessEvent(client, {
      eventType: "selection.selected",
      objectType: "product_opportunity",
      objectId: opportunityId,
      context,
      payload: {
        selectionNo: updated.rows[0].selection_no,
        decisionEvidence: qualificationData?.decisionEvidence || null
      }
    });

    return { selection: updated.rows[0], reused: false };
  });
}

export async function convertProductOpportunityToProduct({ opportunityId, skuCount = 1, context = {} }) {
  if (!Number.isInteger(skuCount) || skuCount < 1 || skuCount > 99) {
    const error = new Error("skuCount must be an integer from 1 to 99.");
    error.statusCode = 400;
    error.code = "bad_request";
    throw error;
  }

  return withTransaction(async (client) => {
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
      payload: {
        opportunityId: opportunity.id,
        selectionNo: opportunity.selection_no,
        productCode,
        skuCodes: skus.map((sku) => sku.sku_code)
      }
    });

    return { product: productResult.rows[0], skus, reused: false };
  });
}
