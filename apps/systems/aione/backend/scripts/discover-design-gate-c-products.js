import pool from "../db.js";

async function main() {
  const result = await pool.query(`
    WITH confirmed AS (
      SELECT DISTINCT ON (product_id)
             product_id, id AS confirmation_id, confirmed_at, version, asset_ids
        FROM public.product_material_confirmations
       WHERE status='confirmed' AND archived_at IS NULL
       ORDER BY product_id, version DESC, confirmed_at DESC
    ), required_roles AS (
      SELECT pa.product_id,
             BOOL_OR(pa.asset_role='source_main_image' AND pa.metadata->>'layer'='SOURCE') AS has_main,
             BOOL_OR(pa.asset_role='source_detail_image' AND pa.metadata->>'layer'='SOURCE') AS has_detail,
             COUNT(*) FILTER (WHERE pa.metadata->>'layer'='SOURCE')::int AS source_count
        FROM public.product_assets pa
       WHERE pa.archived_at IS NULL
       GROUP BY pa.product_id
    )
    SELECT p.product_code,
           p.name,
           p.lifecycle_status,
           c.confirmation_id,
           c.confirmed_at,
           c.version AS confirmation_version,
           r.source_count,
           COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
               'id', pa.id,
               'role', pa.asset_role,
               'name', COALESCE(pa.original_name, pa.canonical_name),
               'sourceFolder', COALESCE(pa.metadata->>'sourceFolder', pa.metadata->>'source_folder')
             ) ORDER BY pa.asset_no)
             FROM public.product_assets pa
             WHERE pa.product_id=p.id
               AND pa.archived_at IS NULL
               AND pa.metadata->>'layer'='SOURCE'
               AND pa.asset_role IN ('source_main_image','source_detail_image')
           ), '[]'::jsonb) AS required_assets
      FROM public.products p
      JOIN confirmed c ON c.product_id=p.id
      JOIN required_roles r ON r.product_id=p.id
     WHERE p.archived_at IS NULL
       AND r.has_main=TRUE
       AND r.has_detail=TRUE
     ORDER BY c.confirmed_at DESC NULLS LAST, p.updated_at DESC NULLS LAST
     LIMIT 20
  `);

  process.stdout.write(`${JSON.stringify({
    contract: "AIONE Gate C Product Discovery V1",
    ok: true,
    candidateCount: result.rowCount,
    candidates: result.rows
  }, null, 2)}\n`);
  for (const row of result.rows) {
    process.stdout.write(`[AIONE_GATE_C_CANDIDATE] ${row.product_code} | ${row.name || ""} | confirmed=${row.confirmed_at || ""}\n`);
  }
  process.stdout.write("[AIONE] GATE C PRODUCT DISCOVERY PASS\n");
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.code || "gate_c_product_discovery_failed", message: error.message }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
