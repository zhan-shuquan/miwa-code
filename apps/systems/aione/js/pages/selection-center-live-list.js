import { aioneApi } from "../services/aione-api-client.js";

const STATUS_LABELS = Object.freeze({ pending: "待判断", selected: "已通过", rejected: "已淘汰", converted: "已转商品" });
const FILTER_ORDER = ["", "pending", "selected", "rejected", "converted"];

let observer = null;
let scheduled = false;
let searchTimer = null;
const state = { q: "", lifecycleStatus: "", sortDirection: "desc" };

function isSelectionListPage() {
  const hash = decodeURIComponent(window.location.hash || "");
  if (hash.includes("center=selection-center") && hash.includes("view=1")) return true;
  const hasTitle = [...document.querySelectorAll("h1,h2,h3")].some((node) => node.textContent?.trim() === "选品中心");
  const hasSelectionHeader = [...document.querySelectorAll("th")].some((node) => node.textContent?.trim() === "Selection Code");
  return hasTitle && hasSelectionHeader;
}

function findSelectionTable() {
  return [...document.querySelectorAll("table")].find((table) => {
    const headers = [...table.querySelectorAll("thead th")].map((node) => node.textContent?.trim());
    return headers.includes("Selection Code") && headers.includes("候选商品");
  }) || null;
}

function ensureActionHeader(table) {
  const row = table.querySelector("thead tr");
  if (!row || [...row.children].some((cell) => cell.textContent?.trim() === "操作")) return;
  const th = document.createElement("th");
  th.textContent = "操作";
  row.appendChild(th);
}

function findToolbar() {
  const search = [...document.querySelectorAll("input")].find((input) => String(input.placeholder || "").includes("Selection Code"));
  const host = search?.closest(".phc-toolbar") || search?.parentElement?.parentElement || null;
  return { host, search };
}

function findButton(host, label) {
  return [...(host?.querySelectorAll("button") || [])].find((button) => button.textContent?.trim() === label) || null;
}

function renderCell(row, value, { strong = false } = {}) {
  const cell = document.createElement("td");
  const node = strong ? document.createElement("strong") : document.createElement("span");
  node.textContent = value == null || value === "" ? "—" : String(value);
  cell.appendChild(node);
  row.appendChild(cell);
}

function productCodeOf(item) {
  return item.convertedProductCode || item.metadata?.convertedProductCode || "";
}

function actionButton(label, action, primary = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.selectionAction = action;
  button.style.cssText = primary
    ? "border:1px solid #176b4d;background:#176b4d;color:#fff;border-radius:8px;padding:6px 10px;cursor:pointer"
    : "border:1px solid #d4ddd8;background:#fff;color:#27332d;border-radius:8px;padding:6px 10px;cursor:pointer";
  return button;
}

function renderActions(row, item) {
  const cell = document.createElement("td");
  cell.style.whiteSpace = "nowrap";
  cell.style.display = "flex";
  cell.style.gap = "6px";
  const status = item.lifecycleStatus;
  if (status === "pending") {
    cell.append(actionButton("通过选品", "approve", true), actionButton("淘汰", "reject"));
  } else if (status === "selected") {
    cell.append(actionButton("创建正式商品", "convert", true));
  } else if (status === "converted") {
    const code = productCodeOf(item);
    const label = document.createElement("span");
    label.textContent = code ? `已创建 ${code}` : "正式商品已创建";
    label.style.color = "#176b4d";
    label.style.fontWeight = "650";
    cell.append(label);
  } else {
    cell.textContent = "—";
  }
  row.appendChild(cell);
}

function renderEmpty(tbody, text) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 6;
  const empty = document.createElement("div");
  empty.className = "phc-table-empty";
  empty.textContent = text;
  cell.appendChild(empty);
  row.appendChild(cell);
  tbody.replaceChildren(row);
}

function renderItems(table, items) {
  ensureActionHeader(table);
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
    renderCell(row, productCodeOf(item) || "—");
    renderActions(row, item);
    return row;
  });
  tbody.replaceChildren(...rows);
}

function toast(message, error = false) {
  document.querySelector("[data-selection-action-toast]")?.remove();
  const node = document.createElement("div");
  node.dataset.selectionActionToast = "true";
  node.textContent = message;
  node.style.cssText = `position:fixed;right:24px;bottom:24px;z-index:10000;padding:12px 16px;border-radius:10px;color:#fff;background:${error ? "#a33a32" : "#176b4d"};box-shadow:0 10px 30px rgba(0,0,0,.18);font-weight:650`;
  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), 5000);
}

async function approveSelection(id) {
  await aioneApi(`/api/v1/selections/${encodeURIComponent(id)}/select`, { method: "POST", body: JSON.stringify({ qualificationData: { decisionEvidence: "selection-center-human-approval" } }) });
  return aioneApi(`/api/v1/selections/${encodeURIComponent(id)}/convert`, { method: "POST", body: JSON.stringify({ skuCount: 1 }) });
}

async function handleAction(button, row) {
  const id = row?.dataset.selectionId;
  const action = button.dataset.selectionAction;
  if (!id || !action) return;
  if (action === "reject" && !window.confirm("确认淘汰这条选品吗？淘汰后不会创建正式商品。")) return;
  if (action === "approve" && !window.confirm("确认通过选品并创建正式商品吗？系统将先创建 1 个待确认规格的初始 SKU。")) return;

  const original = button.textContent;
  button.disabled = true;
  button.textContent = "处理中…";
  try {
    let result;
    if (action === "approve") result = await approveSelection(id);
    else if (action === "convert") result = await aioneApi(`/api/v1/selections/${encodeURIComponent(id)}/convert`, { method: "POST", body: JSON.stringify({ skuCount: 1 }) });
    else result = await aioneApi(`/api/v1/selections/${encodeURIComponent(id)}/reject`, { method: "POST", body: "{}" });

    const productCode = result?.product?.product_code || result?.product?.productCode || "";
    toast(action === "reject" ? "已淘汰，不会创建正式商品。" : `正式商品已创建${productCode ? `：${productCode}` : ""}`);
    await hydrate({ force: true });
  } catch (error) {
    toast(error?.message || "操作失败，请重试。", true);
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

async function hydrate({ force = false } = {}) {
  scheduled = false;
  if (!isSelectionListPage()) return;
  const table = findSelectionTable();
  if (!table || table.dataset.selectionLiveState === "loading") return;
  if (!force && table.dataset.selectionLiveState === "loaded") return;
  table.dataset.selectionLiveState = "loading";
  try {
    const params = new URLSearchParams({ limit: "100", sortBy: "selectionDate", sortDirection: state.sortDirection });
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

function updateToolbarLabels() {
  const { host } = findToolbar();
  if (!host) return;
  const filter = host.querySelector("[data-selection-filter]");
  const sort = host.querySelector("[data-selection-sort]");
  if (filter) filter.textContent = state.lifecycleStatus ? `筛选：${STATUS_LABELS[state.lifecycleStatus]}` : "筛选";
  if (sort) sort.textContent = state.sortDirection === "desc" ? "排序：最新" : "排序：最早";
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

function wireActions() {
  const table = findSelectionTable();
  if (!table || table.dataset.selectionActionsWired === "true") return;
  table.dataset.selectionActionsWired = "true";
  table.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-selection-action]");
    if (!button) return;
    handleAction(button, button.closest("tr"));
  });
}

function scheduleHydrate() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    wireToolbar();
    wireActions();
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
