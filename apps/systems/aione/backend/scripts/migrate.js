import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultMigrationsDir = path.resolve(__dirname, "../../../../../data-code/migrations");
const migrationsDir = process.env.AIONE_MIGRATIONS_DIR || defaultMigrationsDir;

async function ensureMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function parseMigrationName(fileName) {
  const match = fileName.match(/^(\d+)_([^.]*)\.sql$/);
  return match ? { version: match[1], description: match[2].replaceAll("_", " ") } : null;
}

async function main() {
  await ensureMigrationTable();
  const appliedRows = await pool.query("SELECT version FROM public.schema_migrations");
  const applied = new Set(appliedRows.rows.map((row) => row.version));
  const files = (await fs.readdir(migrationsDir)).filter((file) => /^\d+_.*\.sql$/.test(file)).sort();

  for (const file of files) {
    const meta = parseMigrationName(file);
    if (!meta || applied.has(meta.version)) continue;
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}...`);
    await pool.query(sql);
    await pool.query(
      "INSERT INTO public.schema_migrations(version, description) VALUES ($1,$2) ON CONFLICT (version) DO NOTHING",
      [meta.version, meta.description]
    );
    console.log(`Applied ${file}`);
  }
}

main().then(() => pool.end()).catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => {});
  process.exit(1);
});
