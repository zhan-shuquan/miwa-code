import pool from "../db.js";
import { import1688DriveInbox } from "../src/services/selection-import-service.js";
import { provisionPendingSelectionDriveWorkspaces } from "../src/services/selection-drive-workspace-reconcile-service.js";

async function main() {
  const folderId = String(process.env.AIONE_1688_SELECTION_INBOX_FOLDER_ID || "").trim();
  const workspaceParentFolderId = String(process.env.AIONE_SELECTION_WORKSPACE_PARENT_FOLDER_ID || folderId).trim();
  const driveId = String(process.env.AIONE_SHARED_DRIVE_ID || "").trim() || null;

  const result = await import1688DriveInbox({ folderId, driveId });
  const workspaces = await provisionPendingSelectionDriveWorkspaces({
    parentFolderId: workspaceParentFolderId,
    driveId,
    limit: 1000
  });

  process.stdout.write(`${JSON.stringify({ ok: true, ...result, workspaces }, null, 2)}\n`);

  const failedImports = result.imports.filter((item) => item.status === "failed");
  if (failedImports.length || workspaces.errorCount) process.exitCode = 10;
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.code || "selection_drive_import_failed", message: error.message, details: error.details || null }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
