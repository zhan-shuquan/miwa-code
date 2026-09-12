import { makeId, recordBusinessEvent } from "./event-service.js";
import { displayFact, readProductFact, resolveDesignProduct } from "./design-product-resolver.js";

const HERO_TEMPLATE_ID = "dtpl_unified_product_hero_square_v1";
const MODES = new Set(["flat_lay", "three_quarter", "source"]);
const STATUSES = new Set(["draft", "ready", "approved", "generated"]);

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeBinding(value = {}) {
  return {
    sourceFactPath: cleanText(value.sourceFactPath, 240),
    textOverride: cleanText(value.textOverride, 160),
    prefix: cleanText(value.prefix, 40),
    suffix: cleanText(value.suffix, 40)
  };
}

function resolveBinding(binding, productData) {
  const fact = binding.sourceFactPath ? displayFact(readProductFact(productData, binding.sourceFactPath)) : "";
  const body = fact || binding.textOverride || "";
  return {
    ...binding,
    resolvedText: body ? `${binding.prefix || ""}${body}${binding.suffix || ""}` : "",
    resolution: fact ? "product_truth" : binding.textOverride ? "presentation_override" : "missing"
  };
}

async function assertOwnedAssets(client, productId, assetIds) {
  const ids = [...new Set((assetIds || []).map((id) => cleanText(id, 240)).filter(Boolean))];
  if (!ids.length) return [];
  const result = await client.query(
    `SELECT id FROM public.product_assets
      WHERE product_id=$1 AND id = ANY($2::text[]) AND archived_at IS NULL`,
    [productId, ids]
  );
  if (result.rowCount !== ids.length) {
    const error = new Error("One or more hero assets do not belong to the Product.");
    error.statusCode = 409;
    error.code = "hero_asset_product_mismatch";
    throw error;
  }
  return ids;
}

async function assertPreset(client, presetId, kind, allowNull = true) {
  const id = cleanText(presetId, 240);
  if (!id && allowNull) return null;
  const result = await client.query(
    `SELECT id FROM public.design_instruction_presets
      WHERE id=$1 AND instruction_kind=$2 AND lifecycle_status='active' AND archived_at IS NULL LIMIT 1`,
    [id, kind]
  );
  if (!result.rowCount) {
    const error = new Error(`Active ${kind} preset was not found.`);
    error.statusCode = 409;
    error.code = "hero_instruction_preset_missing";
    throw error;
  }
  return id;
}

function resolveSpec(spec, product) {
  if (!spec) return null;
  return {
    ...spec,
    resolved_primary_selling_point: resolveBinding(spec.primary_selling_point_binding || {}, product.product_data || {}),
    resolved_secondary_selling_point: resolveBinding(spec.secondary_selling_point_binding || {}, product.product_data || {})
  };
}

export async function getProductHeroSpec(client, productRef) {
  const product = await resolveDesignProduct(client, productRef);
  const result = await client.query(
    `SELECT hs.*,
            lp.preset_code AS layout_preset_code,
            mp.preset_code AS model_preset_code,
            pp.preset_code AS product_display_preset_code
       FROM public.product_hero_specs hs
       LEFT JOIN public.design_instruction_presets lp ON lp.id=hs.layout_preset_id
       LEFT JOIN public.design_instruction_presets mp ON mp.id=hs.model_preset_id
       LEFT JOIN public.design_instruction_presets pp ON pp.id=hs.product_display_preset_id
      WHERE hs.product_id=$1 AND hs.archived_at IS NULL
      LIMIT 1`,
    [product.id]
  );
  return { product, heroSpec: resolveSpec(result.rows[0] || null, product) };
}

