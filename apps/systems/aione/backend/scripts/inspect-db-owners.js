import pool from "../db.js";

const tables = ["businesses", "people", "work_items", "work_evidence", "schema_migrations"];

const result = await pool.query(`
  SELECT c.relname AS table_name,
         pg_get_userbyid(c.relowner) AS owner
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = ANY($1::text[])
  ORDER BY c.relname
`, [tables]);

console.log(JSON.stringify(result.rows, null, 2));
await pool.end();
