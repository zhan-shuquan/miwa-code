import { aioneApi } from "../services/aione-api-client.js";

const STATUS_LABELS = Object.freeze({
  pending: "待判断",
  selected: "已通过",
  rejected: "已淘汰",
  converted: "已转商品"
});

let observer = null;
let scheduled = false;

function isSelectionListPage() {
  const hash = decodeURIComponent(window.location.hash || "");
  if (hash.includes("center=selection-center") && hash.includes("view=1")) return true;
  const hasTitle = [...document.querySelectorAll("h1,h2,h3")]
    .some((node) => node.textContent?.trim() === "选品中心");
  const hasSelectionHeader = [...document.querySelectorAll("th")]
    .some((node) => node.textContent?.trim() === "Selection Code");
  return hasTitle && hasSelectionHeader;
}

function findSelectionTable() {
  return [...document.querySelectorAll("table")].find((table) => {
    const headers = [...table.querySelectorAll("thead th")].map((node) => node.textContent?.trim());
    return headers.includes("Selection Code") && headers.includes("候选商品");
  }) || null;
}

function renderCell(row, value, { strong = false } = {}) {
  const cell = document.createElement("td");
  const node = strong ? document.createElement("strong") : document.createElement("span");
  node.textContent = value == null || value === "" ? "—" : String(value);
  cell.appendChild(node);
  row.appendChild(cell);
}

function renderEmpty(tbody, text) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 5;
  const empty = document.createElement("div");
  empty.className = "phc-table-empty";
  empty.textContent = text;
  cell.appendChild(empty);
  row.appendChild(cell);
  tbody.replaceChildren(row);
}

function renderItems(table, items) {
  const tbody = table.tBodies?.[0] || table.appendChild(document.createElement("tbody"));
  if (!items.length) {
    renderEmpty(tbody, "暂无商品机会");
    return;
  }

  const rows = items.map((item) => {
    const row = document.createElement("tr");
    row.dataset.selectionId = String(item.id || "");
    row.dataset.selectionNo = String(item.selectionNo || "");
    renderCell(row, item.selectionNo || item.id, { strong: true });
    renderCell(row, item.title);
    renderCell(row, item.sourcePlatform);
    renderCell(row, STATUS_LABELS[item.lifecycleStatus] || item.lifecycleStatus || "—");
    renderCell(row, item.convertedProductCode || "—");
    return row;
  });
  tbody.replaceChildren(...rows);
}

async function hydrate() {
  scheduled = false;
  if (!isSelectionListPage()) return;
  const table = findSelectionTable();
  if (!table || table.dataset.selectionLiveState === "loading" || table.dataset.selectionLiveState === "loaded") return;

  table.dataset.selectionLiveState = "loading";
  try {
    const payload = await aioneApi("/api/v1/selections?limit=100&sortBy=selectionDate&sortDirection=desc");
    const items = Array.isArray(payload?.items) ? payload.items : [];
    renderItems(table, items);
    table.dataset.selectionLiveState = "loaded";
    table.dataset.selectionLiveCount = String(items.length);
  } catch (error) {
    const tbody = table.tBodies?.[0] || table.appendChild(document.createElement("tbody"));
    renderEmpty(tbody, `真实数据读取失败：${error?.message || "请刷新重试"}`);
    table.dataset.selectionLiveState = "error";
  }
}

function scheduleHydrate() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(hydrate);
}

export function initSelectionCenterLiveList() {
  if (!observer) {
    observer = new MutationObserver(scheduleHydrate);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("hashchange", scheduleHydrate);
    window.addEventListener("popstate", scheduleHydrate);
    window.addEventListener("aione:selection-intake-completed", scheduleHydrate);
  }
  scheduleHydrate();
}

initSelectionCenterLiveList();
