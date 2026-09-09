import pool from "../db.js";
import { import1688DriveInbox } from "../src/services/selection-import-service.js";

async function main() {
  const folderId = String(process.env.AIONE_1688_SELECTION_INBOX_FOLDER_ID || "").trim();
  const driveId = String(process.env.AIONE_SHARED_DRIVE_ID || "").trim() || null;
  const result = await import1688DriveInbox({ folderId, driveId });
  process.stdout.write(`${JSON.stringify({ ok: true, ...result }, null, 2)}\n`);

  const failed = result.imports.filter((item) => item.status === "failed");
  if (failed.length) process.exitCode = 10;
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.code || "selection_drive_import_failed", message: error.message }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
