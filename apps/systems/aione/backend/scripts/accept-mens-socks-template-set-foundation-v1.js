import pool from "../db.js";
import {
  getDesignTemplateSet,
  getDesignTemplateSetItem,
  assertTemplateSetItemExecutable
} from "../src/services/design-template-set-service.js";

const SET_ID = "dtset_mens_socks_rakuten_detail_v1";
const TRIAL_ITEMS = [
  {
    itemId: "dtsi_mens_socks_hero_01_v1",
    pageNo: 1,
    pageCode: "MS-HERO-01",
    width: 1000,
    height: 1000,
    templateId: "dtpl_unified_product_hero_square_v1",
    templateStatus: "active"
  },
  {
    itemId: "dtsi_mens_socks_reason1_04_v1",
    pageNo: 4,
    pageCode: "MS-REASON1-04",
    width: 1000,
    height: 1500,
    templateId: "dtpl_mens_socks_rakuten_reason1_v1",
    templateStatus: "draft"
  },
  {
    itemId: "dtsi_mens_socks_size_12_v1",
    pageNo: 12,
    pageCode: "MS-SIZE-12",
    width: 1000,
    height: 1500,
    templateId: "dtpl_mens_socks_rakuten_size_v1",
    templateStatus: "draft"
  }
];

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

async function main() {
  const client = await pool.connect();
  try {
    const set = await getDesignTemplateSet(client, SET_ID);
    if (set.set_code !== "MEN-SOCKS-RAKUTEN-DETAIL-V1") {
      fail("Men's-socks Template Set code mismatch.", { setCode: set.set_code });
    }
    if (set.lifecycle_status !== "draft") {
      fail("Technical foundation must remain draft before trial execution proof.", { status: set.lifecycle_status });
    }
    if (set.metadata?.implementationStage !== "trial-three-first") {
      fail("Template Set implementation stage mismatch.", { metadata: set.metadata });
    }
    if (!Array.isArray(set.pages) || set.pages.length !== 3) {
      fail("Technical foundation must expose exactly three trial pages.", { pageCount: set.pages?.length });
    }

    const seenCodes = [];
    for (const expected of TRIAL_ITEMS) {
      const item = await getDesignTemplateSetItem(client, expected.itemId);
      if ((item.item_kind || "dynamic_template") !== "dynamic_template") {
        fail("Trial page must be dynamic_template.", { itemId: expected.itemId, itemKind: item.item_kind });
      }
      if (Number(item.page_no) !== expected.pageNo || item.page_code !== expected.pageCode) {
        fail("Trial page identity mismatch.", {
          itemId: expected.itemId,
          pageNo: item.page_no,
          pageCode: item.page_code
        });
      }
      if (Number(item.canvas_width) !== expected.width || Number(item.canvas_height) !== expected.height) {
        fail("Trial page canvas mismatch.", {
          itemId: expected.itemId,
          width: item.canvas_width,
          height: item.canvas_height,
          expectedWidth: expected.width,
          expectedHeight: expected.height
        });
      }
      if (item.template_id !== expected.templateId || item.template_status !== expected.templateStatus) {
        fail("Trial page template binding mismatch.", {
          itemId: expected.itemId,
          templateId: item.template_id,
          templateStatus: item.template_status,
          expectedTemplateId: expected.templateId,
          expectedTemplateStatus: expected.templateStatus
        });
      }
      if (item.template_set_status !== "draft") {
        fail("Trial Template Set must remain draft before real trial proof.", {
          itemId: expected.itemId,
          setStatus: item.template_set_status
        });
      }
      let blocked = false;
      try {
        assertTemplateSetItemExecutable(item);
      } catch (error) {
        blocked = error?.code === "design_template_set_not_active";
      }
      if (!blocked) {
        fail("Draft trial page unexpectedly became executable.", { itemId: expected.itemId });
      }
      seenCodes.push(expected.pageCode);
    }

    const oldHero = await client.query(
      `SELECT lifecycle_status, metadata
         FROM public.design_templates
        WHERE id='dtpl_mens_socks_rakuten_hero_v1'
          AND archived_at IS NULL
        LIMIT 1`
    );
    if (!oldHero.rowCount || oldHero.rows[0].lifecycle_status !== "deprecated") {
      fail("Legacy mens-socks hero must remain auditable but deprecated.", { row: oldHero.rows[0] || null });
    }
    if (oldHero.rows[0].metadata?.supersededBy !== "dtpl_unified_product_hero_square_v1") {
      fail("Legacy mens-socks hero supersession metadata mismatch.", { metadata: oldHero.rows[0].metadata });
    }

    const tableResult = await client.query(
      `SELECT to_regclass('public.design_static_page_assets') AS static_table,
              EXISTS (
                SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public'
                   AND table_name='design_template_set_items'
                   AND column_name='item_kind'
              ) AS has_item_kind,
              EXISTS (
                SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public'
                   AND table_name='design_template_set_items'
                   AND column_name='static_page_asset_id'
              ) AS has_static_target`
    );
    const proof = tableResult.rows[0];
    if (!proof?.static_table || !proof.has_item_kind || !proof.has_static_target) {
      fail("Static page asset foundation is incomplete.", proof || {});
    }

    const summary = {
      ok: true,
      contract: "AIONE Men's Socks Template Set Foundation V1",
      templateSetId: SET_ID,
      setCode: set.set_code,
      lifecycleStatus: set.lifecycle_status,
      implementationStage: set.metadata?.implementationStage,
      trialPages: seenCodes,
      heroPageTemplate: "dtpl_unified_product_hero_square_v1",
      heroCanvas: "1000x1000",
      legacyHeroDeprecated: true,
      staticPageAssetRegistry: true,
      staticPagesRegistered: false,
      activationBlockedUntilTrialProof: true
    };
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    process.stdout.write("[AIONE] MENS SOCKS TEMPLATE SET FOUNDATION V1 PASS\n");
  } finally {
    client.release();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.code || "mens_socks_template_set_foundation_failed",
    message: error.message,
    details: error.details || undefined
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
