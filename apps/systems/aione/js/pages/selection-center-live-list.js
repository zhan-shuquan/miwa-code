import { aioneApi } from "../services/aione-api-client.js";

const STATUS_LABELS = Object.freeze({
  pending: "待判断",
  selected: "已通过",
  rejected: "已淘汰",
  converted: "已转商品"
});
const FILTER_ORDER = ["", "pending", "selected", "rejected", "converted"];

let observer = null;
let scheduled = false;
let searchTimer = null;
const state = { q: "", lifecycleStatus: "", sortDirection: "desc" };

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

function findToolbar() {
  const search = [...document.querySelectorAll("input")]
    .find((input) => String(input.placeholder || "").includes("Selection Code"));
  const host = search?.closest(".phc-toolbar") || search?.parentElement?.parentElement || null;
  return { host, search };
}

function findButton(host, label) {
  return [...(host?.querySelectorAll("button") || [])]
    .find((button) => button.textContent?.trim() === label) || null;
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
    renderEmpty(tbody, "没有符合当前条件的商品机会");
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

function updateToolbarLabels() {
  const { host } = findToolbar();
  if (!host) return;
  const filter = host.querySelector("[data-selection-filter]");
  const sort = host.querySelector("[data-selection-sort]");
  if (filter) filter.textContent = state.lifecycleStatus ? `筛选：${STATUS_LABELS[state.lifecycleStatus]}` : "筛选";
  if (sort) sort.textContent = state.sortDirection === "desc" ? "排序：最新" : "排序：最早";
}

async function hydrate({ force = false } = {}) {
  scheduled = false;
  if (!isSelectionListPage()) return;
  const table = findSelectionTable();
  if (!table || table.dataset.selectionLiveState === "loading") return;
  if (!force && table.dataset.selectionLiveState === "loaded") return;

  table.dataset.selectionLiveState = "loading";
  try {
    const params = new URLSearchParams({
      limit: "100",
      sortBy: "selectionDate",
      sortDirection: state.sortDirection
    });
    if (state.q) params.set("q", state.q);
    if (state.lifecycleStatus) params.set("lifecycleStatus", state.lifecycleStatus);

    const payload = await aioneApi(`/api/v1/selections?${params}`);
    const items = Array.isArray(payload?.items) ? payload.items : [];
    renderItems(table, items);
    table.dataset.selectionLiveState = "loaded";
    table.dataset.selectionLiveCount = String(items.length);
    updateToolbarLabels();
  } catch (error) {
    const tbody = table.tBodies?.[0] || table.appendChild(document.createElement("tbody"));
    renderEmpty(tbody, `真实数据读取失败：${error?.message || "请刷新重试"}`);
    table.dataset.selectionLiveState = "error";
  }
}

function wireToolbar() {
  if (!isSelectionListPage()) return;
  const { host, search } = findToolbar();
  if (!host || !search || host.dataset.selectionToolbarWired === "true") return;
  host.dataset.selectionToolbarWired = "true";

  search.addEventListener("input", () => {
    state.q = search.value.trim();
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => hydrate({ force: true }), 250);
  });

  const filter = findButton(host, "筛选");
  if (filter) {
    filter.dataset.selectionFilter = "true";
    filter.addEventListener("click", () => {
      const current = FILTER_ORDER.indexOf(state.lifecycleStatus);
      state.lifecycleStatus = FILTER_ORDER[(current + 1) % FILTER_ORDER.length];
      updateToolbarLabels();
      hydrate({ force: true });
    });
  }

  const sort = findButton(host, "排序");
  if (sort) {
    sort.dataset.selectionSort = "true";
    sort.addEventListener("click", () => {
      state.sortDirection = state.sortDirection === "desc" ? "asc" : "desc";
      updateToolbarLabels();
      hydrate({ force: true });
    });
  }

  for (const label of ["列设置", "保存视图"]) {
    const button = findButton(host, label);
    if (button) button.hidden = true;
  }

  updateToolbarLabels();
}

function scheduleHydrate() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    wireToolbar();
    hydrate();
  });
}

export function initSelectionCenterLiveList() {
  if (!observer) {
    observer = new MutationObserver(scheduleHydrate);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("hashchange", scheduleHydrate);
    window.addEventListener("popstate", scheduleHydrate);
    window.addEventListener("aione:selection-intake-completed", () => hydrate({ force: true }));
  }
  scheduleHydrate();
}

initSelectionCenterLiveList();
