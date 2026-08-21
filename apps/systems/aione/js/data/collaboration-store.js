/* ========================================
   AIONE Collaboration Store｜内測協働データ
   現在は静的配布でも動作するlocalStorage実装。
   正式運用時は同じ公開関数の内部をAPIへ置き換える。
======================================== */

const STORAGE_KEY = "aione:collaboration:v1";
const CHANGE_EVENT = "aione:collaboration-change";

const emptyState = () => ({ tasks: [], suggestions: [], events: [] });

function readState() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return emptyState();
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      events: Array.isArray(parsed.events) ? parsed.events : []
    };
  } catch {
    return emptyState();
  }
}

function writeState(state, type) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { type } }));
  return state;
}

function createId(prefix) {
  const value = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${value}`;
}

function currentIdentity() {
  const identity = window.AIONEPreviewIdentity || {};
  return {
    id: identity.subjectId || "unknown",
    name: identity.displayName || "当前用户"
  };
}

export function getCollaborationData() {
  return readState();
}

export function addTask(input) {
  const state = readState();
  const creator = currentIdentity();
  const task = {
    id: createId("task"),
    title: String(input.title || "").trim(),
    description: String(input.description || "").trim(),
    assigneeId: String(input.assigneeId || creator.id),
    assigneeName: String(input.assigneeName || creator.name),
    creatorId: creator.id,
    creatorName: creator.name,
    dueDate: String(input.dueDate || ""),
    priority: String(input.priority || "normal"),
    status: "pending",
    createdAt: new Date().toISOString(),
    completedAt: null
  };
  state.tasks.unshift(task);
  writeState(state, "task.created");
  return task;
}

export function toggleTask(taskId) {
  const state = readState();
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return null;
  task.status = task.status === "done" ? "pending" : "done";
  task.completedAt = task.status === "done" ? new Date().toISOString() : null;
  writeState(state, "task.updated");
  return task;
}

export function addSuggestion(input) {
  const state = readState();
  const author = currentIdentity();
  const suggestion = {
    id: createId("idea"),
    title: String(input.title || "").trim(),
    content: String(input.content || "").trim(),
    category: String(input.category || "建议"),
    authorId: author.id,
    authorName: author.name,
    status: "submitted",
    createdAt: new Date().toISOString()
  };
  state.suggestions.unshift(suggestion);
  writeState(state, "suggestion.created");
  return suggestion;
}

export function addCalendarEvent(input) {
  const state = readState();
  const creator = currentIdentity();
  const event = {
    id: createId("event"),
    title: String(input.title || "").trim(),
    date: String(input.date || ""),
    time: String(input.time || ""),
    type: String(input.type || "work"),
    description: String(input.description || "").trim(),
    creatorId: creator.id,
    creatorName: creator.name,
    createdAt: new Date().toISOString()
  };
  state.events.push(event);
  writeState(state, "event.created");
  return event;
}

export function onCollaborationChange(listener) {
  const handler = () => listener(readState());
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

