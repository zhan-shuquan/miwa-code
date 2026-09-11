import assert from "node:assert/strict";
import { evaluateProductAssetReadiness } from "../src/services/product-asset-readiness-service.js";

const baseAssets = [
  { id: "ast_sku", asset_type: "image", metadata: { layer: "SOURCE", sourceFolder: "01_SKU图" } },
  { id: "ast_product", asset_type: "image", metadata: { layer: "SOURCE", sourceFolder: "02_产品图" } }
];

const beforeHumanGate = evaluateProductAssetReadiness(baseAssets, null, 2);
assert.equal(beforeHumanGate.readyForAI, false);
assert.equal(beforeHumanGate.state, "human_gate_required");
assert(beforeHumanGate.blocking.includes("material_confirmation_required"));
assert(beforeHumanGate.warnings.includes("real_photos_optional_missing"));

const confirmed = evaluateProductAssetReadiness(baseAssets, {
  id: "pmc_1",
  version: 1,
  status: "confirmed",
  snapshot_hash: "abc",
  asset_ids: ["ast_sku", "ast_product"],
  confirmed_at: "2026-09-11T00:00:00Z",
  confirmed_by_person_id: "person_1"
}, 2);
assert.equal(confirmed.readyForAI, true);
assert.equal(confirmed.state, "ready_for_ai");
assert.deepEqual(confirmed.blocking, []);

const missingSkuFolder = evaluateProductAssetReadiness([
  { id: "ast_product", asset_type: "image", metadata: { layer: "SOURCE", sourceFolder: "02_产品图" } }
], { id: "pmc_2", version: 1, status: "confirmed", asset_ids: ["ast_product"] }, 1);
assert.equal(missingSkuFolder.readyForAI, false);
assert(missingSkuFolder.blocking.includes("curated_sku_images_missing"));

const invalidated = evaluateProductAssetReadiness(baseAssets, {
  id: "pmc_3",
  version: 2,
  status: "invalidated",
  asset_ids: ["ast_sku", "ast_product"]
}, 2);
assert.equal(invalidated.readyForAI, false);
assert(invalidated.blocking.includes("material_confirmation_required"));

console.log("[AIONE] PRODUCT MATERIAL HUMAN GATE READINESS V1 PASS");
