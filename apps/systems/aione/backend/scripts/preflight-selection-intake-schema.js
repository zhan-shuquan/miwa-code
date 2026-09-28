import pool from "../db.js";

const REQUIRED_OPPORTUNITY_COLUMNS = Object.freeze([
  "id", "source_platform", "source_ref", "source_url", "title", "selection_mode",
  "lifecycle_status", "selection_no", "selection_date", "source_cover_image_url",
  "source_price", "source_currency", "source_supplier_name", "source_group", "source_tags",
  "source_note", "source_weight_g", "source_fulfillment_hint", "first_imported_at",
  "last_imported_at", "classification_status", "owner_person_id", "metadata", "source_system",
  "archived_at", "updated_at", "record_version"
]);

let client;
try {
  client = await pool.connect();
  await client.query("BEGIN READ ONLY");
  const [
    tableResult,
    columnResult,
    counterResult,
    sourceUniquenessResult,
    checkConstraintResult,
    canonicalValueResult
  ] = await Promise.all([
    client.query("SELECT to_regclass('public.product_opportunities')::text AS table_name"),
    client.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema='public' AND table_name='product_opportunities'`
    ),
    client.query("SELECT to_regclass('public.selection_number_counters')::text AS table_name"),
    client.query(
      `SELECT indexdef
         FROM pg_indexes
        WHERE schemaname='public'
          AND tablename='product_opportunities'
          AND indexdef ILIKE '%UNIQUE%'
          AND indexdef ILIKE '%source_platform%'
          AND indexdef ILIKE '%source_ref%'`
    ),
    client.query(
      `SELECT c.conname AS name,
              pg_get_constraintdef(c.oid, true) AS definition
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname='public'
          AND t.relname='product_opportunities'
          AND c.contype='c'
        ORDER BY c.conname`
    ),
    client.query(
      `SELECT selection_mode,
              lifecycle_status,
              classification_status,
              source_fulfillment_hint,
              source_system,
              COUNT(*)::int AS row_count
         FROM public.product_opportunities
        WHERE archived_at IS NULL
        GROUP BY selection_mode, lifecycle_status, classification_status, source_fulfillment_hint, source_system
        ORDER BY row_count DESC, selection_mode, lifecycle_status
        LIMIT 50`
    )
  ]);

  const columns = new Set(columnResult.rows.map((row) => row.column_name));
  const missingColumns = REQUIRED_OPPORTUNITY_COLUMNS.filter((column) => !columns.has(column));
  const evidence = {
    productOpportunities: tableResult.rows[0]?.table_name || null,
    selectionNumberCounters: counterResult.rows[0]?.table_name || null,
    missingColumns,
    canonicalSourceUniqueness: sourceUniquenessResult.rowCount > 0,
    checkConstraints: checkConstraintResult.rows,
    canonicalValueCombinations: canonicalValueResult.rows,
    transactionReadOnly: true
  };

  if (!evidence.productOpportunities || !evidence.selectionNumberCounters || missingColumns.length || !evidence.canonicalSourceUniqueness) {
    console.error(JSON.stringify({ ok: false, ...evidence }));
    process.exitCode = 2;
  } else {
    console.log(JSON.stringify({ ok: true, ...evidence }));
  }
  await client.query("ROLLBACK");
} catch (error) {
  if (client) await client.query("ROLLBACK").catch(() => {});
  console.error(JSON.stringify({
    ok: false,
    error: error?.code || "selection_intake_schema_preflight_failed",
    constraint: error?.constraint || null,
    table: error?.table || null,
    column: error?.column || null,
    detail: error?.detail || null,
    message: error?.message || "unknown"
  }));
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