export async function upsertProductHeroSpec(client, { productRef, input = {}, context = {} }) {
  const product = await resolveDesignProduct(client, productRef);
  const displayMode = cleanText(input.productDisplayMode, 40) || "flat_lay";
  if (!MODES.has(displayMode)) {
    const error = new Error("Unsupported hero product display mode.");
    error.statusCode = 400;
    error.code = "hero_display_mode_invalid";
    throw error;
  }
  const lifecycleStatus = cleanText(input.lifecycleStatus, 40) || "draft";
  if (!STATUSES.has(lifecycleStatus)) {
    const error = new Error("Unsupported Hero Design Spec status.");
    error.statusCode = 400;
    error.code = "hero_spec_status_invalid";
    throw error;
  }

  const template = await client.query(
    `SELECT id FROM public.design_templates
      WHERE id=$1 AND lifecycle_status='active' AND archived_at IS NULL LIMIT 1`,
    [HERO_TEMPLATE_ID]
  );
  if (!template.rowCount) {
    const error = new Error("Unified square hero template is not active.");
    error.statusCode = 409;
    error.code = "unified_hero_template_missing";
    throw error;
  }

  const tagCardId = cleanText(input.tagCardId, 240) || null;
  if (tagCardId) {
    const card = await client.query(
      `SELECT id FROM public.product_tag_cards WHERE id=$1 AND product_id=$2 AND archived_at IS NULL LIMIT 1`,
      [tagCardId, product.id]
    );
    if (!card.rowCount) {
      const error = new Error("Hero Product Tag Card does not belong to the Product.");
      error.statusCode = 409;
      error.code = "hero_tag_card_product_mismatch";
      throw error;
    }
  }

  const layoutPresetId = await assertPreset(client, input.layoutPresetId || "dip_unified_hero_square_layout_v1", "hero_layout", false);
  const modelPresetId = await assertPreset(client, input.modelPresetId, "model_generation", true);
  const productDisplayPresetId = await assertPreset(client, input.productDisplayPresetId, "product_display", true);

  const modelAssetId = cleanText(input.modelAssetId, 240) || null;
  const productDisplayAssetId = cleanText(input.productDisplayAssetId, 240) || null;
  const skuAssetIds = await assertOwnedAssets(client, product.id, [
    ...(Array.isArray(input.skuAssetIds) ? input.skuAssetIds : []),
    modelAssetId,
    productDisplayAssetId
  ]);
  const skuOnlyIds = skuAssetIds.filter((id) => id !== modelAssetId && id !== productDisplayAssetId);

  const primaryBinding = normalizeBinding(input.primarySellingPointBinding || {});
  const secondaryBinding = normalizeBinding(input.secondarySellingPointBinding || {});

  const existing = await client.query(
    `SELECT id FROM public.product_hero_specs WHERE product_id=$1 AND archived_at IS NULL LIMIT 1 FOR UPDATE`,
    [product.id]
  );

  let result;
  if (existing.rowCount) {
    result = await client.query(
      `UPDATE public.product_hero_specs
          SET template_id=$2,
              tag_card_id=$3,
              layout_preset_id=$4,
              model_preset_id=$5,
              product_display_preset_id=$6,
              model_asset_id=$7,
              product_display_asset_id=$8,
              sku_asset_ids=$9::jsonb,
              product_display_mode=$10,
              primary_selling_point_binding=$11::jsonb,
              secondary_selling_point_binding=$12::jsonb,
              lifecycle_status=$13,
              updated_by_person_id=$14,
              updated_at=NOW(),
              record_version=record_version+1
        WHERE id=$1
        RETURNING *`,
      [
        existing.rows[0].id, HERO_TEMPLATE_ID, tagCardId, layoutPresetId, modelPresetId,
        productDisplayPresetId, modelAssetId, productDisplayAssetId, JSON.stringify(skuOnlyIds),
        displayMode, JSON.stringify(primaryBinding), JSON.stringify(secondaryBinding), lifecycleStatus,
        context.personId || null
      ]
    );
  } else {
    result = await client.query(
      `INSERT INTO public.product_hero_specs
        (id, product_id, template_id, tag_card_id, layout_preset_id, model_preset_id,
         product_display_preset_id, model_asset_id, product_display_asset_id, sku_asset_ids,
         product_display_mode, primary_selling_point_binding, secondary_selling_point_binding,
         lifecycle_status, created_by_person_id, updated_by_person_id, source_system)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb,$13::jsonb,$14,$15,$15,$16)
       RETURNING *`,
      [
        makeId("herospec"), product.id, HERO_TEMPLATE_ID, tagCardId, layoutPresetId, modelPresetId,
        productDisplayPresetId, modelAssetId, productDisplayAssetId, JSON.stringify(skuOnlyIds),
        displayMode, JSON.stringify(primaryBinding), JSON.stringify(secondaryBinding), lifecycleStatus,
        context.personId || null, context.sourceSystem || "aione-web"
      ]
    );
  }

  await recordBusinessEvent(client, {
    eventType: "product.hero_spec_updated",
    objectType: "product",
    objectId: product.id,
    context,
    payload: { heroSpecId: result.rows[0].id, templateId: HERO_TEMPLATE_ID, lifecycleStatus }
  });

  return { product, heroSpec: resolveSpec(result.rows[0], product) };
}

export async function listInstructionPresets(client, filters = {}) {
  const values = [];
  const where = ["archived_at IS NULL", "lifecycle_status='active'"];
  for (const [column, value] of [
    ["instruction_kind", filters.instructionKind],
    ["category_scope", filters.categoryScope]
  ]) {
    const cleaned = cleanText(value, 120);
    if (cleaned) {
      values.push(cleaned);
      where.push(`(${column}=$${values.length} OR ${column} IS NULL)`);
    }
  }
  const result = await client.query(
    `SELECT * FROM public.design_instruction_presets
      WHERE ${where.join(" AND ")}
      ORDER BY instruction_kind, category_scope NULLS FIRST, preset_code, version DESC`,
    values
  );
  return result.rows;
}
