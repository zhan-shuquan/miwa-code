import pool from "../../db.js";

const ROLE_BY_SEGMENT = new Map([
  ["sku图片", "source_sku_image"],
  ["主图", "source_main_image"],
  ["详情", "source_detail_image"],
  ["视频", "source_video"]
]);

function normalizeRelativePath(value) {
  return String(value || "").normalize("NFKC").replaceAll("\\", "/").replace(/^\.\//, "");
}

export function roleFrom1688RelativePath(relativePath) {
  const segments = normalizeRelativePath(relativePath)
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const role = ROLE_BY_SEGMENT.get(segment);
    if (role) return role;
  }
  return "source_other";
}

export async function reconcileProductSourceAssetRoles({ productId, sourceRef }) {
  const result = await pool.query(
    `SELECT id, asset_role, metadata
       FROM public.product_assets
      WHERE product_id=$1
        AND archived_at IS NULL
        AND source_provider='1688'
        AND source_ref=$2
        AND metadata->>'layer'='SOURCE'
      ORDER BY asset_no`,
    [productId, sourceRef]
  );

  let updatedCount = 0;
  const roles = new Set();
  const samples = [];

  for (const row of result.rows) {
    const relativePath = row.metadata?.relativePath || "";
    const nextRole = roleFrom1688RelativePath(relativePath);
    roles.add(nextRole);
    if (samples.length < 8) samples.push({ relativePath, role: nextRole });

    if (row.asset_role !== nextRole) {
      await pool.query(
        `UPDATE public.product_assets
            SET asset_role=$2,
                updated_at=NOW(),
                record_version=record_version+1
          WHERE id=$1`,
        [row.id, nextRole]
      );
      updatedCount += 1;
    }
  }

  return {
    updatedCount,
    sourceAssetCount: result.rowCount,
    roles: [...roles].sort(),
    samples
  };
}
