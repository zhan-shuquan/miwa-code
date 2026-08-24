/* ========================================
   Selection Workbench Adapter｜成熟选品业务 → 标准二级母版适配层
   只做数据/语义转换，不复制商品机会业务事实。
======================================== */
import { getPreviewOpportunities } from "./preview-opportunities.js";

export const SELECTION_TYPES = Object.freeze(["直发选品", "常规选品", "产品开发"]);
export const SELECTION_TYPE_DESCRIPTIONS = Object.freeze({
  "直发选品": "适合快速验证、低库存或按订单采购的商品机会。",
  "常规选品": "按标准数据、成本、定价与上架判断流程推进的商品机会。",
  "产品开发": "围绕明确需求、差异化或品牌方向推进的产品开发机会。"
});
export const SELECTION_STAGES = Object.freeze([
  { key: "opportunity", label: "商品机会" },
  { key: "data", label: "数据录入" },
  { key: "cost", label: "成本试算" },
  { key: "pricing", label: "智能定价" },
  { key: "decision", label: "上架判断" }
]);
export const SELECTION_SORT_OPTIONS = Object.freeze([
  { value: "default", label: "默认排序" },
  { value: "time-desc", label: "最新选品", field: "time", direction: "desc", type: "date" },
  { value: "time-asc", label: "最早选品", field: "time", direction: "asc", type: "date" },
  { value: "cost-desc", label: "投入成本 高→低", field: "cost", direction: "desc", type: "number" },
  { value: "name-asc", label: "商品名称 A-Z", field: "name", direction: "asc" },
  { value: "owner-asc", label: "负责人", field: "owner", direction: "asc" }
]);

export function loadSelectionItems() {
  return getPreviewOpportunities();
}
export function getSelectionOwners(items = []) {
  return [...new Set(items.map((item) => item.owner).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "zh-CN"));
}
export function selectionStatus(item) {
  return item?.result === "待形成" ? "ongoing" : "decided";
}
export function selectionResultLabel(item) {
  if (item?.result === "上架") return "✓ 上架";
  if (item?.result === "不上架") return "× 不上架";
  if (item?.result === "已作废") return "已作废";
  return "待形成";
}
export function selectionResultTone(item) {
  if (item?.result === "上架") return "positive";
  if (item?.result === "不上架" || item?.result === "已作废") return "negative";
  return "neutral";
}
export function selectionPlatformLabel(item) {
  const values = Array.isArray(item?.platforms) ? item.platforms : [];
  return values.length ? values.join(" / ") : "待确认";
}
export function selectionSourceLabel(item) {
  return item?.source || "待确认";
}
export function selectionMoney(value) {
  return `¥${Number(value || 0).toLocaleString("ja-JP")}`;
}
export function getSelectionTypeCards(items = [], activeType = "") {
  return SELECTION_TYPES.map((type, index) => ({
    key: type,
    label: type,
    description: SELECTION_TYPE_DESCRIPTIONS[type],
    count: items.filter((item) => item.type === type).length,
    priority: index < 3,
    active: activeType === type
  }));
}
export function getSelectionFlowSteps(items = [], activeStage = "") {
  return SELECTION_STAGES.map((stage) => ({
    ...stage,
    count: items.filter((item) => item.stage === stage.key).length,
    active: activeStage === stage.key,
    clickable: true
  }));
}
export function getSelectionMetrics(items = []) {
  const total = items.length;
  const listed = items.filter((item) => item.result === "上架").length;
  const rejected = items.filter((item) => item.result === "不上架").length;
  const ongoing = items.filter((item) => item.result === "待形成").length;
  const decided = listed + rejected;
  const rate = decided ? Math.round((listed / decided) * 100) : 0;
  const cost = items.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  return [
    { label: "商品机会总数", value: total },
    { label: "上架", value: listed },
    { label: "不上架", value: rejected },
    { label: "上架率", value: `${rate}%` },
    { label: "进行中", value: ongoing },
    { label: "投入总成本", value: selectionMoney(cost) }
  ];
}
function inTimeRange(item, range, now = new Date()) {
  if (!range) return true;
  const parsed = Date.parse(String(item?.time || "").replaceAll("/", "-"));
  if (!Number.isFinite(parsed)) return true;
  const date = new Date(parsed);
  if (range === "today") return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  if (range === "7d") return now.getTime() - date.getTime() <= 7 * 86400000 && date <= now;
  if (range === "month") return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  return true;
}
export function filterSelectionItems(items = [], workspaceState = {}, stage = "") {
  const query = String(workspaceState.query || "").trim().toLowerCase();
  const filters = workspaceState.filters || {};
  const type = filters.type ?? workspaceState.filter ?? "";
  const status = filters.status || "";
  const owner = filters.owner || "";
  const time = filters.time || "";
  return items.filter((item) => {
    if (type && item.type !== type) return false;
    if (stage && item.stage !== stage) return false;
    if (status && selectionStatus(item) !== status) return false;
    if (owner && item.owner !== owner) return false;
    if (!inTimeRange(item, time)) return false;
    if (query && !`${item.name} ${item.id} ${item.owner} ${item.source || ""} ${item.info || ""}`.toLowerCase().includes(query)) return false;
    return true;
  });
}
export function createPreviewOpportunityId(items = []) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `XP${y}${m}${d}`;
  let maxSequence = 0;
  items.forEach((item) => {
    const match = String(item?.id || "").match(new RegExp(`^${prefix}(\\d{6})$`));
    if (match) maxSequence = Math.max(maxSequence, Number(match[1]));
  });
  let nextSequence = maxSequence + 1;
  let candidate = `${prefix}${String(nextSequence).padStart(6, "0")}`;
  try {
    while (window.localStorage.getItem(`aione:selection:draft:${candidate}`) || window.localStorage.getItem(`aione:selection:workflow:${candidate}`)) {
      nextSequence += 1;
      candidate = `${prefix}${String(nextSequence).padStart(6, "0")}`;
    }
  } catch (_) {}
  return candidate;
}
export function formatLocalDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, "0"); const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0"); const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${d} ${hh}:${mm}`;
}
