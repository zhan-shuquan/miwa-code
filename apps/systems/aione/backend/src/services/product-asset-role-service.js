import pool, { withTransaction } from "../../db.js";

const ROLE_BY_SEGMENT = new Map([
  ["主图", "source_main_image"],
  ["sku图片", "source_sku_image"],
  ["详情", "source_detail_image"],
  ["视频", "source_video"]
]);

export function detect1688SourceAssetRole(relativePath) {
  const segments = String(relativePath || "")
    .replaceAll("\\", "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const role = ROLE_BY_SEGMENT.get(segment);
    if (role) return role;
  }
  return "source_other";
}

export async function reconcile1688SourceAssetRoles({ productId, sourceRef }) {
  const normalizedProductId = String(productId || "").trim();
  const normalizedSourceRef = String(sourceRef || "").trim();
  if (!normalizedProductId) throw Object.assign(new Error("productId is required."), { code: "product_asset_product_id_required" });
  if (!/^\d+$/.test(normalizedSourceRef)) {
    throw Object.assign(new Error("Numeric 1688 sourceRef is required."), { code: "invalid_source_ref" });
  }

  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT id, asset_role, metadata
         FROM public.product_assets
        WHERE product_id=$1
          AND archived_at IS NULL
          AND source_provider='1688'
          AND source_ref=$2
          AND metadata->>'layer'='SOURCE'
        ORDER BY asset_no`,
      [normalizedProductId, normalizedSourceRef]
    );

    const counts = {};
    let updatedCount = 0;
    for (const row of result.rows) {
      const relativePath = row.metadata?.relativePath || "";
      const role = detect1688SourceAssetRole(relativePath);
      counts[role] = (counts[role] || 0) + 1;
      if (row.asset_role === role) continue;
      await client.query(
        `UPDATE public.product_assets
            SET asset_role=$2,
                updated_at=NOW(),
                record_version=record_version+1
          WHERE id=$1`,
        [row.id, role]
      );
      updatedCount += 1;
    }

    return {
      reconciledAssetCount: result.rowCount,
      updatedRoleCount: updatedCount,
      roles: Object.keys(counts).sort(),
      roleCounts: counts
    };
  });
}
