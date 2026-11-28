/* AIONE API Client｜统一前端后端入口 */
const STORAGE_KEY = "miwa-aione:api-base-url:v1";
const AUTH_SESSION_KEY = "aione.preview.session.v3";

function isLocalDevelopmentHost() {
  const host = window.location.hostname;
  return host === "127.0.0.1" || host === "localhost";
}

function normalizeBase(value) {
  return String(value || "").replace(/\/$/, "");
}

function clearLegacyApiOverride() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

export function getAioneApiBaseUrl() {
  if(window.AIONE_SELECTION_PREVIEW && isLocalDevelopmentHost())return window.location.origin;
  if (isLocalDevelopmentHost()) {
    if (window.AIONE_API_BASE_URL) return normalizeBase(window.AIONE_API_BASE_URL);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return normalizeBase(stored);
    } catch (_) {}
    return `http://${window.location.hostname}:8080`;
  }

  // Hosted AIONE must always use the same-origin /api bridge.
  // Remove stale browser-local runtime overrides so production can never route
  // back to a deleted, dev, or legacy backend.
  clearLegacyApiOverride();
  return "";
}

export function setAioneApiBaseUrl(value) {
  if (!isLocalDevelopmentHost()) {
    clearLegacyApiOverride();
    return;
  }
  try { localStorage.setItem(STORAGE_KEY, normalizeBase(value)); } catch (_) {}
}

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
  const headers = { "Content-Type": "application/json", "x-aione-source-system": "aione-web", "x-aione-request":"1" };
  const googleIdToken = getGoogleIdToken();
  if (googleIdToken) headers.Authorization = `Bearer ${googleIdToken}`;
  if (identity.subjectId) headers["x-aione-person-id"] = identity.subjectId;
  const assignmentId = window.AIONEPreviewPermissionContext?.assignmentId;
  if (assignmentId) headers["x-aione-assignment-id"] = assignmentId;
  return headers;
}

export async function aioneApi(path, options = {}) {
  const prefix = '/api/v1/selection-workspace';
  const relative = path.startsWith(prefix) ? path.slice(prefix.length) : '';
  const transferable = /^\/records\/[^/?]+(?:\/assets)?$/.test(relative) || ['/records','/sku-file','/pool/collect', '/pool/preflight'].includes(relative);
  const transferMethod=/^\/records\/[^/?]+$/.test(relative)?'PATCH':'POST';
  if (transferable && (options.method || 'GET').toUpperCase() === transferMethod && typeof options.body === 'string' && new Blob([options.body]).size > 3 * 1024 * 1024) {
    const bytes = new TextEncoder().encode(options.body);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
    for (let attempt = 0; attempt < 2; attempt++) {
    const transfer = await aioneApi(prefix + '/upload-transport', { method: 'POST', body: JSON.stringify({ path: relative, size: bytes.length, sha256: hash }) });
    try {
      for (let offset = 0, part = 0; offset < bytes.length; offset += transfer.chunkBytes, part++) {
        let binary = '';
        const chunk = bytes.subarray(offset, offset + transfer.chunkBytes);
        for (let i = 0; i < chunk.length; i += 16384) binary += String.fromCharCode(...chunk.subarray(i, i + 16384));
        await aioneApi(prefix + '/upload-transport/' + transfer.id + '/' + part, { method: 'PUT', body: JSON.stringify({ base64: btoa(binary) }), signal: options.signal });
      }
      return await aioneApi(path, { ...options, body: JSON.stringify({ uploadTransportId: transfer.id }) });
    } catch (error) {
      // Only an explicit pre-execution transport rejection is safe to replay.
      // A renewed transport still requires the same authenticated employee.
      if (attempt || error.status !== 404 || error.message !== '上传已过期或无权限') throw error;
    } finally {
      await aioneApi(prefix + '/upload-transport/' + transfer.id, { method: 'DELETE' }).catch(() => {});
    }
    }
  }
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

export async function aioneImageBlobInfo(path) {
  if (/^\/api\/v1\/selection-workspace\/records\/[^/?]+\/assets\/[^/?]+$/.test(path)) {
    const { assetTransfer: meta } = await aioneApi(path + '?transport=manifest');
    if (!meta?.type?.startsWith('image/') || !Number.isInteger(meta.size) || meta.size < 1 || meta.size > 100 * 1024 * 1024 || !Number.isInteger(meta.chunkBytes) || meta.chunkBytes < 1) throw new Error('图片内容无效');
    const parts = [];
    for (let offset = 0, part = 0; offset < meta.size; offset += meta.chunkBytes, part++) {
      const data = await aioneApi(path + '?transport=chunk&part=' + part);
      const binary = atob(data.base64);
      parts.push(Uint8Array.from(binary, c => c.charCodeAt(0)));
    }
    const blob = new Blob(parts, { type: meta.type });
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())), b => b.toString(16).padStart(2, '0')).join('');
    if (blob.size !== meta.size || hash !== meta.sha256) throw new Error('图片完整性校验失败，请重新加载');
    return { url: URL.createObjectURL(blob), type: blob.type, size: blob.size };
  }
  const response = await fetch(getAioneApiBaseUrl() + path, {
    method: "GET",
    headers: { ...actorHeaders(), Accept: "image/*" },
    cache: "default"
  });
  if (!response.ok) {
    let payload = {};
    try { payload = await response.json(); } catch (_) {}
    throw new Error(payload.message || payload.error || "图片读取失败（HTTP " + response.status + "）");
  }
  const blob = await response.blob();
  if (!blob.type.startsWith("image/") || !blob.size) throw new Error("图片内容无效");
  return {url:URL.createObjectURL(blob),type:blob.type,size:blob.size};
}

export async function aioneImageBlobUrl(path) {
  return (await aioneImageBlobInfo(path)).url;
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
