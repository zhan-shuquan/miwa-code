/* ========================================
   View Registry｜统一视图注册表
   Object只有一份，View可以有很多种。
======================================== */
export const VIEW_REGISTRY = Object.freeze({
  card: Object.freeze({ id: "card", label: "卡片", supportsColumns: true }),
  list: Object.freeze({ id: "list", label: "列表", supportsColumns: false }),
  table: Object.freeze({ id: "table", label: "表格", supportsColumns: false }),
  kanban: Object.freeze({ id: "kanban", label: "看板", supportsColumns: false }),
  calendar: Object.freeze({ id: "calendar", label: "日历", supportsColumns: false }),
  gantt: Object.freeze({ id: "gantt", label: "甘特", supportsColumns: false }),
  gallery: Object.freeze({ id: "gallery", label: "图库", supportsColumns: true }),
  form: Object.freeze({ id: "form", label: "表单", supportsColumns: false }),
  chart: Object.freeze({ id: "chart", label: "图表", supportsColumns: false })
});

export function resolveViews(ids = ["card", "list"]) {
  return ids.map((id) => VIEW_REGISTRY[id]).filter(Boolean);
}
