import { makeId, recordBusinessEvent } from "./event-service.js";

function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeAdjustments(value = {}) {
  const number = (key, fallback, min, max) => {
    const parsed = Number(value?.[key]);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  };
  return {
    modelScale: number("modelScale", 100, 60, 160),
    modelOffsetX: number("modelOffsetX", 0, -30, 30),
    modelOffsetY: number("modelOffsetY", 0, -30, 30),
    tagScale: number("tagScale", 100, 60, 150),
    tagOffsetX: number("tagOffsetX", 0, -30, 30),
    tagOffsetY: number("tagOffsetY", 0, -30, 30),
    productScale: number("productScale", 100, 60, 160),
    productOffsetX: number("productOffsetX", 0, -30, 30),
    productOffsetY: number("productOffsetY", 0, -30, 30),
    primaryScale: number("primaryScale", 100, 60, 160),
    primaryOffsetX: number("primaryOffsetX", 0, -30, 30),
    primaryOffsetY: number("primaryOffsetY", 0, -30, 30),
    secondaryOffsetX: number("secondaryOffsetX", 0, -30, 30),
    secondaryOffsetY: number("secondaryOffsetY", 0, -30, 30)
  };
}

export async function listDesignLayoutTemplates(client, filters = {}) {
  const values = [];
  const where = ["archived_at IS NULL", "lifecycle_status='active'"];
  for (const [column, value] of [["page_type", filters.pageType], ["category_scope", filters.categoryScope], ["channel_scope", filters.channelScope]]) {
    const cleaned = cleanText(value, 120);
    if (cleaned) {
      values.push(cleaned);
      where.push(`(${column}=$${values.length} OR ${column} IS NULL)`);
    }
  }
  const result = await client.query(
    `SELECT * FROM public.design_layout_templates WHERE ${where.join(" AND ")} ORDER BY category_scope NULLS FIRST, updated_at DESC`,
    values
  );
  return result.rows;
}

export async function createDesignLayoutTemplate(client, { input = {}, context = {} }) {
  const name = cleanText(input.name, 160);
  const templateCode = cleanText(input.templateCode, 160).toUpperCase().replace(/[^A-Z0-9_-]+/g, "-");
  if (!name || !templateCode) {
    const error = new Error("Layout template name and code are required.");
    error.statusCode = 400;
    error.code = "layout_template_identity_required";
    throw error;
  }
  const adjustments = normalizeAdjustments(input.layoutAdjustments || {});
  const result = await client.query(
    `INSERT INTO public.design_layout_templates
      (id, template_code, name, version, page_type, category_scope, channel_scope, layout_adjustments,
       source_hero_spec_id, lifecycle_status, metadata, created_by_person_id, updated_by_person_id, source_system)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,'active',$10::jsonb,$11,$11,$12)
     ON CONFLICT (template_code, version) DO UPDATE SET
       name=EXCLUDED.name,
       category_scope=EXCLUDED.category_scope,
       channel_scope=EXCLUDED.channel_scope,
       layout_adjustments=EXCLUDED.layout_adjustments,
       source_hero_spec_id=EXCLUDED.source_hero_spec_id,
       metadata=EXCLUDED.metadata,
       updated_by_person_id=EXCLUDED.updated_by_person_id,
       updated_at=NOW(),
       record_version=public.design_layout_templates.record_version+1
     RETURNING *`,
    [
      makeId("layouttpl"), templateCode, name, cleanText(input.version, 40) || "1.0",
      cleanText(input.pageType, 80) || "hero", cleanText(input.categoryScope, 120) || null,
      cleanText(input.channelScope, 120) || null, JSON.stringify(adjustments), cleanText(input.sourceHeroSpecId, 240) || null,
      JSON.stringify(input.metadata && typeof input.metadata === "object" ? input.metadata : {}),
      context.personId || null, context.sourceSystem || "aione-web"
    ]
  );

  await recordBusinessEvent(client, {
    eventType: "design.layout_template_saved",
    objectType: "design_layout_template",
    objectId: result.rows[0].id,
    context,
    payload: { templateCode, name, categoryScope: result.rows[0].category_scope }
  });

  return result.rows[0];
}
