import pool from "../db.js";

const SET_ID = "dtset_socks_rakuten_base_v1";
const ITEM_ID = "dtsi_socks_rakuten_base_benefit_v1";
const TEMPLATE_ID = "dtpl_socks_rakuten_benefit_1000x1500_v1";

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

async function main() {
  const setResult = await pool.query(
    `SELECT * FROM public.design_template_sets
      WHERE id=$1 AND archived_at IS NULL LIMIT 1`,
    [SET_ID]
  );
  if (!setResult.rowCount) fail("Validator DesignTemplateSet is missing.");
  const set = setResult.rows[0];
  if (set.lifecycle_status !== "active") fail("Validator DesignTemplateSet is not active.", { status: set.lifecycle_status });
  if (set.category_scope !== "socks" || set.channel_scope !== "rakuten") {
    fail("Validator DesignTemplateSet scope is incorrect.", { categoryScope: set.category_scope, channelScope: set.channel_scope });
  }

  const itemResult = await pool.query(
    `SELECT i.*, t.lifecycle_status AS template_status, t.output_type,
            t.canvas_width, t.canvas_height
       FROM public.design_template_set_items i
       JOIN public.design_templates t ON t.id=i.template_id
      WHERE i.id=$1 AND i.archived_at IS NULL LIMIT 1`,
    [ITEM_ID]
  );
  if (!itemResult.rowCount) fail("Validator template-set page is missing.");
  const item = itemResult.rows[0];
  if (item.template_set_id !== SET_ID || item.template_id !== TEMPLATE_ID) {
    fail("Validator template-set page binding is incorrect.", { templateSetId: item.template_set_id, templateId: item.template_id });
  }
  if (item.template_status !== "active") fail("Referenced DesignTemplate is not active.", { status: item.template_status });
  if (item.output_type !== "benefit_feature_image") fail("Validator page output type is incorrect.", { outputType: item.output_type });
  if (Number(item.canvas_width) !== 1000 || Number(item.canvas_height) !== 1500) {
    fail("Validator page canvas is incorrect.", { width: item.canvas_width, height: item.canvas_height });
  }

  const bindings = item.asset_bindings && typeof item.asset_bindings === "object" ? item.asset_bindings : {};
  const preferredFolders = Array.isArray(bindings.preferredFolders) ? bindings.preferredFolders : [];
  const allowedCuratedFolders = new Set(["01_SKU图", "02_产品图", "03_实拍图"]);
  if (!preferredFolders.length || preferredFolders.some((folder) => !allowedCuratedFolders.has(folder))) {
    fail("Template-set asset binding violates CURRENT three-folder material contract.", { preferredFolders });
  }

  const columnResult = await pool.query(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema='public' AND table_name='design_tasks'
        AND column_name = ANY($1::text[])`,
    [["template_set_id", "template_set_item_id", "page_code", "page_no"]]
  );
  const columns = new Set(columnResult.rows.map((row) => row.column_name));
  for (const required of ["template_set_id", "template_set_item_id", "page_code", "page_no"]) {
    if (!columns.has(required)) fail("DesignTask template-set binding column is missing.", { required });
  }

  const pageCountResult = await pool.query(
    `SELECT COUNT(*)::int AS count
       FROM public.design_template_set_items
      WHERE template_set_id=$1 AND archived_at IS NULL`,
    [SET_ID]
  );
  if (Number(pageCountResult.rows[0]?.count) !== 1) {
    fail("First validator must remain a one-page template set until real acceptance passes.", { count: pageCountResult.rows[0]?.count });
  }

  process.stdout.write(`${JSON.stringify({
    contract: "AIONE Design Template Set V1",
    ok: true,
    templateSetId: SET_ID,
    pageCount: 1,
    pageCode: item.page_code,
    templateId: TEMPLATE_ID,
    outputType: item.output_type,
    canvas: `${item.canvas_width}x${item.canvas_height}`,
    preferredFolders,
    batchGeneration: false
  }, null, 2)}\n`);
  process.stdout.write("[AIONE] DESIGN TEMPLATE SET CURRENT ACCEPTANCE PASS\n");
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.code || "design_template_set_acceptance_failed",
    message: error.message,
    details: error.details || undefined
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
