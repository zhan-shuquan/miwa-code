/* AIONE API Client｜统一前端后端入口 */
const STORAGE_KEY = "miwa-aione:api-base-url:v1";
const AUTH_SESSION_KEY = "aione.preview.session.v3";
const TEST_HOST = "aione-test.miwa-happyhouse.com";
const DEV_BACKEND = "https://aione-backend-dev-49629089449.asia-northeast1.run.app";
function normalizeBase(value) { return String(value || "").replace(/\/$/, ""); }
export function getAioneApiBaseUrl() {
  if (window.AIONE_API_BASE_URL) return normalizeBase(window.AIONE_API_BASE_URL);
  const host = window.location.hostname;
  if (host === TEST_HOST) return DEV_BACKEND;
  try { const stored = localStorage.getItem(STORAGE_KEY); if (stored) return normalizeBase(stored); } catch (_) {}
  if (host === "127.0.0.1" || host === "localhost") return `http://${host}:8080`;
  return "";
}
export function setAioneApiBaseUrl(value) { try { localStorage.setItem(STORAGE_KEY, normalizeBase(value)); } catch (_) {} }
function getGoogleIdToken() {
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return "";
    const session = JSON.parse(raw);
    const token = String(session.googleCredential || "").trim();
    const expiresAt = Number(session.googleExpiresAt || 0);
    if (!token || !expiresAt || expiresAt <= Date.now() + 30000) return "";
    return token;
  } catch (_) {
    return "";
  }
}

function actorHeaders() {
  const identity = window.AIONEPreviewIdentity || {};
  const headers = { "Content-Type": "application/json", "x-aione-source-system": "aione-web" };
  const googleIdToken = getGoogleIdToken();
  if (googleIdToken) headers.Authorization = `Bearer ${googleIdToken}`;
  if (identity.subjectId) headers["x-aione-person-id"] = identity.subjectId;
  const assignmentId = window.AIONEPreviewPermissionContext?.assignmentId;
  if (assignmentId) headers["x-aione-assignment-id"] = assignmentId;
  return headers;
}
export async function aioneApi(path, options = {}) {
  const base = getAioneApiBaseUrl();
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...actorHeaders(), ...(options.headers || {}) },
    cache: "no-store"
  });
  let payload = null;
  try { payload = await response.json(); } catch (_) { payload = { message: await response.text().catch(() => "") }; }
  if (!response.ok) {
    const error = new Error(payload?.message || payload?.error || `AIONE API ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}


function filenameFromDisposition(value, fallback = "download") {
  const raw = String(value || "");
  const utf8 = raw.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) {
    try { return decodeURIComponent(utf8[1]); } catch (_) {}
  }
  const basic = raw.match(/filename="?([^";]+)"?/i);
  return basic?.[1] || fallback;
}

export async function aioneDownload(path, options = {}) {
  const base = getAioneApiBaseUrl();
  const response = await fetch(`${base}${path}`, {
    method: "GET",
    headers: { ...actorHeaders(), Accept: options.accept || "application/octet-stream", ...(options.headers || {}) },
    cache: "no-store"
  });

  if (!response.ok) {
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    const error = new Error(payload?.message || payload?.error || `AIONE download ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const blob = await response.blob();
  const fileName = filenameFromDisposition(response.headers.get("content-disposition"), options.fileName || "download");
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  return { fileName, size: blob.size, contentType: blob.type || response.headers.get("content-type") || "" };
}
