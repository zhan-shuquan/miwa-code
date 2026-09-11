import assert from "node:assert/strict";
import { evaluateProductAssetReadiness } from "../src/services/product-asset-readiness-service.js";

const missing = evaluateProductAssetReadiness([], null, 0);
assert.equal(missing.state, "human_gate_required");
assert.equal(missing.sourceAssetsIndexed, false);
assert(missing.blocking.includes("source_assets_missing"));
assert(missing.blocking.includes("curated_sku_images_missing"));
assert(missing.blocking.includes("curated_product_images_missing"));
assert(missing.blocking.includes("sales_sku_missing"));
assert(missing.blocking.includes("material_confirmation_required"));
assert.equal(missing.readyForAI, false);
assert.equal(missing.readyForPublishPack, false);

const sourceAssets = [
  { id: "ast_sku", asset_type: "image", metadata: { layer: "SOURCE", sourceFolder: "01_SKU图" } },
  { id: "ast_product", asset_type: "image", metadata: { layer: "SOURCE", sourceFolder: "02_产品图" } },
  { id: "ast_real", asset_type: "image", metadata: { layer: "SOURCE", sourceFolder: "03_实拍图" } },
  { id: "ast_derived", asset_type: "image", metadata: { layer: "DERIVED" } }
];

const indexedNotConfirmed = evaluateProductAssetReadiness(sourceAssets, null, 2);
assert.equal(indexedNotConfirmed.sourceAssetsIndexed, true);
assert.equal(indexedNotConfirmed.readyForAI, false);
assert.deepEqual(indexedNotConfirmed.counts.folderCounts, {
  "01_SKU图": 1,
  "02_产品图": 1,
  "03_实拍图": 1
});
assert(indexedNotConfirmed.blocking.includes("material_confirmation_required"));

const ready = evaluateProductAssetReadiness(sourceAssets, {
  id: "pmc_1",
  version: 1,
  status: "confirmed",
  snapshot_hash: "abc",
  asset_ids: ["ast_sku", "ast_product", "ast_real"],
  confirmed_at: "2026-09-11T00:00:00Z",
  confirmed_by_person_id: "person_1"
}, 2);
assert.equal(ready.state, "ready_for_ai");
assert.equal(ready.readyForAI, true);
assert.deepEqual(ready.blocking, []);
assert.deepEqual(ready.warnings, []);
assert.equal(ready.readyForPublishPack, false);
assert.equal(ready.publishReadinessReason, "channel_publish_pack_contract_not_frozen");

console.log("[AIONE] Product asset readiness PASS");
