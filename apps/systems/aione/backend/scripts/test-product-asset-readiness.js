import assert from "node:assert/strict";
import { evaluateProductAssetReadiness } from "../src/services/product-asset-readiness-service.js";

const missing = evaluateProductAssetReadiness([]);
assert.equal(missing.state, "source_assets_missing");
assert.equal(missing.sourceAssetsIndexed, false);
assert.deepEqual(missing.blocking, ["source_assets_missing"]);
assert.equal(missing.readyForPublishPack, false);

const indexed = evaluateProductAssetReadiness([
  { asset_type: "image", asset_role: "source_main_image", metadata: { layer: "SOURCE" } },
  { asset_type: "image", asset_role: "source_sku_image", metadata: { layer: "SOURCE" } },
  { asset_type: "image", asset_role: "source_detail_image", metadata: { layer: "SOURCE" } },
  { asset_type: "video", asset_role: "source_video", metadata: { layer: "SOURCE" } },
  { asset_type: "image", asset_role: "source_other", metadata: { layer: "DERIVED" } }
]);
assert.equal(indexed.state, "source_assets_indexed");
assert.equal(indexed.sourceAssetsIndexed, true);
assert.equal(indexed.counts.sourceAssetCount, 4);
assert.equal(indexed.counts.imageCount, 3);
assert.equal(indexed.counts.videoCount, 1);
assert.equal(indexed.counts.roleCounts.source_main_image, 1);
assert.equal(indexed.counts.roleCounts.source_sku_image, 1);
assert.equal(indexed.counts.roleCounts.source_detail_image, 1);
assert.equal(indexed.counts.roleCounts.source_video, 1);
assert.deepEqual(indexed.blocking, []);
assert.deepEqual(indexed.warnings, []);
assert.equal(indexed.readyForPublishPack, false);
assert.equal(indexed.publishReadinessReason, "channel_publish_pack_contract_not_frozen");

console.log("[AIONE] Product asset readiness PASS");
