import { systemConfig } from "../config/system-config.js";
/* ========================================
   Content Object Store｜美和内容对象统一存储（预演）
   正式数据库接入前，美和之家与知识之家只通过这一层读写内容对象。
======================================== */
const PREFIX = "miwa-aione:v1.2:content-objects:";
const clone = (value) => JSON.parse(JSON.stringify(value));
const key = (routeId) => `${PREFIX}${routeId}`;

function currentActor() {
  const user = systemConfig.header?.user || {};
  return user.employeeId && user.employeeId !== "PENDING" ? user.employeeId : (user.displayName ? `USER:${user.displayName}` : "SYSTEM");
}
function normalize(routeId, item = {}) {
  const now = new Date().toISOString(); const actor = currentActor();
  return {
    ...item,
    id: item.id || `${routeId.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now,
    createdBy: item.createdBy || actor,
    updatedBy: item.updatedBy || actor,
    recordVersion: Number(item.recordVersion || 1),
    sourceSystem: item.sourceSystem || "AIONE"
  };
}

export function loadContentObjects(routeId, seed = []) {
  try {
    const raw = window.localStorage.getItem(key(routeId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const existingIds = new Set(parsed.map((item) => String(item?.id || "")).filter(Boolean));
        const missingSeeds = clone(seed || []).filter((item) => item?.id && !existingIds.has(String(item.id)));
        return [...missingSeeds, ...parsed];
      }
    }
  } catch (_) {}
  return clone(seed || []);
}

export function saveContentObjects(routeId, items = []) {
  const normalized = items.map((item) => normalize(routeId, item));
  try { window.localStorage.setItem(key(routeId), JSON.stringify(normalized)); } catch (_) {}
  window.dispatchEvent(new CustomEvent("aione:content-objects-updated", { detail: { routeId, items: clone(normalized) } }));
  return normalized;
}

export function createContentObject(routeId, item, seed = []) {
  const current = loadContentObjects(routeId, seed);
  const created = normalize(routeId, item);
  const items = saveContentObjects(routeId, [created, ...current]);
  window.dispatchEvent(new CustomEvent("aione:content-object-created", { detail: { routeId, item: clone(created) } }));
  return { item: created, items };
}

export function importContentObjects(routeId, rows = [], seed = []) {
  const current = loadContentObjects(routeId, seed);
  const existingIds = new Set(current.map((item) => String(item.id || "")));
  const additions = rows.map((item) => normalize(routeId, item)).filter((item) => !existingIds.has(String(item.id || "")));
  const items = saveContentObjects(routeId, [...additions, ...current]);
  return { added: additions.length, items };
}
