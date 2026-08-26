import { aioneApi } from "./aione-api-client.js";
import { getCollaborationData, onCollaborationChange } from "../data/collaboration-store.js";

const POLL_MS = 60 * 1000;
const EVENT_NAME = "aione:work-items-changed";
let initialized = false;
let timer = null;
let inFlight = null;
let lastSuccessAt = 0;
let unsubscribeLocal = null;
let debounceTimer = null;

function currentPersonId() {
  return String(window.AIONEPreviewIdentity?.subjectId || "");
}

function dateValue(value) {
  if (!value) return NaN;
  const date = new Date(value);
  return date.getTime();
}

function normalizeStatus(value) {
  const status = String(value || "pending").toLowerCase();
  if (status === "active") return "in_progress";
  if (status === "done") return "completed";
  return status;
}

function relationIds(item = {}) {
  return {
    owner: String(item.ownerPersonId || item.assigneeId || ""),
    creator: String(item.createdByPersonId || item.creatorId || "")
  };
}

export function getWorkAttentionReason(item = {}, personId = currentPersonId(), now = Date.now()) {
  if (!personId) return "";
  const status = normalizeStatus(item.status);
  if (status === "completed") return "";
  const ids = relationIds(item);
  const isOwner = ids.owner === String(personId);
  const isCreator = ids.creator === String(personId);
  const dueAt = dateValue(item.dueAt || item.dueDate);
  const overdue = isOwner && Number.isFinite(dueAt) && dueAt < now;

  // Header提醒代表“现在需要我处理什么”，而不是所有历史/进行中工作总数。
  if (overdue) return "overdue";
  if (status === "blocked" && (isOwner || isCreator)) return "blocked";
  if (status === "waiting" && isCreator) return "waiting";
  if (status === "pending" && isOwner) return "pending";
  return "";
}

export function computeWorkAttention(items = [], personId = currentPersonId(), now = Date.now()) {
  const breakdown = { pending:0, waiting:0, overdue:0, blocked:0 };
  const seen = new Set();
  for (const item of items || []) {
    const reason = getWorkAttentionReason(item, personId, now);
    if (!reason) continue;
    const key = String(item.id || `${reason}:${seen.size}`);
    if (seen.has(key)) continue;
    seen.add(key);
    breakdown[reason] = (breakdown[reason] || 0) + 1;
  }
  return { count:seen.size, breakdown };
}

function localItems() {
  const state = getCollaborationData();
  return (state.tasks || []).map((task) => ({
    id: task.id,
    status: task.status,
    ownerPersonId: task.assigneeId,
    createdByPersonId: task.creatorId,
    dueAt: task.dueDate
  }));
}

function applyAttention(result, detail = {}) {
  const payload = {
    count:Number(result?.count || 0),
    breakdown:result?.breakdown || { pending:0, waiting:0, overdue:0, blocked:0 },
    at:new Date().toISOString(),
    ...detail
  };
  if (window.MIWAHeader?.setWorkCount) window.MIWAHeader.setWorkCount(payload.count);
  else window.MIWAHeader?.configure?.({ workCount:payload.count });
  window.AIONEWorkAttention = Object.freeze(payload);
  window.dispatchEvent(new CustomEvent("aione:work-attention-updated", { detail:payload }));
  return payload;
}

export async function refreshWorkAttention(options = {}) {
  const personId = currentPersonId();
  if (!personId) return applyAttention({ count:0, breakdown:{pending:0,waiting:0,overdue:0,blocked:0} }, { reason:options.reason || "no-identity", mode:"none" });
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const response = await aioneApi("/api/v1/work-home?limit=200");
      const result = computeWorkAttention(response.items || [], response.personId || personId);
      lastSuccessAt = Date.now();
      return applyAttention(result, { reason:options.reason || "refresh", mode:"database", lastSuccessAt });
    } catch (error) {
      // localhost 可回退本地Preview；正式环境如果已有数据库快照，则保留上一次数值，避免断网被误显示为“0项工作”。
      const localHost = ["127.0.0.1", "localhost"].includes(window.location.hostname);
      const previous = window.AIONEWorkAttention;
      if (!localHost && previous?.mode === "database") {
        window.dispatchEvent(new CustomEvent("aione:work-attention-updated", { detail:{ ...previous, reason:options.reason || "database-error", stale:true, error:String(error?.message || error) } }));
        return previous;
      }
      const items = localItems();
      const result = computeWorkAttention(items, personId);
      return applyAttention(result, { reason:options.reason || "fallback", mode:"local-fallback", error:String(error?.message || error), lastSuccessAt });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function queueRefresh(reason = "event") {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    refreshWorkAttention({ reason }).catch(() => {});
  }, 120);
}

export function announceWorkItemsChanged(detail = {}) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail:{ ...detail, at:new Date().toISOString() } }));
}

export function initWorkAttentionSync() {
  if (initialized) return window.AIONEWorkAttentionSync;
  initialized = true;

  const onChanged = (event) => queueRefresh(event?.detail?.reason || "work-items-changed");
  const onFocus = () => refreshWorkAttention({ reason:"window-focus" }).catch(() => {});
  const onVisibility = () => {
    if (document.visibilityState === "visible") refreshWorkAttention({ reason:"visibility-visible" }).catch(() => {});
  };
  const onOnline = () => refreshWorkAttention({ reason:"online" }).catch(() => {});

  window.addEventListener(EVENT_NAME, onChanged);
  window.addEventListener("focus", onFocus);
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisibility);
  unsubscribeLocal = onCollaborationChange(() => queueRefresh("local-collaboration-change"));

  timer = window.setInterval(() => {
    if (document.visibilityState === "visible") refreshWorkAttention({ reason:"60s-poll" }).catch(() => {});
  }, POLL_MS);

  window.AIONEWorkAttentionSync = Object.freeze({
    refresh:(reason="manual") => refreshWorkAttention({ reason }),
    announce:announceWorkItemsChanged,
    getSnapshot:() => window.AIONEWorkAttention || null
  });

  refreshWorkAttention({ reason:"startup" }).catch(() => {});
  return window.AIONEWorkAttentionSync;
}

export function disposeWorkAttentionSync() {
  if (timer) clearInterval(timer);
  if (debounceTimer) clearTimeout(debounceTimer);
  unsubscribeLocal?.();
  timer = null;
  debounceTimer = null;
  unsubscribeLocal = null;
  initialized = false;
}
