import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../../../../../data-code/migrations");
const files = [
  "0069_recurring_work_foundation.sql",
  "0070_work_home_v2_assignment_and_batch.sql",
  "0071_seed_1688_weekly_selection.sql",
  "0072_person_drive_submission_bindings.sql",
];

async function main() {
  for (const file of files) {
    const version = file.slice(0, 4);
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}...`);
    await pool.query(sql);
    await pool.query(
      `INSERT INTO public.schema_migrations(version, description)
       VALUES ($1, $2)
       ON CONFLICT (version)
       DO UPDATE SET description = EXCLUDED.description`,
      [version, file]
    );
    console.log(`Applied ${file}`);
  }
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end().catch(() => {});
    process.exit(1);
  });
