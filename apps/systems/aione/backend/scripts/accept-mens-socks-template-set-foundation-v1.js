import pool from "../db.js";
import {
  getDesignTemplateSet,
  getDesignTemplateSetItem,
  assertTemplateSetItemExecutable
} from "../src/services/design-template-set-service.js";

const SET_ID = "dtset_mens_socks_rakuten_detail_v1";
const TRIAL_ITEMS = [
  ["dtsi_mens_socks_hero_01_v1", 1, "MS-HERO-01", 1000, 1200],
  ["dtsi_mens_socks_reason1_04_v1", 4, "MS-REASON1-04", 1000, 1500],
  ["dtsi_mens_socks_size_12_v1", 12, "MS-SIZE-12", 1000, 1500]
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
    for (const [itemId, pageNo, pageCode, width, height] of TRIAL_ITEMS) {
      const item = await getDesignTemplateSetItem(client, itemId);
      if ((item.item_kind || "dynamic_template") !== "dynamic_template") {
        fail("Trial page must be dynamic_template.", { itemId, itemKind: item.item_kind });
      }
      if (Number(item.page_no) !== pageNo || item.page_code !== pageCode) {
        fail("Trial page identity mismatch.", { itemId, pageNo: item.page_no, pageCode: item.page_code });
      }
      if (Number(item.canvas_width) !== width || Number(item.canvas_height) !== height) {
        fail("Trial page canvas mismatch.", { itemId, width: item.canvas_width, height: item.canvas_height });
      }
      if (item.template_set_status !== "draft" || item.template_status !== "draft") {
        fail("Trial foundation must remain non-executable draft before real trial proof.", {
          itemId,
          setStatus: item.template_set_status,
          templateStatus: item.template_status
        });
      }
      let blocked = false;
      try {
        assertTemplateSetItemExecutable(item);
      } catch (error) {
        blocked = error?.code === "design_template_set_not_active";
      }
      if (!blocked) {
        fail("Draft trial page unexpectedly became executable.", { itemId });
      }
      seenCodes.push(pageCode);
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
