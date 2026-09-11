import pool from "../../db.js";

const CURATED_SOURCE_FOLDERS = ["01_SKU图", "02_产品图", "03_实拍图"];

function sourceFolder(row) {
  return String(row?.metadata?.sourceFolder || row?.metadata?.source_folder || "").trim();
}

function buildFolderCounts(rows) {
  const counts = Object.fromEntries(CURATED_SOURCE_FOLDERS.map((folder) => [folder, 0]));
  for (const row of rows) {
    const folder = sourceFolder(row);
    if (folder in counts) counts[folder] += 1;
  }
  return counts;
}

export function evaluateProductAssetReadiness(rows, confirmation = null, skuCount = 0) {
  const assets = Array.isArray(rows) ? rows : [];
  const sourceAssets = assets.filter((row) => row?.metadata?.layer === "SOURCE");
  const folderCounts = buildFolderCounts(sourceAssets);
  const imageCount = sourceAssets.filter((row) => row.asset_type === "image").length;
  const blocking = [];
  const warnings = [];

  if (!sourceAssets.length) blocking.push("source_assets_missing");
  if (!folderCounts["01_SKU图"]) blocking.push("curated_sku_images_missing");
  if (!folderCounts["02_产品图"]) blocking.push("curated_product_images_missing");
  if (!skuCount) blocking.push("sales_sku_missing");
  if (!confirmation || confirmation.status !== "confirmed") blocking.push("material_confirmation_required");
  if (!folderCounts["03_实拍图"]) warnings.push("real_photos_optional_missing");

  const confirmedAssetIds = confirmation && Array.isArray(confirmation.asset_ids)
    ? confirmation.asset_ids.map(String)
    : [];
  const currentSourceIds = new Set(sourceAssets.map((row) => String(row.id)));
  if (confirmation?.status === "confirmed" && confirmedAssetIds.some((id) => !currentSourceIds.has(id))) {
    blocking.push("confirmed_asset_missing");
  }

  const readyForAI = blocking.length === 0;
  return {
    state: readyForAI ? "ready_for_ai" : "human_gate_required",
    sourceAssetsIndexed: sourceAssets.length > 0,
    readyForAI,
    readyForPublishPack: false,
    publishReadinessReason: "channel_publish_pack_contract_not_frozen",
    humanGate: {
      status: confirmation?.status || "pending",
      confirmationId: confirmation?.id || null,
      version: confirmation?.version || null,
      snapshotHash: confirmation?.snapshot_hash || null,
      confirmedAt: confirmation?.confirmed_at || null,
      confirmedByPersonId: confirmation?.confirmed_by_person_id || null
    },
    counts: {
      salesSkuCount: Number(skuCount || 0),
      sourceAssetCount: sourceAssets.length,
      imageCount,
      folderCounts
    },
    blocking,
    warnings
  };
}

export async function getProductAssetReadiness(productId) {
  const normalizedProductId = String(productId || "").trim();
  if (!normalizedProductId) throw Object.assign(new Error("productId is required."), { code: "product_asset_product_id_required", statusCode: 400 });

  const productResult = await pool.query(
    "SELECT id, product_code, name, lifecycle_status FROM public.products WHERE id=$1 AND archived_at IS NULL",
    [normalizedProductId]
  );
  if (!productResult.rowCount) throw Object.assign(new Error("Product not found."), { code: "product_not_found", statusCode: 404 });

  const [assetsResult, skuResult, confirmationResult] = await Promise.all([
    pool.query(
      `SELECT id, asset_type, asset_role, lifecycle_status, metadata
         FROM public.product_assets
        WHERE product_id=$1 AND archived_at IS NULL
        ORDER BY asset_no`,
      [normalizedProductId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count
         FROM public.product_skus
        WHERE product_id=$1 AND archived_at IS NULL AND lifecycle_status <> 'retired'`,
      [normalizedProductId]
    ),
    pool.query(
      `SELECT * FROM public.product_material_confirmations
        WHERE product_id=$1 AND archived_at IS NULL
        ORDER BY version DESC, created_at DESC
        LIMIT 1`,
      [normalizedProductId]
    )
  ]);

  return {
    product: productResult.rows[0],
    readiness: evaluateProductAssetReadiness(
      assetsResult.rows,
      confirmationResult.rows[0] || null,
      Number(skuResult.rows[0]?.count || 0)
    )
  };
}
