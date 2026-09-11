import { createDriveFolderIfAbsent } from "../integrations/google-drive-client.js";

const CHILD_FOLDERS = Object.freeze(["01_SKU图", "02_产品图", "03_实拍图"]);

function sanitizeShortName(value) {
  const raw = String(value || "").trim();
  const withoutNoise = raw
    .replace(/(?:1688|阿里巴巴|新款|爆款|厂家直销|厂家|批发|跨境|货源|一件代发|包邮)/gi, " ")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compact = withoutNoise.replace(/\s+/g, "");
  return (compact || "选品").slice(0, 28);
}

export function buildSelectionWorkspaceFolderName(selection) {
  const selectionNo = String(selection?.selection_no || selection?.selectionNo || "").trim();
  if (!selectionNo) {
    const error = new Error("selection_no is required before creating a Drive workspace.");
    error.code = "selection_workspace_number_required";
    error.statusCode = 409;
    throw error;
  }
  return `${selectionNo}_${sanitizeShortName(selection?.title)}`;
}

export async function provisionSelectionDriveWorkspace({ selection, parentFolderId, driveId }) {
  const folderName = buildSelectionWorkspaceFolderName(selection);
  const root = await createDriveFolderIfAbsent({ parentFolderId, name: folderName, driveId });
  const children = {};
  for (const childName of CHILD_FOLDERS) {
    const child = await createDriveFolderIfAbsent({ parentFolderId: root.folder.id, name: childName, driveId });
    children[childName] = {
      folderId: child.folder.id,
      folderName: child.folder.name,
      webViewLink: child.folder.webViewLink || null,
      reused: child.reused
    };
  }
  return {
    folderId: root.folder.id,
    folderName: root.folder.name,
    webViewLink: root.folder.webViewLink || null,
    reused: root.reused,
    folders: children,
    contractVersion: "selection-drive-workspace-v1"
  };
}
