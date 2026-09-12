import pool from "../db.js";
import { confirmProductMaterial } from "../src/services/product-material-confirmation-service.js";
import { createDesignTaskFromTemplateSetPage } from "../src/services/design-template-set-task-service.js";

const SET_ID = "dtset_socks_rakuten_base_v1";
const ITEM_ID = "dtsi_socks_rakuten_base_benefit_v1";
const TEMPLATE_ID = "dtpl_socks_rakuten_benefit_1000x1500_v1";
const FIXTURE_PRODUCT_ID = "prd_template_set_acceptance";
const FIXTURE_PRODUCT_CODE = "MH9900096";
const FIXTURE_PERSON_ID = "person_template_set_acceptance";

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

async function assertTemplateSetContract(client) {
  const setResult = await client.query(
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

  const itemResult = await client.query(
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

  const pageCountResult = await client.query(
    `SELECT COUNT(*)::int AS count
       FROM public.design_template_set_items
      WHERE template_set_id=$1 AND archived_at IS NULL`,
    [SET_ID]
  );
  if (Number(pageCountResult.rows[0]?.count) !== 1) {
    fail("First validator must remain a one-page template set until real acceptance passes.", { count: pageCountResult.rows[0]?.count });
  }
  return { set, item, preferredFolders };
}

async function insertFixture(client) {
  await client.query(
    `INSERT INTO public.products
      (id, name, lifecycle_status, product_code, product_data, readiness_data, metadata, source_system)
     VALUES ($1,$2,'draft',$3,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'aione-template-set-acceptance')`,
    [FIXTURE_PRODUCT_ID, "Template Set Acceptance Socks", FIXTURE_PRODUCT_CODE]
  );
  await client.query(
    `INSERT INTO public.product_skus
      (id, product_id, sku_code, sku_no, name, lifecycle_status, sku_data, metadata, source_system)
     VALUES ($1,$2,$3,1,$4,'active','{}'::jsonb,'{}'::jsonb,'aione-template-set-acceptance')`,
    ["sku_template_set_acceptance_01", FIXTURE_PRODUCT_ID, `${FIXTURE_PRODUCT_CODE}-01`, "Acceptance SKU"]
  );

  const assets = [
    ["ast_template_set_acceptance_sku", 1, "source_sku_image", "SKU图-1.jpg", `${FIXTURE_PRODUCT_CODE}_01.jpg`, "01_SKU图"],
    ["ast_template_set_acceptance_main", 2, "source_main_image", "主图-1.jpg", `${FIXTURE_PRODUCT_CODE}_02.jpg`, "02_产品图"],
    ["ast_template_set_acceptance_detail", 3, "source_detail_image", "详情图-1.jpg", `${FIXTURE_PRODUCT_CODE}_03.jpg`, "02_产品图"]
  ];
  for (const [id, assetNo, assetRole, originalName, canonicalName, sourceFolder] of assets) {
    await client.query(
      `INSERT INTO public.product_assets
        (id, product_id, asset_no, asset_type, asset_role, source_provider, original_name,
         canonical_name, mime_type, lifecycle_status, metadata, source_system)
       VALUES ($1,$2,$3,'image',$4,'controlled-ci',$5,$6,'image/jpeg','formalized',$7::jsonb,'aione-template-set-acceptance')`,
      [id, FIXTURE_PRODUCT_ID, assetNo, assetRole, originalName, canonicalName, JSON.stringify({ layer: "SOURCE", sourceFolder })]
    );
  }
  return assets.map(([id]) => id);
}

async function proveTaskCreation(client) {
  const allAssetIds = await insertFixture(client);
  const context = {
    personId: FIXTURE_PERSON_ID,
    actorKind: "human",
    sourceSystem: "aione-template-set-acceptance",
    correlationId: "template-set-gate-b"
  };
  const confirmed = await confirmProductMaterial(client, {
    productId: FIXTURE_PRODUCT_ID,
    assetIds: allAssetIds,
    metadata: { acceptance: true },
    context
  });
  if (!confirmed?.confirmation || confirmed.confirmation.status !== "confirmed") {
    fail("Controlled Product material confirmation did not succeed.");
  }

  const designAssetIds = [
    "ast_template_set_acceptance_main",
    "ast_template_set_acceptance_detail"
  ];
  const request = {
    productId: FIXTURE_PRODUCT_ID,
    templateSetItemId: ITEM_ID,
    inputAssetIds: designAssetIds,
    inputFactSnapshot: {
      category: "socks",
      targetChannel: "rakuten",
      validationPurpose: "template-set-gate-b"
    },
    instructionSnapshot: {
      prompt: "Controlled acceptance only. Preserve SOURCE product truth."
    },
    context
  };
  const first = await createDesignTaskFromTemplateSetPage(client, request);
  if (!first?.task) fail("Template-set task creation returned no DesignTask.");
  if (first.task.template_set_id !== SET_ID || first.task.template_set_item_id !== ITEM_ID) {
    fail("Created DesignTask lost Template Set/Page identity.", {
      templateSetId: first.task.template_set_id,
      templateSetItemId: first.task.template_set_item_id
    });
  }
  if (first.task.template_id !== TEMPLATE_ID || first.task.page_code !== "benefit-01" || Number(first.task.page_no) !== 1) {
    fail("Created DesignTask page/template binding is incorrect.", {
      templateId: first.task.template_id,
      pageCode: first.task.page_code,
      pageNo: first.task.page_no
    });
  }
  if (first.task.material_confirmation_id !== confirmed.confirmation.id) {
    fail("Created DesignTask is not bound to the confirmed Product material snapshot.");
  }

  const second = await createDesignTaskFromTemplateSetPage(client, request);
  if (!second.reused || second.task.id !== first.task.id) {
    fail("Idempotent Template Set/Page task creation was not reused.", {
      firstTaskId: first.task.id,
      secondTaskId: second.task?.id,
      reused: second.reused
    });
  }

  return {
    taskId: first.task.id,
    materialConfirmationId: confirmed.confirmation.id,
    assetIds: designAssetIds,
    idempotentReuse: true
  };
}

async function main() {
  const client = await pool.connect();
  let summary;
  try {
    await client.query("BEGIN");
    const contract = await assertTemplateSetContract(client);
    const taskProof = await proveTaskCreation(client);
    summary = {
      contract: "AIONE Design Template Set V1",
      ok: true,
      gateA: "template-set-schema-and-contract-pass",
      gateB: "selected-template-set-page-to-design-task-pass",
      templateSetId: SET_ID,
      pageCount: 1,
      pageCode: contract.item.page_code,
      templateId: TEMPLATE_ID,
      outputType: contract.item.output_type,
      canvas: `${contract.item.canvas_width}x${contract.item.canvas_height}`,
      preferredFolders: contract.preferredFolders,
      curatedFolderContract: ["01_SKU图", "02_产品图", "03_实拍图"],
      taskProof,
      batchGeneration: false,
      fixturePersisted: false
    };
    await client.query("ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write("[AIONE] DESIGN TEMPLATE SET GATE A/B ACCEPTANCE PASS\n");
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
