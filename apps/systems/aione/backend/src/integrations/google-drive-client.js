import { GoogleAuth } from "google-auth-library";

const DRIVE_READ_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_WORKSPACE_MIME_PREFIX = "application/vnd.google-apps.";

const auth = new GoogleAuth({ scopes: [DRIVE_READ_SCOPE] });
let cachedClient = null;

function enabled(value) {
  return String(value ?? "true").toLowerCase() !== "false";
}

export function isDriveProxyEnabled() {
  return enabled(process.env.AIONE_DRIVE_PROXY_ENABLED);
}

async function getClient() {
  if (!cachedClient) cachedClient = await auth.getClient();
  return cachedClient;
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
      q: `'${String(folderId).replace(/'/g, "\\'")}' in parents and trashed=false`,
      spaces: "drive",
      pageSize: String(Math.max(1, Math.min(Number(pageSize || 100), 1000))),
      fields: "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,parents)",
      orderBy: "modifiedTime desc,name"
    });
    if (driveId) {
      params.set("corpora", "drive");
      params.set("driveId", String(driveId));
      params.set("includeItemsFromAllDrives", "true");
      params.set("supportsAllDrives", "true");
    }
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
      const status = Number(error?.response?.status || error?.code || 0);
      const driveError = new Error(status === 404 || status === 403
        ? "AIONE backend cannot list this Google Drive folder. Confirm that the AIONE runtime service account is a Viewer of the MIWA shared drive."
        : "Google Drive folder listing failed.");
      driveError.code = status === 404 || status === 403 ? "drive_runtime_access_missing" : "drive_list_failed";
      driveError.statusCode = status === 404 || status === 403 ? 503 : 502;
      driveError.remoteCode = status || undefined;
      throw driveError;
    }
  } while (pageToken);

  return files;
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
