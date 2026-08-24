/* AIONE API Client｜统一前端后端入口 */
const STORAGE_KEY = "miwa-aione:api-base-url:v1";
function normalizeBase(value) { return String(value || "").replace(/\/$/, ""); }
export function getAioneApiBaseUrl() {
  if (window.AIONE_API_BASE_URL) return normalizeBase(window.AIONE_API_BASE_URL);
  try { const stored = localStorage.getItem(STORAGE_KEY); if (stored) return normalizeBase(stored); } catch (_) {}
  const host = window.location.hostname;
  if (host === "127.0.0.1" || host === "localhost") return `http://${host}:8080`;
  return "";
}
export function setAioneApiBaseUrl(value) { try { localStorage.setItem(STORAGE_KEY, normalizeBase(value)); } catch (_) {} }
function actorHeaders() {
  const identity = window.AIONEPreviewIdentity || {};
  const headers = { "Content-Type": "application/json", "x-aione-source-system": "aione-web" };
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
