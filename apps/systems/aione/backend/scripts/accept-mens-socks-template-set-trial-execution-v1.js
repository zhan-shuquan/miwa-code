import pool from "../db.js";
import { confirmProductMaterial } from "../src/services/product-material-confirmation-service.js";
import { createDesignTaskFromTemplateSetPage } from "../src/services/design-template-set-task-service.js";

const SET_ID = "dtset_mens_socks_rakuten_detail_v1";
const PRODUCT_ID = "prd_mens_socks_trial_acceptance";
const PRODUCT_CODE = "MH9900098";
const PERSON_ID = "person_mens_socks_trial_acceptance";

const PAGE_CASES = [
  {
    itemId: "dtsi_mens_socks_hero_01_v1",
    pageNo: 1,
    pageCode: "MS-HERO-01",
    assets: ["ast_ms_trial_sku", "ast_ms_trial_wear"],
    facts: {
      setCount: 5,
      actualVariants: ["navy", "gray", "brown", "olive", "ivory"],
      approvedPrimaryValue: "verified trial value"
    }
  },
  {
    itemId: "dtsi_mens_socks_reason1_04_v1",
    pageNo: 4,
    pageCode: "MS-REASON1-04",
    assets: ["ast_ms_trial_wear", "ast_ms_trial_detail"],
    facts: {
      sellingPoints: ["verified knit construction"]
    }
  },
  {
    itemId: "dtsi_mens_socks_size_12_v1",
    pageNo: 12,
    pageCode: "MS-SIZE-12",
    assets: ["ast_ms_trial_flat"],
    facts: {
      supportedSize: "24-27cm",
      measurements: {
        height: "20cm",
        sole: "23cm"
      }
    }
  }
];

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

async function insertFixture(client) {
  await client.query(
    `INSERT INTO public.products
      (id, name, lifecycle_status, product_code, product_data, readiness_data, metadata, source_system)
     VALUES ($1,$2,'draft',$3,'{}'::jsonb,'{}'::jsonb,$4::jsonb,'aione-mens-socks-trial-acceptance')`,
    [PRODUCT_ID, "Men Socks Trial Acceptance", PRODUCT_CODE, JSON.stringify({ acceptanceOnly: true })]
  );
  await client.query(
    `INSERT INTO public.product_skus
      (id, product_id, sku_code, sku_no, name, lifecycle_status, sku_data, metadata, source_system)
     VALUES ($1,$2,$3,1,$4,'active','{}'::jsonb,'{}'::jsonb,'aione-mens-socks-trial-acceptance')`,
    ["sku_ms_trial_01", PRODUCT_ID, `${PRODUCT_CODE}-01`, "Trial SKU"]
  );

  const assets = [
    ["ast_ms_trial_sku", 1, "source_sku_image", "sku.jpg", `${PRODUCT_CODE}_SKU.jpg`, "01_SKU图"],
    ["ast_ms_trial_wear", 2, "source_main_image", "wear.jpg", `${PRODUCT_CODE}_WEAR.jpg`, "03_实拍图"],
    ["ast_ms_trial_detail", 3, "source_detail_image", "detail.jpg", `${PRODUCT_CODE}_DETAIL.jpg`, "02_产品图"],
    ["ast_ms_trial_flat", 4, "source_detail_image", "flat.jpg", `${PRODUCT_CODE}_FLAT.jpg`, "02_产品图"]
  ];

  for (const [id, assetNo, assetRole, originalName, canonicalName, sourceFolder] of assets) {
    await client.query(
      `INSERT INTO public.product_assets
        (id, product_id, asset_no, asset_type, asset_role, source_provider, original_name,
         canonical_name, mime_type, lifecycle_status, metadata, source_system)
       VALUES ($1,$2,$3,'image',$4,'controlled-ci',$5,$6,'image/jpeg','formalized',$7::jsonb,'aione-mens-socks-trial-acceptance')`,
      [id, PRODUCT_ID, assetNo, assetRole, originalName, canonicalName, JSON.stringify({ layer: "SOURCE", sourceFolder })]
    );
  }
  return assets.map(([id]) => id);
}

async function temporarilyActivateTrialFoundation(client) {
  await client.query(
    `UPDATE public.design_template_sets
        SET lifecycle_status='active'
      WHERE id=$1`,
    [SET_ID]
  );
  await client.query(
    `UPDATE public.design_templates
        SET lifecycle_status='active'
      WHERE id IN (
        'dtpl_mens_socks_rakuten_hero_v1',
        'dtpl_mens_socks_rakuten_reason1_v1',
        'dtpl_mens_socks_rakuten_size_v1'
      )`
  );
}

async function main() {
  const client = await pool.connect();
  let summary;
  try {
    await client.query("BEGIN");
    const allAssetIds = await insertFixture(client);
    const context = {
      personId: PERSON_ID,
      actorKind: "human",
      sourceSystem: "aione-mens-socks-trial-acceptance",
      correlationId: "mens-socks-trial-three-gate-b"
    };

    const confirmed = await confirmProductMaterial(client, {
      productId: PRODUCT_ID,
      assetIds: allAssetIds,
      metadata: { acceptance: true, templateSetId: SET_ID },
      context
    });
    if (confirmed?.confirmation?.status !== "confirmed") {
      fail("Mens-socks trial material confirmation did not succeed.");
    }

    await temporarilyActivateTrialFoundation(client);

    const createdTasks = [];
    for (const page of PAGE_CASES) {
      const request = {
        productId: PRODUCT_ID,
        templateSetItemId: page.itemId,
        inputAssetIds: page.assets,
        inputFactSnapshot: page.facts,
        instructionSnapshot: {
          prompt: "Controlled trial-path acceptance only. Preserve SOURCE product truth.",
          acceptanceOnly: true
        },
        context
      };
      const first = await createDesignTaskFromTemplateSetPage(client, request);
      const second = await createDesignTaskFromTemplateSetPage(client, request);
      if (!first?.task) fail("Trial page returned no DesignTask.", { pageCode: page.pageCode });
      if (first.task.template_set_id !== SET_ID || first.task.template_set_item_id !== page.itemId) {
        fail("Trial task lost Template Set identity.", { pageCode: page.pageCode, task: first.task });
      }
      if (Number(first.task.page_no) !== page.pageNo || first.task.page_code !== page.pageCode) {
        fail("Trial task page identity mismatch.", { pageCode: page.pageCode, task: first.task });
      }
      if (!second.reused || second.task.id !== first.task.id) {
        fail("Trial task idempotency failed.", { pageCode: page.pageCode });
      }
      createdTasks.push({
        pageNo: page.pageNo,
        pageCode: page.pageCode,
        taskId: first.task.id,
        idempotentReuse: true
      });
    }

    if (createdTasks.length !== 3) fail("Exactly three trial DesignTasks are required.", { createdTasks });

    summary = {
      ok: true,
      contract: "AIONE Mens Socks Template Set Trial Execution V1",
      templateSetId: SET_ID,
      productCode: PRODUCT_CODE,
      materialConfirmationId: confirmed.confirmation.id,
      trialTasks: createdTasks,
      trialPageCodes: createdTasks.map((task) => task.pageCode),
      fullBatchGeneration: false,
      staticPagesRegistered: false,
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
  process.stdout.write("[AIONE] MENS SOCKS TEMPLATE SET TRIAL EXECUTION V1 PASS\n");
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.code || "mens_socks_trial_execution_failed",
    message: error.message,
    details: error.details || undefined
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
