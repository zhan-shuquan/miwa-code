import pool from "../db.js";

const KNOWN_NON_MENS_CODES = new Set(["MH0000002"]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const result = await client.query(`
      WITH confirmed AS (
        SELECT DISTINCT ON (product_id)
               product_id,
               id AS confirmation_id,
               confirmed_at,
               version,
               asset_ids,
               snapshot_hash
          FROM public.product_material_confirmations
         WHERE status='confirmed' AND archived_at IS NULL
         ORDER BY product_id, version DESC, confirmed_at DESC
      ), source_assets AS (
        SELECT pa.product_id,
               COUNT(*) FILTER (WHERE pa.metadata->>'layer'='SOURCE')::int AS source_count,
               COALESCE(
                 jsonb_agg(
                   jsonb_build_object(
                     'id', pa.id,
                     'assetNo', pa.asset_no,
                     'role', pa.asset_role,
                     'canonicalName', pa.canonical_name,
                     'originalName', pa.original_name,
                     'sourceFolder', COALESCE(pa.metadata->>'sourceFolder', pa.metadata->>'source_folder'),
                     'gcsBucket', pa.metadata->>'gcsBucket',
                     'gcsObject', pa.metadata->>'gcsObject'
                   ) ORDER BY pa.asset_no
                 ) FILTER (WHERE pa.metadata->>'layer'='SOURCE'),
                 '[]'::jsonb
               ) AS assets
          FROM public.product_assets pa
         WHERE pa.archived_at IS NULL
         GROUP BY pa.product_id
      )
      SELECT p.id AS product_id,
             p.product_code,
             p.name,
             p.lifecycle_status,
             p.product_data,
             p.readiness_data,
             p.metadata,
             c.confirmation_id,
             c.confirmed_at,
             c.version AS confirmation_version,
             c.snapshot_hash,
             c.asset_ids AS confirmed_asset_ids,
             COALESCE(sa.source_count, 0) AS source_count,
             COALESCE(sa.assets, '[]'::jsonb) AS source_assets
        FROM public.products p
        JOIN confirmed c ON c.product_id=p.id
        LEFT JOIN source_assets sa ON sa.product_id=p.id
       WHERE p.archived_at IS NULL
         AND p.product_code IS NOT NULL
         AND COALESCE(sa.source_count, 0) > 0
       ORDER BY c.confirmed_at DESC NULLS LAST, p.updated_at DESC NULLS LAST
       LIMIT 50
    `);

    const candidates = result.rows.map((row) => {
      const confirmedIds = new Set(asArray(row.confirmed_asset_ids).map(String));
      const sourceAssets = asArray(row.source_assets).map((asset) => ({
        ...asset,
        humanConfirmed: confirmedIds.has(String(asset.id))
      }));
      return {
        productId: row.product_id,
        productCode: row.product_code,
        name: row.name,
        lifecycleStatus: row.lifecycle_status,
        materialConfirmationId: row.confirmation_id,
        materialConfirmedAt: row.confirmed_at,
        materialConfirmationVersion: row.confirmation_version,
        materialSnapshotHash: row.snapshot_hash,
        sourceCount: Number(row.source_count || 0),
        sourceAssets,
        productData: row.product_data || {},
        readinessData: row.readiness_data || {},
        metadata: row.metadata || {},
        knownNonMensProduct: KNOWN_NON_MENS_CODES.has(String(row.product_code || "").trim()),
        autoSelected: false
      };
    });

    await client.query("ROLLBACK");

    process.stdout.write(`${JSON.stringify({
      contract: "AIONE Mens Socks Real Product Discovery V1",
      ok: true,
      readOnly: true,
      productTruthRule: "Discovery never infers men's-socks identity from product name, folder name, or historical comments. Human confirmation is required before Gate C.",
      knownNonMensProductCodes: [...KNOWN_NON_MENS_CODES],
      candidateCount: candidates.length,
      candidates
    }, null, 2)}\n`);

    for (const row of candidates) {
      process.stdout.write(
        `[AIONE_MENS_SOCKS_DISCOVERY] ${row.productCode} | ${row.name || ""} | confirmed=${row.materialConfirmedAt || ""} | source=${row.sourceCount} | knownNonMens=${row.knownNonMensProduct}\n`
      );
    }
    process.stdout.write("[AIONE] MENS SOCKS REAL PRODUCT DISCOVERY PASS - HUMAN PRODUCT IDENTITY CONFIRMATION REQUIRED\n");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.code || "mens_socks_real_product_discovery_failed",
    message: error.message
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
