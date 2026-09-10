function cleanText(value, maxLength = 4000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function listDesignTemplates(client, filters = {}) {
  const values = [];
  const where = ["archived_at IS NULL"];

  const categoryScope = cleanText(filters.categoryScope, 120);
  const channelScope = cleanText(filters.channelScope, 120);
  const lifecycleStatus = cleanText(filters.lifecycleStatus, 40);

  if (categoryScope) {
    values.push(categoryScope);
    where.push(`category_scope=$${values.length}`);
  }
  if (channelScope) {
    values.push(channelScope);
    where.push(`channel_scope=$${values.length}`);
  }
  if (lifecycleStatus) {
    values.push(lifecycleStatus);
    where.push(`lifecycle_status=$${values.length}`);
  }

  const result = await client.query(
    `SELECT * FROM public.design_templates
      WHERE ${where.join(" AND ")}
      ORDER BY template_code, version DESC`,
    values
  );
  return result.rows;
}

export async function getDesignTemplate(client, templateId) {
  const id = cleanText(templateId, 240);
  const result = await client.query(
    `SELECT * FROM public.design_templates
      WHERE id=$1 AND archived_at IS NULL
      LIMIT 1`,
    [id]
  );
  if (!result.rowCount) {
    const error = new Error("Design template not found.");
    error.statusCode = 404;
    error.code = "design_template_not_found";
    throw error;
  }
  return result.rows[0];
}
