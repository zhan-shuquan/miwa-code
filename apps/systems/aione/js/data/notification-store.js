/* ========================================
   AIONE Notification Store｜通知中心统一数据层
======================================== */
const STORAGE_KEY = "miwa-aione:v1.2:notifications";
const LEGACY_STORAGE_KEYS = ["miwa-aione:v1.1:notifications"];
const clone = (value) => JSON.parse(JSON.stringify(value));

function read() {
  try {
    let raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const legacyRaw = window.localStorage.getItem(legacyKey);
        if (!legacyRaw) continue;
        const legacyParsed = JSON.parse(legacyRaw);
        if (!Array.isArray(legacyParsed)) continue;
        raw = legacyRaw;
        try { window.localStorage.setItem(STORAGE_KEY, legacyRaw); } catch (_) {}
        break;
      }
    }
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function write(items) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (_) {}
  const unread = items.filter((item) => !item.readAt).length;
  window.dispatchEvent(new CustomEvent("aione:notifications-updated", { detail: { items: clone(items), unread } }));
  window.MIWAHeader?.setNotificationCount?.(unread);
  const important = items.find((item) => item.level === "important" && !item.readAt) || null;
  window.MIWAHeader?.setNotification?.(important ? {
    id: important.id,
    label: important.label || "重要通知",
    text: important.title,
    level: important.urgent ? "urgent" : "normal",
    actionLabel: "查看 ›"
  } : null);
  return items;
}

export function getNotifications() {
  return read();
}

export function createNotification(input = {}) {
  const item = {
    id: input.id || `NOTICE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: input.label || "重要通知",
    title: input.title || "新通知",
    summary: input.summary || "",
    scope: input.scope || "相关人员",
    source: input.source || "AIONE",
    level: input.level || "important",
    requiresAck: input.requiresAck !== false,
    dueAt: input.dueAt || null,
    createdAt: input.createdAt || new Date().toISOString(),
    readAt: null,
    acknowledgedAt: null
  };
  return write([item, ...read()])[0];
}

export function markNotificationRead(id, acknowledge = false) {
  const items = read().map((item) => item.id === id ? {
    ...item,
    readAt: item.readAt || new Date().toISOString(),
    acknowledgedAt: acknowledge ? (item.acknowledgedAt || new Date().toISOString()) : item.acknowledgedAt
  } : item);
  write(items);
  return items.find((item) => item.id === id) || null;
}

export function syncNotificationHeader() {
  write(read());
}

export function importNotifications(rows = []) {
  const current = read();
  const additions = rows.map((input) => ({
    id: input.id || `NOTICE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: input.label || "业务通知", title: input.title || "新通知", summary: input.summary || "",
    scope: input.scope || "相关人员", source: input.source || "AIONE", level: input.level || "normal",
    requiresAck: input.requiresAck === true, dueAt: input.dueAt || null, createdAt: input.createdAt || new Date().toISOString(),
    readAt: input.readAt || null, acknowledgedAt: input.acknowledgedAt || null
  }));
  write([...additions, ...current]);
  return additions;
}
