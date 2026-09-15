import assert from "node:assert/strict";
import pool from "../db.js";
import { intakeSelectionRecords } from "../src/services/selection-intake-service.js";

const sourceRef = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
const sourcePlatform = "1688";
const record = {
  title: "Gate 0A controlled selection intake fixture",
  sourceRef,
  sourceUrl: `https://detail.1688.com/offer/${sourceRef}.html`,
  sourcePrice: "12.50",
  sourceCurrency: "CNY",
  sourceSupplierName: "Gate 0A Fixture Supplier",
  sourceGroup: "CI",
  sourceTags: ["gate0a", "controlled-ci"],
  sourceNote: "42",
  sourceWeightG: "42"
};
const materialManifest = {
  folderName: "gate0a-fixture",
  hasOriginalHero: false,
  roleCounts: { "SKU图": 1, "白底图": 1, "详情图": 1 },
  files: [
    { name: "sku-1.jpg", relativePath: "gate0a-fixture/sku-1.jpg", size: 100, lastModified: 1, role: "SKU图" },
    { name: "白底图-1.jpg", relativePath: "gate0a-fixture/白底图-1.jpg", size: 100, lastModified: 1, role: "白底图" },
    { name: "详情-1.jpg", relativePath: "gate0a-fixture/详情-1.jpg", size: 100, lastModified: 1, role: "详情图" }
  ]
};

async function countRelatedProducts(selectionId) {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM public.products WHERE source_opportunity_id=$1",
    [selectionId]
  );
  return Number(result.rows[0]?.count || 0);
}

async function countRelatedSkus(selectionId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count
       FROM public.product_skus s
       JOIN public.products p ON p.id=s.product_id
      WHERE p.source_opportunity_id=$1`,
    [selectionId]
  );
  return Number(result.rows[0]?.count || 0);
}

async function main() {
  const first = await intakeSelectionRecords({
    records: [record],
    selectionType: "直发选品",
    ownerPersonId: null,
    materialManifest,
    intakeFile: { name: "gate0a-fixture.xlsx", size: 1234 }
  });

  assert.equal(first.createdCount, 1, "first intake must create one Selection");
  assert.equal(first.updatedCount, 0, "first intake must not report update");
  assert.equal(first.totalCount, 1, "first intake must process one record");
  assert.equal(first.verification?.persistedCount, 1, "first intake DB re-read must find one row");
  assert.equal(first.material?.hasOriginalHero, false, "missing source hero must not block Gate 0A");

  const selection = first.verification.persisted[0];
  assert.ok(selection?.id, "persisted Selection id is required");
  assert.match(selection.selection_no || "", /^xp\d{9}$/, "Selection No must use canonical xpYYMMDDNNN contract");
  assert.equal(selection.lifecycle_status, "pending", "new Selection must be pending");

  const canonical = await pool.query(
    `SELECT id, selection_no, selection_mode, lifecycle_status, classification_status,
            source_fulfillment_hint, source_platform, source_ref, metadata
       FROM public.product_opportunities
      WHERE id=$1`,
    [selection.id]
  );
  assert.equal(canonical.rowCount, 1, "canonical product_opportunities row must exist");
  assert.equal(canonical.rows[0].selection_mode, "selection", "selection_mode must be canonical selection");
  assert.equal(canonical.rows[0].lifecycle_status, "pending", "lifecycle_status must be canonical pending");
  assert.equal(canonical.rows[0].source_fulfillment_hint, "direct", "direct selection must use direct fulfillment hint");
  assert.equal(canonical.rows[0].source_platform, sourcePlatform);
  assert.equal(canonical.rows[0].source_ref, sourceRef);
  assert.equal(canonical.rows[0].metadata?.localMaterialIntake?.hasOriginalHero, false);

  assert.equal(await countRelatedProducts(selection.id), 0, "Gate 0A must not create Product");
  assert.equal(await countRelatedSkus(selection.id), 0, "Gate 0A must not create SKU");

  const second = await intakeSelectionRecords({
    records: [{ ...record, title: "Gate 0A controlled selection intake fixture updated" }],
    selectionType: "直发选品",
    ownerPersonId: null,
    materialManifest,
    intakeFile: { name: "gate0a-fixture.xlsx", size: 1234 }
  });

  assert.equal(second.createdCount, 0, "idempotent retry must not create another Selection");
  assert.equal(second.updatedCount, 1, "idempotent retry must update the existing Selection");
  assert.equal(second.verification?.persistedCount, 1, "retry DB re-read must still find exactly one row");
  assert.equal(second.verification.persisted[0]?.id, selection.id, "retry must reuse the original Selection id");

  const duplicateCheck = await pool.query(
    `SELECT COUNT(*)::int AS count
       FROM public.product_opportunities
      WHERE source_platform=$1 AND source_ref=$2 AND archived_at IS NULL`,
    [sourcePlatform, sourceRef]
  );
  assert.equal(Number(duplicateCheck.rows[0]?.count || 0), 1, "source identity must remain unique after retry");
  assert.equal(await countRelatedProducts(selection.id), 0, "retry must not create Product");
  assert.equal(await countRelatedSkus(selection.id), 0, "retry must not create SKU");

  console.log(JSON.stringify({
    ok: true,
    gate: "Gate 0A Selection Intake",
    selectionId: selection.id,
    selectionNo: selection.selection_no,
    first: { createdCount: first.createdCount, updatedCount: first.updatedCount, persistedCount: first.verification.persistedCount },
    retry: { createdCount: second.createdCount, updatedCount: second.updatedCount, persistedCount: second.verification.persistedCount },
    sourceHeroRequired: false,
    productCount: 0,
    skuCount: 0,
    idempotent: true
  }, null, 2));
  console.log("[AIONE] GATE 0A SELECTION INTAKE ACCEPTANCE PASS");
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    gate: "Gate 0A Selection Intake",
    error: error?.code || error?.name || "gate0a_acceptance_failed",
    constraint: error?.constraint || null,
    table: error?.table || null,
    column: error?.column || null,
    detail: error?.detail || null,
    message: error?.message || "unknown"
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
