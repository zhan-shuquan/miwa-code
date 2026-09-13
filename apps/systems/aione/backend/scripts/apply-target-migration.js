import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "../db.js";

const TARGET = String(process.env.AIONE_MIGRATION_VERSION || "").trim();
const ALLOW = String(process.env.AIONE_ALLOW_TARGETED_MIGRATION || "").trim();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../../../../../data-code/migrations");

function stop(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

function parse(file) {
  const match = file.match(/^(\d{4})_([^.]*)\.sql$/);
  return match ? { file, version: match[1], description: match[2].replaceAll("_", " ") } : null;
}

async function verifyDesignCenter() {
  const objects = await pool.query(`
    SELECT to_regclass('public.design_instruction_presets') AS presets,
           to_regclass('public.product_tag_cards') AS tag_cards,
           to_regclass('public.product_hero_specs') AS hero_specs
  `);
  const row = objects.rows[0] || {};
  if (!row.presets || !row.tag_cards || !row.hero_specs) stop("design_center_schema_missing", "Design Center V1 tables are missing after migration.", row);
  const template = await pool.query("SELECT id FROM public.design_templates WHERE id='dtpl_unified_product_hero_square_v1' AND archived_at IS NULL");
  if (template.rowCount !== 1) stop("design_center_template_missing", "Unified Hero template is missing after migration.");
}

async function main() {
  if (ALLOW !== "YES") stop("targeted_migration_guard_required", "Explicit targeted migration guard is required.");
  if (TARGET !== "0100") stop("targeted_migration_wrong_version", "This preview runner is locked to migration 0100.", { target: TARGET });

  const entries = (await fs.readdir(migrationsDir)).map(parse).filter(Boolean).sort((a, b) => a.version.localeCompare(b.version));
  const target = entries.find((item) => item.version === TARGET);
  if (!target) stop("target_migration_not_found", `Migration ${TARGET} was not found.`);

  const appliedRows = await pool.query("SELECT version FROM public.schema_migrations ORDER BY version");
  const applied = new Set(appliedRows.rows.map((row) => String(row.version)));
  const missingEarlier = entries.filter((item) => item.version < TARGET && !applied.has(item.version));
  if (missingEarlier.length) stop("earlier_migration_missing", "Earlier Repo migrations are missing; targeted migration aborted.", { missing: missingEarlier.map((item) => item.file) });

  if (!applied.has(TARGET)) {
    const sql = await fs.readFile(path.join(migrationsDir, target.file), "utf8");
    process.stdout.write(`[AIONE] Applying reviewed targeted migration ${target.file}\n`);
    await pool.query(sql);
    await pool.query(
      "INSERT INTO public.schema_migrations(version, description) VALUES ($1,$2) ON CONFLICT (version) DO NOTHING",
      [target.version, target.description]
    );
  } else {
    process.stdout.write(`[AIONE] Migration ${TARGET} already applied; verifying idempotent state.\n`);
  }

  await verifyDesignCenter();
  process.stdout.write(`${JSON.stringify({ ok: true, targetMigration: TARGET, appliedNow: !applied.has(TARGET) }, null, 2)}\n`);
  process.stdout.write("[AIONE] DESIGN CENTER TARGET MIGRATION 0100 PASS\n");
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.code || "targeted_migration_failed", message: error.message, details: error.details || undefined }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await pool.end().catch(() => {});
});
