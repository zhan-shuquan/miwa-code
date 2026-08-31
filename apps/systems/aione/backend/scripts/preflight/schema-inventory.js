export async function collectDbContext(db) {
  const { rows } = await db.query(`
    SELECT current_database() AS database,
           current_schema() AS schema,
           current_user AS db_user,
           current_setting('server_version') AS server_version,
           current_setting('TimeZone') AS timezone,
           current_setting('transaction_read_only') AS transaction_read_only,
           now() AS checked_at
  `);
  return rows[0];
}

export async function collectSchemaInventory(db) {
  const tables = await db.query(`
    SELECT c.relname AS table_name,
           CASE c.relkind WHEN 'r' THEN 'table' WHEN 'p' THEN 'partitioned_table' WHEN 'v' THEN 'view' WHEN 'm' THEN 'materialized_view' ELSE c.relkind::text END AS object_type,
           pg_total_relation_size(c.oid)::bigint AS total_bytes,
           COALESCE(c.reltuples, 0)::bigint AS estimated_rows
      FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m')
     ORDER BY c.relname
  `);

  const columns = await db.query(`
    SELECT table_name, ordinal_position, column_name, data_type, udt_name,
           is_nullable, column_default, is_identity, identity_generation,
           is_generated, generation_expression
      FROM information_schema.columns
     WHERE table_schema='public'
     ORDER BY table_name, ordinal_position
  `);

  const constraints = await db.query(`
    SELECT conrelid::regclass::text AS table_name,
           conname AS constraint_name,
           contype AS constraint_type,
           pg_get_constraintdef(oid) AS definition,
           condeferrable AS deferrable,
           convalidated AS validated
      FROM pg_constraint
     WHERE connamespace='public'::regnamespace
     ORDER BY conrelid::regclass::text, conname
  `);

  const indexes = await db.query(`
    SELECT schemaname, tablename AS table_name, indexname AS index_name, indexdef
      FROM pg_indexes
     WHERE schemaname='public'
     ORDER BY tablename, indexname
  `);

  const triggers = await db.query(`
    SELECT event_object_table AS table_name, trigger_name, event_manipulation, action_timing, action_statement
      FROM information_schema.triggers
     WHERE trigger_schema='public'
     ORDER BY event_object_table, trigger_name
  `);

  const extensions = await db.query(`SELECT extname AS name, extversion AS version FROM pg_extension ORDER BY extname`);

  return { tables: tables.rows, columns: columns.rows, constraints: constraints.rows, indexes: indexes.rows, triggers: triggers.rows, extensions: extensions.rows };
}

export function indexSchema(inventory) {
  const tables = new Set(inventory.tables.map((row) => row.table_name));
  const columns = new Map();
  for (const row of inventory.columns) {
    if (!columns.has(row.table_name)) columns.set(row.table_name, new Set());
    columns.get(row.table_name).add(row.column_name);
  }
  return { tables, columns };
}
