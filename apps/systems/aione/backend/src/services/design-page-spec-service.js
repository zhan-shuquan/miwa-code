import { makeId, recordBusinessEvent } from "./event-service.js";
import { resolveDesignProduct } from "./design-product-resolver.js";

const STATUSES = new Set(["draft", "ready", "approved", "generated"]);

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeArray(value) {
  return Array.isArray(value) ? [...new Set(value.map((item) => cleanText(item, 240)).filter(Boolean))] : [];
}

async function assertTemplate(client, templateId) {
  const id = cleanText(templateId, 240);
  const result = await client.query(
    `SELECT id, template_code, output_type, lifecycle_status
       FROM public.design_templates
      WHERE id=$1 AND archived_at IS NULL
      LIMIT 1`,
    [id]
  );
  if (!result.rowCount || result.rows[0].lifecycle_status !== "active") {
    const error = new Error("Active Design Template was not found.");
    error.statusCode = 409;
    error.code = "design_page_template_missing";
    throw error;
  }
  return result.rows[0];
}

async function assertOwnedAssets(client, productId, assetIds) {
  const ids = normalizeArray(assetIds);
  if (!ids.length) return [];
  const result = await client.query(
    `SELECT id FROM public.product_assets
      WHERE product_id=$1 AND id=ANY($2::text[]) AND archived_at IS NULL`,
    [productId, ids]
  );
  if (result.rowCount !== ids.length) {
    const error = new Error("One or more page assets do not belong to the Product.");
    error.statusCode = 409;
    error.code = "design_page_asset_product_mismatch";
    throw error;
  }
  return ids;
}

export async function getProductDesignPageSpec(client, { productRef, pageType }) {
  const product = await resolveDesignProduct(client, productRef);
  const type = cleanText(pageType, 80);
  const result = await client.query(
    `SELECT ps.*, dt.template_code, dt.name AS template_name, dt.output_type, dt.canvas_width, dt.canvas_height
       FROM public.product_design_page_specs ps
       JOIN public.design_templates dt ON dt.id=ps.template_id
      WHERE ps.product_id=$1 AND ps.page_type=$2 AND ps.archived_at IS NULL
      LIMIT 1`,
    [product.id, type]
  );
  return { product, pageSpec: result.rows[0] || null };
}

export async function upsertProductDesignPageSpec(client, { productRef, pageType, input = {}, context = {} }) {
  const product = await resolveDesignProduct(client, productRef);
  const type = cleanText(pageType, 80);
  if (!type) {
    const error = new Error("pageType is required.");
    error.statusCode = 400;
    error.code = "design_page_type_required";
    throw error;
  }

  const template = await assertTemplate(client, input.templateId);
  const lifecycleStatus = cleanText(input.lifecycleStatus, 40) || "draft";
  if (!STATUSES.has(lifecycleStatus)) {
    const error = new Error("Unsupported Design Page Spec status.");
    error.statusCode = 400;
    error.code = "design_page_status_invalid";
    throw error;
  }

  const assetIds = await assertOwnedAssets(client, product.id, input.assetIds);
  const fieldBindings = normalizeObject(input.fieldBindings);
  const layoutAdjustments = normalizeObject(input.layoutAdjustments);
  const presentation = normalizeObject(input.presentation);
  const metadata = normalizeObject(input.metadata);

  const existing = await client.query(
    `SELECT id FROM public.product_design_page_specs
      WHERE product_id=$1 AND page_type=$2 AND archived_at IS NULL
      LIMIT 1 FOR UPDATE`,
    [product.id, type]
  );

  let result;
  if (existing.rowCount) {
    result = await client.query(
      `UPDATE public.product_design_page_specs
          SET template_id=$2,
              field_bindings=$3::jsonb,
              asset_ids=$4::jsonb,
              layout_adjustments=$5::jsonb,
              presentation=$6::jsonb,
              lifecycle_status=$7,
              metadata=$8::jsonb,
              updated_by_person_id=$9,
              updated_at=NOW(),
              record_version=record_version+1
        WHERE id=$1
        RETURNING *`,
      [existing.rows[0].id, template.id, JSON.stringify(fieldBindings), JSON.stringify(assetIds), JSON.stringify(layoutAdjustments), JSON.stringify(presentation), lifecycleStatus, JSON.stringify(metadata), context.personId || null]
    );
  } else {
    result = await client.query(
      `INSERT INTO public.product_design_page_specs
        (id, product_id, page_type, template_id, field_bindings, asset_ids, layout_adjustments, presentation,
         lifecycle_status, metadata, created_by_person_id, updated_by_person_id, source_system)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10::jsonb,$11,$11,$12)
       RETURNING *`,
      [makeId("pagespec"), product.id, type, template.id, JSON.stringify(fieldBindings), JSON.stringify(assetIds), JSON.stringify(layoutAdjustments), JSON.stringify(presentation), lifecycleStatus, JSON.stringify(metadata), context.personId || null, context.sourceSystem || "aione-web"]
    );
  }

  await recordBusinessEvent(client, {
    eventType: "product.design_page_spec_updated",
    objectType: "product",
    objectId: product.id,
    context,
    payload: { pageSpecId: result.rows[0].id, pageType: type, templateId: template.id, lifecycleStatus }
  });

  return { product, pageSpec: result.rows[0] };
}
