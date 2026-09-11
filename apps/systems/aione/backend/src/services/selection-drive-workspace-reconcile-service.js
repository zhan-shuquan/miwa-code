import pool from "../../db.js";
import { provisionSelectionDriveWorkspace } from "./selection-drive-workspace-service.js";

function currentWorkspace(metadata) {
  const workspace = metadata && typeof metadata === "object" ? metadata.selectionDriveWorkspace : null;
  return workspace && workspace.folderId ? workspace : null;
}

export async function provisionPendingSelectionDriveWorkspaces({ parentFolderId, driveId, limit = 500 } = {}) {
  const normalizedParent = String(parentFolderId || "").trim();
  if (!normalizedParent) {
    const error = new Error("AIONE selection workspace parent folder id is required.");
    error.code = "selection_workspace_parent_required";
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `SELECT id, selection_no, title, source_platform, source_ref, metadata
       FROM public.product_opportunities
      WHERE archived_at IS NULL
        AND selection_no IS NOT NULL
        AND source_platform='1688'
        AND COALESCE(metadata->'selectionDriveWorkspace'->>'folderId','')=''
      ORDER BY selection_date ASC NULLS LAST, selection_no ASC
      LIMIT $1`,
    [Math.max(1, Math.min(Number(limit || 500), 1000))]
  );

  const mappings = [];
  const errors = [];
  for (const selection of result.rows) {
    try {
      const workspace = await provisionSelectionDriveWorkspace({ selection, parentFolderId: normalizedParent, driveId });
      const updated = await pool.query(
        `UPDATE public.product_opportunities
            SET metadata=COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('selectionDriveWorkspace',$2::jsonb),
                updated_at=NOW(), record_version=record_version+1
          WHERE id=$1
            AND archived_at IS NULL
            AND COALESCE(metadata->'selectionDriveWorkspace'->>'folderId','')=''
          RETURNING id, selection_no, title, metadata`,
        [selection.id, JSON.stringify({ ...workspace, provisionedAt: new Date().toISOString() })]
      );
      const finalRow = updated.rows[0] || selection;
      const finalWorkspace = currentWorkspace(finalRow.metadata) || workspace;
      mappings.push({
        sourceRef: selection.source_ref,
        selectionId: selection.id,
        selectionNo: selection.selection_no,
        title: selection.title,
        driveFolderId: finalWorkspace.folderId,
        driveFolderName: finalWorkspace.folderName,
        driveWebViewLink: finalWorkspace.webViewLink || null,
        folders: finalWorkspace.folders || workspace.folders,
        reused: workspace.reused
      });
    } catch (error) {
      errors.push({
        selectionId: selection.id,
        selectionNo: selection.selection_no,
        sourceRef: selection.source_ref,
        code: error.code || "selection_workspace_provision_failed",
        message: error.message
      });
    }
  }

  return {
    parentFolderId: normalizedParent,
    scannedPendingCount: result.rowCount,
    provisionedCount: mappings.length,
    errorCount: errors.length,
    mappings,
    errors
  };
}
