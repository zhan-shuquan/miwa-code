import { GoogleAuth } from "google-auth-library";

const DRIVE_READ_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const DRIVE_WRITE_SCOPE = "https://www.googleapis.com/auth/drive";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_WORKSPACE_MIME_PREFIX = "application/vnd.google-apps.";
const GOOGLE_DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

function enabled(value) {
  return String(value ?? "true").toLowerCase() !== "false";
}

const driveWriteEnabled = enabled(process.env.AIONE_DRIVE_WRITE_ENABLED || "false");
const auth = new GoogleAuth({ scopes: [driveWriteEnabled ? DRIVE_WRITE_SCOPE : DRIVE_READ_SCOPE] });
let cachedClient = null;

export function isDriveProxyEnabled() {
  return enabled(process.env.AIONE_DRIVE_PROXY_ENABLED);
}

export function isDriveWriteEnabled() {
  return driveWriteEnabled;
}

async function getClient() {
  if (!cachedClient) cachedClient = await auth.getClient();
  return cachedClient;
}

function escapeDriveQuery(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function driveFileUrl(fileId) {
  return `${GOOGLE_DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
}

function exportMimeType(mimeType) {
  const map = {
    "application/vnd.google-apps.document": "application/pdf",
    "application/vnd.google-apps.spreadsheet": "application/pdf",
    "application/vnd.google-apps.presentation": "application/pdf",
    "application/vnd.google-apps.drawing": "application/pdf"
  };
  return map[mimeType] || "application/pdf";
}

function driveExportUrl(fileId, mimeType) {
  const exportType = exportMimeType(mimeType);
  return `${GOOGLE_DRIVE_API}/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportType)}`;
}

function applySharedDriveParams(params, driveId) {
  params.set("includeItemsFromAllDrives", "true");
  params.set("supportsAllDrives", "true");
  if (!driveId) return;
  params.set("corpora", "drive");
  params.set("driveId", String(driveId));
}

function normalizeDriveError(error, operation) {
  const status = Number(error?.response?.status || error?.code || 0);
  if (status === 404 || status === 403) {
    const driveError = new Error(operation === "write"
      ? "AIONE runtime cannot create folders in the MIWA shared drive. Grant the runtime service account Content manager access to the shared drive or the configured selection workspace parent folder."
      : "AIONE backend cannot access this Google Drive resource. Confirm that the AIONE runtime service account can read the MIWA shared drive.");
    driveError.code = operation === "write" ? "drive_runtime_write_access_missing" : "drive_runtime_access_missing";
    driveError.statusCode = 503;
    driveError.remoteCode = status || undefined;
    return driveError;
  }
  const driveError = new Error(operation === "write" ? "Google Drive folder creation failed." : "Google Drive request failed.");
  driveError.code = operation === "write" ? "drive_create_folder_failed" : "drive_request_failed";
  driveError.statusCode = 502;
  driveError.remoteCode = status || undefined;
  return driveError;
}

export async function listDriveFolderFiles({ folderId, driveId, pageSize = 100 }) {
  if (!isDriveProxyEnabled()) {
    const error = new Error("AIONE Drive proxy is disabled.");
    error.code = "drive_proxy_disabled";
    error.statusCode = 503;
    throw error;
  }
  if (!folderId) {
    const error = new Error("Google Drive folder id is required.");
    error.code = "drive_folder_required";
    error.statusCode = 400;
    throw error;
  }

  const client = await getClient();
  const files = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      q: `'${escapeDriveQuery(folderId)}' in parents and trashed=false`,
      spaces: "drive",
      pageSize: String(Math.max(1, Math.min(Number(pageSize || 100), 1000))),
      fields: "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,parents)",
      orderBy: "modifiedTime desc,name"
    });
    applySharedDriveParams(params, driveId);
    if (pageToken) params.set("pageToken", pageToken);

    try {
      const response = await client.request({
        url: `${GOOGLE_DRIVE_API}/files?${params.toString()}`,
        method: "GET"
      });
      const data = response.data || {};
      files.push(...(Array.isArray(data.files) ? data.files : []));
      pageToken = String(data.nextPageToken || "");
    } catch (error) {
      throw normalizeDriveError(error, "read");
    }
  } while (pageToken);

  return files;
}

async function findChildFolderByName({ parentFolderId, name, driveId }) {
  const client = await getClient();
  const params = new URLSearchParams({
    q: `'${escapeDriveQuery(parentFolderId)}' in parents and name='${escapeDriveQuery(name)}' and mimeType='${GOOGLE_DRIVE_FOLDER_MIME}' and trashed=false`,
    spaces: "drive",
    pageSize: "10",
    fields: "files(id,name,mimeType,createdTime,modifiedTime,webViewLink,parents)",
    orderBy: "createdTime asc"
  });
  applySharedDriveParams(params, driveId);
  try {
    const response = await client.request({ url: `${GOOGLE_DRIVE_API}/files?${params.toString()}`, method: "GET" });
    const files = Array.isArray(response.data?.files) ? response.data.files : [];
    if (files.length > 1) {
      const error = new Error(`Multiple Google Drive folders named ${name} exist under the configured parent.`);
      error.code = "drive_duplicate_child_folder";
      error.statusCode = 409;
      error.details = { parentFolderId, name, folderIds: files.map((file) => file.id) };
      throw error;
    }
    return files[0] || null;
  } catch (error) {
    if (error?.code === "drive_duplicate_child_folder") throw error;
    throw normalizeDriveError(error, "read");
  }
}

export async function createDriveFolderIfAbsent({ parentFolderId, name, driveId }) {
  if (!isDriveProxyEnabled()) {
    const error = new Error("AIONE Drive proxy is disabled.");
    error.code = "drive_proxy_disabled";
    error.statusCode = 503;
    throw error;
  }
  if (!isDriveWriteEnabled()) {
    const error = new Error("AIONE Drive write capability is disabled for this runtime.");
    error.code = "drive_write_disabled";
    error.statusCode = 503;
    throw error;
  }
  const parent = String(parentFolderId || "").trim();
  const folderName = String(name || "").trim();
  if (!parent) throw Object.assign(new Error("Google Drive parent folder id is required."), { code: "drive_parent_folder_required", statusCode: 400 });
  if (!folderName) throw Object.assign(new Error("Google Drive folder name is required."), { code: "drive_folder_name_required", statusCode: 400 });

  const existing = await findChildFolderByName({ parentFolderId: parent, name: folderName, driveId });
  if (existing) return { folder: existing, reused: true };

  const client = await getClient();
  const params = new URLSearchParams({ supportsAllDrives: "true", fields: "id,name,mimeType,createdTime,modifiedTime,webViewLink,parents" });
  try {
    const response = await client.request({
      url: `${GOOGLE_DRIVE_API}/files?${params.toString()}`,
      method: "POST",
      data: {
        name: folderName,
        mimeType: GOOGLE_DRIVE_FOLDER_MIME,
        parents: [parent]
      }
    });
    return { folder: response.data, reused: false };
  } catch (error) {
    throw normalizeDriveError(error, "write");
  }
}

export async function fetchDriveFileStream({ fileId, mimeType }) {
  if (!isDriveProxyEnabled()) {
    const error = new Error("AIONE Drive proxy is disabled.");
    error.code = "drive_proxy_disabled";
    error.statusCode = 503;
    throw error;
  }

  const client = await getClient();
  const isNativeGoogleFile = String(mimeType || "").startsWith(GOOGLE_WORKSPACE_MIME_PREFIX);
  const url = isNativeGoogleFile ? driveExportUrl(fileId, mimeType) : driveFileUrl(fileId);

  try {
    const response = await client.request({
      url,
      method: "GET",
      responseType: "stream"
    });
    return {
      stream: response.data,
      contentType: String(response.headers?.["content-type"] || (isNativeGoogleFile ? exportMimeType(mimeType) : mimeType) || "application/octet-stream"),
      contentLength: String(response.headers?.["content-length"] || ""),
      exported: isNativeGoogleFile
    };
  } catch (error) {
    const status = Number(error?.response?.status || error?.code || 0);
    const driveError = new Error(status === 404 || status === 403
      ? "AIONE backend cannot access this Google Drive file. Grant the AIONE runtime service account Viewer access to the MIWA shared drive."
      : "Google Drive file retrieval failed.");
    driveError.code = status === 404 || status === 403 ? "drive_runtime_access_missing" : "drive_fetch_failed";
    driveError.statusCode = status === 404 || status === 403 ? 503 : 502;
    driveError.remoteCode = status || undefined;
    throw driveError;
  }
}
