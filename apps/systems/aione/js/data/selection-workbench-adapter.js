/* ========================================
   Selection Workbench Adapter｜真实 Selection API → 标准二级母版适配层
   只做数据/语义转换，不保存第二套商品机会事实。
======================================== */
import { aioneApi } from "../services/aione-api-client.js";

export const SELECTION_TYPES = Object.freeze(["直发选品", "常规选品", "产品开发"]);
export const SELECTION_TYPE_DESCRIPTIONS = Object.freeze({
  "直发选品": "适合快速验证、低库存或按订单采购的商品机会。",
  "常规选品": "按标准数据、成本、定价与上架判断流程推进的商品机会。",
  "产品开发": "围绕明确需求、差异化或品牌方向推进的产品开发机会。"
});
export const SELECTION_SORT_OPTIONS = Object.freeze([
  { value: "default", label: "默认排序" },
  { value: "time-desc", label: "最新选品", field: "time", direction: "desc", type: "date" },
  { value: "time-asc", label: "最早选品", field: "time", direction: "asc", type: "date" },
  { value: "cost-desc", label: "投入成本 高→低", field: "cost", direction: "desc", type: "number" },
  { value: "name-asc", label: "商品名称 A-Z", field: "name", direction: "asc" },
  { value: "owner-asc", label: "负责人", field: "owner", direction: "asc" }
]);

const STATUS_LABELS = Object.freeze({
  pending: "待判断",
  selected: "已通过",
  rejected: "已淘汰",
  converted: "已转商品"
});

function typeOf(item) {
  const explicit = item?.metadata?.selectionType;
  if (explicit === "直发选品" || explicit === "常规选品") return explicit;
  return item?.sourceFulfillmentHint === "direct" ? "直发选品" : "常规选品";
}

function mapSelection(item = {}) {
  const lifecycleStatus = String(item.lifecycleStatus || "pending");
  const convertedProductCode = item.convertedProductCode || item.metadata?.convertedProductCode || "";
  return {
    id: item.id,
    selectionNo: item.selectionNo || item.id,
    name: item.title || "未命名商品机会",
    type: typeOf(item),
    owner: item.ownerPersonId || "—",
    ownerPersonId: item.ownerPersonId || null,
    lifecycleStatus,
    stageName: STATUS_LABELS[lifecycleStatus] || lifecycleStatus,
    source: item.sourcePlatform || "待确认",
    sourceUrl: item.sourceUrl || "",
    sourceRef: item.sourceRef || "",
    platforms: [],
    time: formatLocalDateTime(item.selectionDate || item.createdAt || item.updatedAt),
    cost: Number(item.estimatedCost || 0),
    result: lifecycleStatus,
    info: [item.sourceSupplierName, item.sourceGroup, item.sourceNote].filter(Boolean).join(" · "),
    representativeImage: item.sourceCoverImageUrl ? { url: item.sourceCoverImageUrl } : null,
    convertedProductId: item.convertedProductId || null,
    convertedProductCode: convertedProductCode || null,
    convertedProductStatus: item.convertedProductStatus || null,
    raw: item
  };
}

export async function loadSelectionItems({ limit = 100 } = {}) {
  const payload = await aioneApi(`/api/v1/selections?limit=${Math.max(1, Math.min(100, Number(limit) || 100))}&sortBy=selectionDate&sortDirection=desc`);
  return (Array.isArray(payload?.items) ? payload.items : []).map(mapSelection);
}

export function getSelectionOwners(items = []) {
  return [...new Set(items.map((item) => item.owner).filter((value) => value && value !== "—"))].sort((a, b) => String(a).localeCompare(String(b), "zh-CN"));
}

export function selectionStatus(item) {
  if (item?.lifecycleStatus === "converted") return "converted";
  if (item?.lifecycleStatus === "selected") return "selected";
  if (item?.lifecycleStatus === "rejected") return "rejected";
  return "pending";
}

export function selectionResultLabel(item) {
  return STATUS_LABELS[item?.lifecycleStatus] || item?.stageName || "待判断";
}

export function selectionResultTone(item) {
  if (item?.lifecycleStatus === "converted" || item?.lifecycleStatus === "selected") return "positive";
  if (item?.lifecycleStatus === "rejected") return "negative";
  return "neutral";
}

export function selectionPlatformLabel(item) {
  const values = Array.isArray(item?.platforms) ? item.platforms : [];
  return values.length ? values.join(" / ") : "待发布";
}

export function selectionSourceLabel(item) {
  return item?.source || "待确认";
}

export function selectionMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? `¥${amount.toLocaleString("ja-JP")}` : "—";
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
    if (stage && item.lifecycleStatus !== stage) return false;
    if (status && selectionStatus(item) !== status) return false;
    if (owner && item.owner !== owner) return false;
    if (!inTimeRange(item, time)) return false;
    if (query && !`${item.name} ${item.selectionNo || ""} ${item.id} ${item.owner} ${item.source || ""} ${item.info || ""}`.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function formatLocalDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, "0"); const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0"); const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${d} ${hh}:${mm}`;
}
