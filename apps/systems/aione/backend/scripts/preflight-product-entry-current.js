import pool from "../db.js";

// READ ONLY: compares the CURRENT product-entry schema with fields referenced by
// the existing AIONE runtime. Never creates tables, writes records or contacts RMS.
const contracts = {
  products: {
    currentBaseline: ["id", "product_code", "name_zh", "name_ja", "status", "metadata"],
    legacyRuntime: ["id", "product_code", "name", "lifecycle_status", "product_data", "archived_at"]
  },
  product_skus: {
    currentBaseline: ["id", "sku_code", "product_id", "name", "attributes", "status"],
    legacyRuntime: ["id", "sku_code", "product_id", "sku_no", "sku_data", "lifecycle_status", "archived_at"]
  },
  product_assets: {
    currentBaseline: ["id", "product_id", "asset_type", "file_provider", "file_id"],
    legacyRuntime: ["id", "product_id", "canonical_name", "asset_no", "lifecycle_status", "metadata"]
  },
  listings: {
    currentBaseline: ["id", "product_id", "store_id", "listing_code", "publish_payload", "status"],
    legacyRuntime: []
  },
  channel_listings: {
    currentBaseline: [],
    legacyRuntime: ["id", "product_id", "channel", "shop_ref", "lifecycle_status"]
  }
};

async function main() {
  // Database-level READ ONLY prohibits all mutation, even if someone edits a query.
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const result = await client.query(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[]) ORDER BY table_name, ordinal_position",
      [Object.keys(contracts)]
    );
    const discovered = new Map(Object.keys(contracts).map(t => [t, new Set()]));
    for (const row of result.rows) discovered.get(row.table_name)?.add(row.column_name);
    const report = Object.fromEntries(Object.entries(contracts).map(([table, expected]) => {
      const present = discovered.get(table);
      return [table, {
        exists: present.size > 0,
        baselineMissing: expected.currentBaseline.filter(f => !present.has(f)),
        oldRuntimeMissing: expected.legacyRuntime.filter(f => !present.has(f)),
        columns: [...present].sort()
      }];
    }));
    await client.query("COMMIT");
    const compatible = Object.values(report).every(x => x.baselineMissing.length === 0);
    console.log(JSON.stringify({ readOnly: true, compatibleWithCurrentBaseline: compatible, report }, null, 2));
    if (!compatible) process.exitCode = 2;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(JSON.stringify({ readOnly: true, error: error.code || "schema_preflight_failed", message: error.message }, null, 2));
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
