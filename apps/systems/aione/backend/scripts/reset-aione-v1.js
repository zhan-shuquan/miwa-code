import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../../..');
const baselinePath = path.join(repoRoot, 'data-code/current/0001_aione_current_baseline.sql');

if (process.env.AIONE_CONFIRM_CLEAN_RESET !== 'YES_RESET_AIONE_V1') {
  throw new Error('Refusing clean reset: set AIONE_CONFIRM_CLEAN_RESET=YES_RESET_AIONE_V1');
}

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'aione',
  host: process.env.INSTANCE_UNIX_SOCKET || process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  max: 1,
});

const client = await pool.connect();
try {
  const db = await client.query('select current_database() db, current_user usr');
  console.log('Reset target:', db.rows[0]);
  if (db.rows[0].db !== 'aione') throw new Error('Refusing reset outside database aione');

  console.log('Dropping public schema...');
  await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');

  console.log('Applying AIONE V1 CURRENT baseline...');
  const sql = fs.readFileSync(baselinePath, 'utf8');
  await client.query(sql);

  const tables = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname='public'
    ORDER BY tablename
  `);
  console.log('AIONE V1 tables:', tables.rows.map(r => r.tablename).join(', '));
  console.log('AIONE V1 CLEAN RESET SUCCESS');
} finally {
  client.release();
  await pool.end();
}
