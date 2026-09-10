import assert from "node:assert/strict";
import {
  buildRakutenPackProposal,
  validateRakutenPackAssignments
} from "../src/services/rakuten-canonical-publish-service.js";

const assets = [
  { id: "a1", asset_no: 1, asset_type: "image", asset_role: "source_main_image", canonical_name: "MH0000002_01.jpg", metadata: { layer: "SOURCE", gcsBucket: "bucket", gcsObject: "main.jpg" }, archived_at: null },
  { id: "a2", asset_no: 2, asset_type: "image", asset_role: "source_sku_image", canonical_name: "MH0000002_02.jpg", metadata: { layer: "SOURCE", gcsBucket: "bucket", gcsObject: "sku.jpg" }, archived_at: null },
  { id: "a3", asset_no: 3, asset_type: "image", asset_role: "source_detail_image", canonical_name: "MH0000002_03.jpg", metadata: { layer: "SOURCE", gcsBucket: "bucket", gcsObject: "detail.jpg" }, archived_at: null },
  { id: "a4", asset_no: 4, asset_type: "video", asset_role: "source_video", canonical_name: "MH0000002_04.mp4", metadata: { layer: "SOURCE", gcsBucket: "bucket", gcsObject: "video.mp4" }, archived_at: null }
];

const proposal = buildRakutenPackProposal(assets);
assert.equal(proposal.length, 4);
assert.equal(proposal[0].slotFamily, "main_images");
assert.equal(proposal[1].slotFamily, "sku_or_variation_images");
assert.equal(proposal[2].slotFamily, "detail_images");
assert.equal(proposal[3].slotFamily, "video");

const valid = validateRakutenPackAssignments({
  assets,
  assignments: proposal,
  shopRef: "shop-1",
  destinationResolved: true
});
assert.equal(valid.readyForPublish, true);
assert.deepEqual(valid.blocking, []);

const missingMain = validateRakutenPackAssignments({
  assets,
  assignments: proposal.filter((item) => item.slotFamily !== "main_images"),
  shopRef: "shop-1",
  destinationResolved: true
});
assert.equal(missingMain.readyForPublish, false);
assert.ok(missingMain.blocking.includes("rakuten_main_image_missing"));

const missingCanonical = validateRakutenPackAssignments({
  assets: [{ ...assets[0], metadata: { layer: "SOURCE" } }],
  assignments: [{ assetId: "a1", slotFamily: "main_images", slotOrder: 1 }],
  shopRef: "shop-1",
  destinationResolved: true
});
assert.ok(missingCanonical.blocking.includes("canonical_asset_storage_missing"));

console.log("[AIONE] Rakuten canonical pack validation PASS");
