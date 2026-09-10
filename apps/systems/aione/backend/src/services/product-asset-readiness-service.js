import pool from "../../db.js";

const SOURCE_ROLES = [
  "source_main_image",
  "source_sku_image",
  "source_detail_image",
  "source_video",
  "source_other"
];

function buildRoleCounts(rows) {
  const counts = Object.fromEntries(SOURCE_ROLES.map((role) => [role, 0]));
  for (const row of rows) {
    const role = String(row.asset_role || "source_other");
    counts[role] = (counts[role] || 0) + 1;
  }
  return counts;
}

export function evaluateProductAssetReadiness(rows) {
  const assets = Array.isArray(rows) ? rows : [];
  const sourceAssets = assets.filter((row) => row?.metadata?.layer === "SOURCE");
  const roleCounts = buildRoleCounts(sourceAssets);
  const imageCount = sourceAssets.filter((row) => row.asset_type === "image").length;
  const videoCount = sourceAssets.filter((row) => row.asset_type === "video").length;
  const blocking = [];
  const warnings = [];

  if (!sourceAssets.length) blocking.push("source_assets_missing");
  if (!roleCounts.source_main_image) warnings.push("source_main_image_missing");
  if (!roleCounts.source_sku_image) warnings.push("source_sku_image_missing");
  if (!roleCounts.source_detail_image) warnings.push("source_detail_image_missing");

  return {
    state: blocking.length ? "source_assets_missing" : "source_assets_indexed",
    sourceAssetsIndexed: blocking.length === 0,
    readyForPublishPack: false,
    publishReadinessReason: "channel_publish_pack_contract_not_frozen",
    counts: {
      sourceAssetCount: sourceAssets.length,
      imageCount,
      videoCount,
      roleCounts
    },
    blocking,
    warnings
  };
}

export async function getProductAssetReadiness(productId) {
  const normalizedProductId = String(productId || "").trim();
  if (!normalizedProductId) {
    throw Object.assign(new Error("productId is required."), { code: "product_asset_product_id_required", statusCode: 400 });
  }

  const productResult = await pool.query(
    "SELECT id, product_code, name, lifecycle_status FROM public.products WHERE id=$1 AND archived_at IS NULL",
    [normalizedProductId]
  );
  if (!productResult.rowCount) {
    throw Object.assign(new Error("Product not found."), { code: "product_not_found", statusCode: 404 });
  }

  const assetsResult = await pool.query(
    `SELECT id, asset_type, asset_role, lifecycle_status, metadata
       FROM public.product_assets
      WHERE product_id=$1 AND archived_at IS NULL
      ORDER BY asset_no`,
    [normalizedProductId]
  );

  return {
    product: productResult.rows[0],
    readiness: evaluateProductAssetReadiness(assetsResult.rows)
  };
}
