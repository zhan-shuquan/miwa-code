/* ========================================
   Business Object Store｜二级页面统一对象存储（预演）
   正式数据库接入前，所有新业务页面只通过这一层读写对象。
======================================== */
const PREFIX = "miwa-aione:v1.1:business-objects:"; // V1.2继续沿用，避免内测本地业务对象因升级丢失。

const clone = (value) => JSON.parse(JSON.stringify(value));

function key(routeId) {
  return `${PREFIX}${routeId}`;
}

function normalizeObject(routeId, item = {}) {
  return {
    ...item,
    id: item.id || `${routeId.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString()
  };
}

export function loadBusinessObjects(routeId, seed = []) {
  try {
    const raw = window.localStorage.getItem(key(routeId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return clone(seed || []);
}

export function saveBusinessObjects(routeId, objects = []) {
  const normalized = objects.map((item) => normalizeObject(routeId, item));
  try {
    window.localStorage.setItem(key(routeId), JSON.stringify(normalized));
  } catch (_) {}
  window.dispatchEvent(new CustomEvent("aione:business-objects-updated", { detail: { routeId, objects: clone(normalized) } }));
  return normalized;
}

export function createBusinessObject(routeId, object, seed = []) {
  const current = loadBusinessObjects(routeId, seed);
  const created = normalizeObject(routeId, object);
  const next = saveBusinessObjects(routeId, [created, ...current]);
  window.dispatchEvent(new CustomEvent("aione:business-object-created", { detail: { routeId, object: clone(created) } }));
  return { object: created, objects: next };
}

export function importBusinessObjects(routeId, rows = [], seed = []) {
  const current = loadBusinessObjects(routeId, seed);
  const existingIds = new Set(current.map((item) => String(item.id || "")));
  const additions = rows.map((item) => normalizeObject(routeId, item)).filter((item) => !existingIds.has(String(item.id || "")));
  const next = saveBusinessObjects(routeId, [...additions, ...current]);
  return { added: additions.length, objects: next };
}
