/* ========================================
   AIONE Preview Activity｜内测工作归属记录
   当前使用localStorage验证“谁在做什么”的数据结构。
   正式系统再迁移到数据库与统一日志/考核数据层。
======================================== */

const ACTIVITY_KEY = "aione.preview.activity.v0.1";
const MAX_RECORDS = 2000;

function readAll() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records) {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(records.slice(-MAX_RECORDS)));
}

export function recordPreviewActivity(identity, eventType, payload = {}) {
  if (!identity?.subjectId) return null;
  const record = {
    activityId: `PA-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    occurredAt: new Date().toISOString(),
    subjectType: identity.subjectType,
    subjectId: identity.subjectId,
    displayName: identity.displayName,
    email: identity.email,
    primaryWorkIdentity: identity.primaryWorkIdentity,
    workAssignment: identity.workAssignment || null,
    eventType,
    route: window.location.hash || "#/selection",
    ...payload
  };
  const records = readAll();
  records.push(record);
  writeAll(records);
  window.dispatchEvent(new CustomEvent("aione:preview-activity", { detail: record }));
  return record;
}

export function getPreviewActivityRecords(subjectId = null) {
  const records = readAll();
  return subjectId ? records.filter((item) => item.subjectId === subjectId) : records;
}

export function getPreviewActivitySummary(subjectId) {
  const records = getPreviewActivityRecords(subjectId);
  const byType = records.reduce((acc, item) => {
    acc[item.eventType] = (acc[item.eventType] || 0) + 1;
    return acc;
  }, {});
  return Object.freeze({
    subjectId,
    total: records.length,
    byType: Object.freeze(byType),
    lastActivityAt: records.at(-1)?.occurredAt || null
  });
}
