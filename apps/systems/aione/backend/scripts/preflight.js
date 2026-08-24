import pool from "../db.js";

async function columnInfo(tableName) {
  const result = await pool.query(
    `SELECT column_name, data_type, udt_name, is_nullable
       FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position`,
    [tableName]
  );
  return result.rows;
}

async function safeCount(tableName) {
  try {
    const result = await pool.query(`SELECT COUNT(*)::bigint AS count FROM public.${tableName}`);
    return Number(result.rows[0]?.count || 0);
  } catch (_) {
    return null;
  }
}

async function main() {
  const existing = await pool.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema='public'
      ORDER BY table_name`
  );
  const tableSet = new Set(existing.rows.map((row) => row.table_name));
  const requiredExisting = ["people", "external_identities", "product_opportunities", "activity_logs"];
  const stageTables = [
    "schema_migrations", "organizations", "businesses", "positions", "assignments",
    "object_registry", "object_relations", "work_items", "work_item_participants",
    "work_sessions", "work_evidence", "money_events", "result_facts", "business_events",
    "knowledge_routes", "ai_executions", "ai_talents", "ai_offices", "ai_assignments"
  ];
  const report = {
    database: process.env.DB_NAME || "(DATABASE_URL)",
    checkedAt: new Date().toISOString(),
    existingMinimalTables: {},
    existingMinimalRowCounts: {},
    stageTables: {},
    appliedMigrations: [],
    peopleColumns: [],
    productOpportunityColumns: [],
    warnings: []
  };

  for (const table of requiredExisting) {
    report.existingMinimalTables[table] = tableSet.has(table);
    report.existingMinimalRowCounts[table] = tableSet.has(table) ? await safeCount(table) : null;
  }
  for (const table of stageTables) report.stageTables[table] = tableSet.has(table);

  if (tableSet.has("people")) report.peopleColumns = await columnInfo("people");
  if (tableSet.has("product_opportunities")) report.productOpportunityColumns = await columnInfo("product_opportunities");
  if (tableSet.has("schema_migrations")) {
    const migrations = await pool.query("SELECT version, description, applied_at FROM public.schema_migrations ORDER BY version");
    report.appliedMigrations = migrations.rows;
  }

  const peopleId = report.peopleColumns.find((column) => column.column_name === "id");
  if (!peopleId) report.warnings.push("public.people.id was not confirmed. Keep person_id as logical reference until resolved.");
  else report.peopleIdType = peopleId.udt_name || peopleId.data_type;

  for (const table of requiredExisting) {
    if (!tableSet.has(table)) report.warnings.push(`Required existing canonical table is missing: public.${table}`);
  }

  console.log(JSON.stringify(report, null, 2));
}

main().then(() => pool.end()).catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => {});
  process.exit(1);
});
