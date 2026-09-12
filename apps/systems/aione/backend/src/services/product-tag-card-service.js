import { makeId, recordBusinessEvent } from "./event-service.js";
import { displayFact, readProductFact, resolveDesignProduct } from "./design-product-resolver.js";

const SLOT_TYPES = new Set(["feature", "setCount", "size", "material", "style", "custom"]);
const STATUSES = new Set(["draft", "confirmed", "generated"]);

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeSlot(slot = {}) {
  const type = cleanText(slot.type, 40) || "custom";
  if (!SLOT_TYPES.has(type)) {
    const error = new Error(`Unsupported tag-card slot type: ${type}`);
    error.statusCode = 400;
    error.code = "tag_card_slot_type_invalid";
    throw error;
  }
  return {
    type,
    sourceFactPath: cleanText(slot.sourceFactPath, 240),
    textOverride: cleanText(slot.textOverride, 160),
    prefix: cleanText(slot.prefix, 40),
    suffix: cleanText(slot.suffix, 40),
    iconCode: cleanText(slot.iconCode, 80),
    visible: slot.visible !== false
  };
}

function normalizeSlots(value) {
  if (!Array.isArray(value) || value.length !== 4) {
    const error = new Error("Product Tag Card requires exactly four slots.");
    error.statusCode = 400;
    error.code = "tag_card_four_slots_required";
    throw error;
  }
  return value.map(normalizeSlot);
}

function resolveSlot(slot, productData) {
  if (!slot.visible) return { ...slot, resolvedText: "", resolution: "hidden" };
  const factValue = slot.sourceFactPath ? readProductFact(productData, slot.sourceFactPath) : undefined;
  const factText = displayFact(factValue);
  const body = factText || slot.textOverride || "";
  return {
    ...slot,
    resolvedText: body ? `${slot.prefix || ""}${body}${slot.suffix || ""}` : "",
    resolution: factText ? "product_truth" : slot.textOverride ? "presentation_override" : "missing"
  };
}

function resolveCard(card, product) {
  if (!card) return null;
  return {
    ...card,
    resolved_slots: (Array.isArray(card.slots) ? card.slots : []).map((slot) => resolveSlot(slot, product.product_data || {}))
  };
}

export async function getProductTagCard(client, productRef) {
  const product = await resolveDesignProduct(client, productRef);
  const result = await client.query(
    `SELECT tc.*, p.preset_code AS template_preset_code, p.name AS template_preset_name
       FROM public.product_tag_cards tc
       LEFT JOIN public.design_instruction_presets p ON p.id=tc.template_preset_id
      WHERE tc.product_id=$1 AND tc.archived_at IS NULL
      LIMIT 1`,
    [product.id]
  );
  return { product, tagCard: resolveCard(result.rows[0] || null, product) };
}

export async function upsertProductTagCard(client, { productRef, input = {}, context = {} }) {
  const product = await resolveDesignProduct(client, productRef);
  const slots = normalizeSlots(input.slots);
  const lifecycleStatus = cleanText(input.lifecycleStatus, 40) || "draft";
  if (!STATUSES.has(lifecycleStatus)) {
    const error = new Error("Unsupported Product Tag Card status.");
    error.statusCode = 400;
    error.code = "tag_card_status_invalid";
    throw error;
  }

  const templatePresetId = cleanText(input.templatePresetId, 240) || "dip_miwa_product_tag_card_v1";
  const preset = await client.query(
    `SELECT id FROM public.design_instruction_presets
      WHERE id=$1 AND instruction_kind='tag_card' AND lifecycle_status='active' AND archived_at IS NULL
      LIMIT 1`,
    [templatePresetId]
  );
  if (!preset.rowCount) {
    const error = new Error("Active tag-card preset was not found.");
    error.statusCode = 409;
    error.code = "tag_card_preset_missing";
    throw error;
  }

  const values = {
    brandNameEn: cleanText(input.brandNameEn, 120),
    brandSublineEn: cleanText(input.brandSublineEn, 160),
    brandSloganJa: cleanText(input.brandSloganJa, 160),
    colorTheme: cleanText(input.colorTheme, 80) || "neutral",
    usageScopes: Array.isArray(input.usageScopes)
      ? [...new Set(input.usageScopes.map((item) => cleanText(item, 40)).filter(Boolean))].slice(0, 10)
      : ["hero", "packaging"]
  };

  const existing = await client.query(
    `SELECT id FROM public.product_tag_cards WHERE product_id=$1 AND archived_at IS NULL LIMIT 1 FOR UPDATE`,
    [product.id]
  );

  let result;
  if (existing.rowCount) {
    result = await client.query(
      `UPDATE public.product_tag_cards
          SET template_preset_id=$2,
              brand_name_en=$3,
              brand_subline_en=$4,
              slots=$5::jsonb,
              brand_slogan_ja=$6,
              color_theme=$7,
              usage_scopes=$8::jsonb,
              lifecycle_status=$9,
              updated_by_person_id=$10,
              updated_at=NOW(),
              record_version=record_version+1
        WHERE id=$1
        RETURNING *`,
      [
        existing.rows[0].id,
        templatePresetId,
        values.brandNameEn,
        values.brandSublineEn,
        JSON.stringify(slots),
        values.brandSloganJa,
        values.colorTheme,
        JSON.stringify(values.usageScopes),
        lifecycleStatus,
        context.personId || null
      ]
    );
  } else {
    result = await client.query(
      `INSERT INTO public.product_tag_cards
        (id, product_id, template_preset_id, brand_name_en, brand_subline_en, slots,
         brand_slogan_ja, color_theme, usage_scopes, lifecycle_status,
         created_by_person_id, updated_by_person_id, source_system)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9::jsonb,$10,$11,$11,$12)
       RETURNING *`,
      [
        makeId("tagcard"),
        product.id,
        templatePresetId,
        values.brandNameEn,
        values.brandSublineEn,
        JSON.stringify(slots),
        values.brandSloganJa,
        values.colorTheme,
        JSON.stringify(values.usageScopes),
        lifecycleStatus,
        context.personId || null,
        context.sourceSystem || "aione-web"
      ]
    );
  }

  await recordBusinessEvent(client, {
    eventType: "product.design_tag_card_updated",
    objectType: "product",
    objectId: product.id,
    context,
    payload: { tagCardId: result.rows[0].id, lifecycleStatus, slotCount: 4 }
  });

  return { product, tagCard: resolveCard(result.rows[0], product) };
}
