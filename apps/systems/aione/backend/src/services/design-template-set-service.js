function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeOptional(value, maxLength = 120) {
  const normalized = cleanText(value, maxLength);
  return normalized || null;
}

export async function listDesignTemplateSets(client, filters = {}) {
  const values = [];
  const where = ["s.archived_at IS NULL"];
  const categoryScope = normalizeOptional(filters.categoryScope);
  const channelScope = normalizeOptional(filters.channelScope);
  const lifecycleStatus = normalizeOptional(filters.lifecycleStatus, 40);

  if (categoryScope) {
    values.push(categoryScope);
    where.push(`s.category_scope=$${values.length}`);
  }
  if (channelScope) {
    values.push(channelScope);
    where.push(`s.channel_scope=$${values.length}`);
  }
  if (lifecycleStatus) {
    values.push(lifecycleStatus);
    where.push(`s.lifecycle_status=$${values.length}`);
  }

  const result = await client.query(
    `SELECT s.*,
            COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'id', i.id,
                  'pageNo', i.page_no,
                  'pageCode', i.page_code,
                  'pageName', i.page_name,
                  'required', i.required,
                  'defaultEnabled', i.default_enabled,
                  'templateId', i.template_id,
                  'fieldBindings', i.field_bindings,
                  'assetBindings', i.asset_bindings,
                  'instructionDefaults', i.instruction_defaults,
                  'templateCode', t.template_code,
                  'templateName', t.name,
                  'templateVersion', t.version,
                  'outputType', t.output_type,
                  'canvasWidth', t.canvas_width,
                  'canvasHeight', t.canvas_height
                ) ORDER BY i.page_no
              ) FILTER (WHERE i.id IS NOT NULL),
              '[]'::jsonb
            ) AS pages
       FROM public.design_template_sets s
       LEFT JOIN public.design_template_set_items i
         ON i.template_set_id=s.id AND i.archived_at IS NULL
       LEFT JOIN public.design_templates t
         ON t.id=i.template_id AND t.archived_at IS NULL
      WHERE ${where.join(" AND ")}
      GROUP BY s.id
      ORDER BY s.set_code, s.version DESC`,
    values
  );
  return result.rows;
}

export async function getDesignTemplateSet(client, templateSetId) {
  const id = cleanText(templateSetId, 240);
  const result = await client.query(
    `SELECT s.*,
            COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'id', i.id,
                  'pageNo', i.page_no,
                  'pageCode', i.page_code,
                  'pageName', i.page_name,
                  'required', i.required,
                  'defaultEnabled', i.default_enabled,
                  'templateId', i.template_id,
                  'fieldBindings', i.field_bindings,
                  'assetBindings', i.asset_bindings,
                  'instructionDefaults', i.instruction_defaults,
                  'templateCode', t.template_code,
                  'templateName', t.name,
                  'templateVersion', t.version,
                  'outputType', t.output_type,
                  'canvasWidth', t.canvas_width,
                  'canvasHeight', t.canvas_height,
                  'requiredSourceRoles', t.required_source_roles,
                  'requiredProductFacts', t.required_product_facts,
                  'validationRules', t.validation_rules
                ) ORDER BY i.page_no
              ) FILTER (WHERE i.id IS NOT NULL),
              '[]'::jsonb
            ) AS pages
       FROM public.design_template_sets s
       LEFT JOIN public.design_template_set_items i
         ON i.template_set_id=s.id AND i.archived_at IS NULL
       LEFT JOIN public.design_templates t
         ON t.id=i.template_id AND t.archived_at IS NULL
      WHERE s.id=$1 AND s.archived_at IS NULL
      GROUP BY s.id
      LIMIT 1`,
    [id]
  );
  if (!result.rowCount) {
    const error = new Error("Design template set not found.");
    error.statusCode = 404;
    error.code = "design_template_set_not_found";
    throw error;
  }
  return result.rows[0];
}

export async function getDesignTemplateSetItem(client, templateSetItemId) {
  const id = cleanText(templateSetItemId, 240);
  const result = await client.query(
    `SELECT i.*, s.set_code, s.name AS template_set_name, s.version AS template_set_version,
            s.category_scope AS template_set_category_scope,
            s.channel_scope AS template_set_channel_scope,
            s.lifecycle_status AS template_set_status,
            t.template_code, t.name AS template_name, t.version AS template_version,
            t.output_type, t.canvas_width, t.canvas_height, t.lifecycle_status AS template_status
       FROM public.design_template_set_items i
       JOIN public.design_template_sets s ON s.id=i.template_set_id
       JOIN public.design_templates t ON t.id=i.template_id
      WHERE i.id=$1
        AND i.archived_at IS NULL
        AND s.archived_at IS NULL
        AND t.archived_at IS NULL
      LIMIT 1`,
    [id]
  );
  if (!result.rowCount) {
    const error = new Error("Design template set page not found.");
    error.statusCode = 404;
    error.code = "design_template_set_item_not_found";
    throw error;
  }
  return result.rows[0];
}

export function assertTemplateSetItemExecutable(item) {
  if (!item || item.template_set_status !== "active") {
    const error = new Error("Design template set must be active before task creation.");
    error.statusCode = 409;
    error.code = "design_template_set_not_active";
    throw error;
  }
  if (item.template_status !== "active") {
    const error = new Error("Design template page must reference an active DesignTemplate.");
    error.statusCode = 409;
    error.code = "design_template_not_active";
    throw error;
  }
  return item;
}
