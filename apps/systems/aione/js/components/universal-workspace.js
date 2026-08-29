/* ========================================
   Universal Workspace｜统一多视图工作区
   公共控制：搜索｜多条件筛选｜排序｜导入｜导出｜视图｜重置
   卡片专属：3列｜4列｜6列（默认3列）
   可选能力：分页；标准状态：加载中｜空数据｜无结果｜错误｜无权限
======================================== */
import { resolveViews } from "./view-registry.js";

const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
const PREF_PREFIX = "miwa-aione:workspace-pref:v2:";

function readPreference(pageId) {
  try { return JSON.parse(window.localStorage.getItem(`${PREF_PREFIX}${pageId}`) || "{}"); } catch (_) { return {}; }
}
function writePreference(pageId, state) {
  try { window.localStorage.setItem(`${PREF_PREFIX}${pageId}`, JSON.stringify({ view: state.view, cardColumns: state.cardColumns, sort: state.sort, group: state.group })); } catch (_) {}
}
function normalizeOptions(items = []) {
  return (Array.isArray(items) ? items : []).map((item) => typeof item === "string" ? { value: item, label: item } : item).filter(Boolean);
}

function normalizeGroupOptions(options = []) {
  return (Array.isArray(options) ? options : []).map((item, index) => {
    if (typeof item === "string") return { value:item, label:item, field:item };
    return {
      value: String(item?.value || item?.field || `group${index + 1}`),
      label: item?.label || "分组",
      field: item?.field || "",
      getter: typeof item?.getter === "function" ? item.getter : null
    };
  }).filter((item) => item.value);
}

function normalizeFilters(options = {}) {
  if (Array.isArray(options.filters) && options.filters.length) {
    return options.filters.map((filter, index) => ({
      key: String(filter.key || `filter${index + 1}`),
      label: filter.label || filter.allLabel || "筛选",
      allLabel: filter.allLabel || `全部${filter.label || ""}` || "全部",
      options: normalizeOptions(filter.options || []),
      value: String(filter.value || "")
    }));
  }
  return [{ key: "filter", label: "筛选", allLabel: options.filterAllLabel || "全部", options: normalizeOptions(options.filterOptions || []), value: "" }];
}

export function sortItems(items = [], sortValue = "default", sortOptions = []) {
  const option = (sortOptions || []).find((item) => item.value === sortValue);
  if (!option || !option.field) return [...items];
  const direction = option.direction === "desc" ? -1 : 1;
  const type = option.type || "text";
  return [...items].sort((a, b) => {
    let av = a?.[option.field]; let bv = b?.[option.field];
    if (type === "number") { av = Number(av || 0); bv = Number(bv || 0); return (av - bv) * direction; }
    if (type === "date") { av = Date.parse(av || 0) || 0; bv = Date.parse(bv || 0) || 0; return (av - bv) * direction; }
    return String(av ?? "").localeCompare(String(bv ?? ""), "zh-CN", { numeric: true, sensitivity: "base" }) * direction;
  });
}

export function createUniversalWorkspace(parent, options = {}) {
  if (!parent) throw new Error("统一工作区缺少挂载容器");
  const pageId = options.pageId || "default";
  const views = resolveViews(options.views?.length ? options.views : ["card", "list"]);
  if (!views.length) throw new Error("统一工作区至少需要一个有效View");
  const pref = readPreference(pageId);
  const allowedViewIds = new Set(views.map((item) => item.id));
  const configuredDefaultView = allowedViewIds.has(options.defaultView) ? options.defaultView : views[0].id;
  const defaultView = allowedViewIds.has(pref.view) ? pref.view : configuredDefaultView;
  const allowedColumns = Array.isArray(options.cardColumns) && options.cardColumns.length ? options.cardColumns : [3, 4, 6];
  const preferredColumns = Number(pref.cardColumns);
  const configuredDefaultColumns = allowedColumns.includes(Number(options.defaultCardColumns)) ? Number(options.defaultCardColumns) : 3;
  const defaultColumns = allowedColumns.includes(preferredColumns) ? preferredColumns : configuredDefaultColumns;
  const sortOptions = Array.isArray(options.sortOptions) && options.sortOptions.length ? options.sortOptions : [{ value: "default", label: "默认排序" }];
  const configuredDefaultSort = sortOptions.some((item) => item.value === options.defaultSort) ? options.defaultSort : sortOptions[0].value;
  const defaultSort = sortOptions.some((item) => item.value === pref.sort) ? pref.sort : configuredDefaultSort;
  const filterDefs = normalizeFilters(options);
  const groupOptions = normalizeGroupOptions(options.groupOptions || []);
  const allowedGroupValues = new Set(groupOptions.map((item) => item.value));
  const configuredDefaultGroup = allowedGroupValues.has(options.defaultGroup) ? options.defaultGroup : "";
  const defaultGroup = allowedGroupValues.has(pref.group) ? pref.group : configuredDefaultGroup;
  const paginationEnabled = Boolean(options.pagination || options.pageSize);
  const pageSize = Math.max(1, Number(options.pageSize || options.pagination?.pageSize || 12));

  const filterState = Object.fromEntries(filterDefs.map((filter) => [filter.key, filter.value || ""]));
  const state = { query: "", filter: filterState.filter || "", filters: filterState, sort: defaultSort, group: defaultGroup, view: defaultView, cardColumns: defaultColumns, status: "ready", page: 1, pageSize };
  const section = document.createElement("section");
  section.className = "miwa-level2-block miwa-universal-workspace";
  section.dataset.workspaceId = pageId;
  section.innerHTML = `
    <div class="miwa-level2-block__head">
      <div><h2>${esc(options.title || "业务对象")}</h2><p>${esc(options.description || "同一份数据通过标准视图展示；视图变化不复制数据。")}</p></div>
      <span class="miwa-level2-count" data-workspace-count>0</span>
    </div>
    <div class="miwa-object-toolbar miwa-universal-workspace__toolbar" aria-label="统一对象工具栏">
      <label class="miwa-object-search"><span aria-hidden="true">⌕</span><input type="search" data-workspace-search placeholder="${esc(options.searchPlaceholder || "搜索")}" aria-label="搜索"></label>
      <div class="miwa-workspace-filter-group" data-workspace-filter-group>
        ${filterDefs.map((filter) => `<select data-workspace-filter-key="${esc(filter.key)}" aria-label="${esc(filter.label)}"><option value="">${esc(filter.allLabel)}</option>${filter.options.map((item) => `<option value="${esc(item.value)}">${esc(item.label)}</option>`).join("")}</select>`).join("")}
      </div>
      ${groupOptions.length ? `<select data-workspace-group aria-label="分组"><option value="">不分组</option>${groupOptions.map((item) => `<option value="${esc(item.value)}">按${esc(item.label)}分组</option>`).join("")}</select>` : ""}
      <select data-workspace-sort aria-label="排序">${sortOptions.map((item) => `<option value="${esc(item.value)}">${esc(item.label)}</option>`).join("")}</select>
      <button type="button" data-workspace-import ${options.allowImport === false ? "disabled" : ""}>导入</button>
      <input type="file" data-workspace-import-file accept="${esc(options.importAccept || ".xlsx,.csv")}" hidden>
      <button type="button" data-workspace-export ${options.allowExport === false ? "disabled" : ""}>导出</button>
      <div class="miwa-object-view-switch" data-workspace-view-switch aria-label="视图切换">
        ${views.map((view) => `<button type="button" data-workspace-view="${esc(view.id)}">${esc(view.label)}</button>`).join("")}
      </div>
      <div class="miwa-card-column-switch" data-card-column-switch aria-label="卡片列数">
        ${allowedColumns.map((columns) => `<button type="button" data-card-columns="${columns}">${columns}列</button>`).join("")}
      </div>
      <button type="button" data-workspace-reset hidden>重置</button>
    </div>
    <div class="miwa-universal-workspace__views" data-workspace-views>
      ${views.map((view) => {
        if (view.id === "card") return `<div class="miwa-object-card-grid" data-workspace-view-host="card" data-columns="${defaultColumns}"></div>`;
        if (view.id === "list" || view.id === "table") return `<div class="miwa-object-list-wrap" data-workspace-view-host="${esc(view.id)}"><table class="miwa-object-table"><thead data-workspace-table-head="${esc(view.id)}"></thead><tbody data-workspace-table-body="${esc(view.id)}"></tbody></table></div>`;
        return `<div class="miwa-workspace-view-host" data-workspace-view-host="${esc(view.id)}"></div>`;
      }).join("")}
    </div>
    <div class="miwa-workspace-state" data-workspace-state hidden role="status" aria-live="polite"></div>
    ${paginationEnabled ? `<footer class="miwa-workspace-pagination" data-workspace-pagination><span data-workspace-range>当前显示 0 / 0 项</span><nav aria-label="分页"><button type="button" data-workspace-page="prev">上一页</button><span data-workspace-page-label>1 / 1</span><button type="button" data-workspace-page="next">下一页</button></nav></footer>` : ""}`;
  parent.appendChild(section);

  const filterNodes = new Map([...section.querySelectorAll("[data-workspace-filter-key]")].map((node) => [node.dataset.workspaceFilterKey, node]));
  const nodes = {
    search: section.querySelector("[data-workspace-search]"),
    filter: filterNodes.get("filter") || filterNodes.values().next().value || null,
    filters: filterNodes,
    group: section.querySelector("[data-workspace-group]"),
    sort: section.querySelector("[data-workspace-sort]"),
    importButton: section.querySelector("[data-workspace-import]"),
    importFile: section.querySelector("[data-workspace-import-file]"),
    exportButton: section.querySelector("[data-workspace-export]"),
    columnSwitch: section.querySelector("[data-card-column-switch]"),
    resetButton: section.querySelector("[data-workspace-reset]"),
    count: section.querySelector("[data-workspace-count]"),
    status: section.querySelector("[data-workspace-state]"),
    pagination: section.querySelector("[data-workspace-pagination]"),
    range: section.querySelector("[data-workspace-range]"),
    pageLabel: section.querySelector("[data-workspace-page-label]"),
    prevPage: section.querySelector('[data-workspace-page="prev"]'),
    nextPage: section.querySelector('[data-workspace-page="next"]')
  };
  const viewHosts = new Map([...section.querySelectorAll("[data-workspace-view-host]")].map((node) => [node.dataset.workspaceViewHost, node]));

  function persist() { writePreference(pageId, state); }
  function emit(reason) { options.onStateChange?.({ ...state, filters: { ...state.filters } }, reason); }
  function hasQueryState() { return Boolean(state.query || Object.values(state.filters).some(Boolean) || state.group !== configuredDefaultGroup || state.sort !== configuredDefaultSort); }
  function sync() {
    section.querySelectorAll("[data-workspace-view]").forEach((button) => {
      const active = button.dataset.workspaceView === state.view;
      button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (state.status === "ready") {
      viewHosts.forEach((node, id) => { node.hidden = id !== state.view; node.setAttribute("aria-hidden", id === state.view ? "false" : "true"); });
    }
    const currentView = views.find((item) => item.id === state.view);
    nodes.columnSwitch.hidden = !currentView?.supportsColumns;
    section.querySelectorAll("[data-card-columns]").forEach((button) => {
      const active = Number(button.dataset.cardColumns) === state.cardColumns;
      button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    const cardHost = viewHosts.get("card"); if (cardHost) cardHost.dataset.columns = String(state.cardColumns);
    if (nodes.group) nodes.group.value = state.group;
    if (nodes.sort) nodes.sort.value = state.sort;
    filterNodes.forEach((node, key) => { node.value = state.filters[key] || ""; });
    if (nodes.resetButton) nodes.resetButton.hidden = !hasQueryState();
  }

  nodes.search?.addEventListener("input", () => { state.query = nodes.search.value; state.page = 1; sync(); emit("search"); });
  filterNodes.forEach((node, key) => node.addEventListener("change", () => {
    state.filters[key] = node.value;
    if (key === "filter" || key === filterDefs[0]?.key) state.filter = node.value;
    state.page = 1; sync(); emit(`filter:${key}`);
  }));
  nodes.group?.addEventListener("change", () => { state.group = nodes.group.value; state.page = 1; persist(); sync(); emit("group"); });
  nodes.sort?.addEventListener("change", () => { state.sort = nodes.sort.value; state.page = 1; persist(); sync(); emit("sort"); });
  section.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-workspace-view]");
    if (viewButton) { state.view = viewButton.dataset.workspaceView; persist(); sync(); emit("view"); return; }
    const columnButton = event.target.closest("[data-card-columns]");
    if (columnButton) { state.cardColumns = Number(columnButton.dataset.cardColumns) || configuredDefaultColumns; persist(); sync(); emit("columns"); return; }
    const resetButton = event.target.closest("[data-workspace-reset]");
    if (resetButton) { resetQueryState(); emit("reset"); return; }
    const pageButton = event.target.closest("[data-workspace-page]");
    if (pageButton && paginationEnabled) {
      const next = pageButton.dataset.workspacePage === "prev" ? state.page - 1 : state.page + 1;
      if (next >= 1) { state.page = next; sync(); emit("page"); }
    }
  });
  nodes.importButton?.addEventListener("click", () => { if (!nodes.importButton.disabled) options.onImportRequest?.(nodes.importFile); });
  nodes.exportButton?.addEventListener("click", () => { if (!nodes.exportButton.disabled) options.onExportRequest?.({ ...state, filters: { ...state.filters } }); });

  function setFilterOptions(keyOrItems = "filter", itemsOrValue = [], maybeValue = "") {
    let key = "filter", items = keyOrItems, value = itemsOrValue;
    if (typeof keyOrItems === "string") { key = keyOrItems; items = itemsOrValue; value = maybeValue; }
    const node = filterNodes.get(key) || (key === "filter" ? nodes.filter : null);
    if (!node) return;
    const def = filterDefs.find((filter) => filter.key === key) || filterDefs[0];
    const rows = normalizeOptions(items);
    node.innerHTML = `<option value="">${esc(def?.allLabel || "全部")}</option>${rows.map((item) => `<option value="${esc(item.value)}">${esc(item.label)}</option>`).join("")}`;
    const valid = rows.some((item) => String(item.value) === String(value));
    state.filters[key] = valid ? String(value) : "";
    if (key === "filter" || key === filterDefs[0]?.key) state.filter = state.filters[key];
    node.value = state.filters[key];
    sync();
  }
  function resetQueryState() {
    state.query = ""; state.group = configuredDefaultGroup; state.sort = configuredDefaultSort; state.page = 1;
    Object.keys(state.filters).forEach((key) => { state.filters[key] = ""; });
    state.filter = "";
    if (nodes.search) nodes.search.value = "";
    if (nodes.group) nodes.group.value = state.group;
    if (nodes.sort) nodes.sort.value = state.sort;
    persist(); sync();
  }
  function groupItems(items = []) {
    const rows = Array.isArray(items) ? items : [];
    if (!state.group) return [{ key:"", label:"", items:rows }];
    const option = groupOptions.find((item) => item.value === state.group);
    if (!option) return [{ key:"", label:"", items:rows }];
    const getter = option.getter || ((item) => item?.[option.field || option.value]);
    const map = new Map();
    rows.forEach((item) => {
      const raw = getter(item);
      const label = String(raw ?? "未分组") || "未分组";
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(item);
    });
    return [...map.entries()].map(([label, grouped]) => ({ key:label, label, items:grouped }));
  }
  function setCount(value) { nodes.count.textContent = String(value ?? 0); }
  function updatePagination(total = 0, start = 0, end = 0, pageCount = 1) {
    if (!paginationEnabled || !nodes.pagination) return;
    if (nodes.range) nodes.range.textContent = options.rangeText?.({ total, start, end, page: state.page, pageCount }) || `当前显示 ${start}–${end} / ${total} 项`;
    if (nodes.pageLabel) nodes.pageLabel.textContent = `${state.page} / ${pageCount}`;
    if (nodes.prevPage) nodes.prevPage.disabled = state.page <= 1;
    if (nodes.nextPage) nodes.nextPage.disabled = state.page >= pageCount;
  }
  function paginateItems(items = []) {
    const rows = Array.isArray(items) ? items : [];
    if (!paginationEnabled) { setCount(rows.length); return { rows, total: rows.length, page: 1, pageCount: 1, start: rows.length ? 1 : 0, end: rows.length } ; }
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    state.page = Math.max(1, Math.min(state.page, pageCount));
    const startIndex = (state.page - 1) * pageSize;
    const pageRows = rows.slice(startIndex, startIndex + pageSize);
    const start = rows.length ? startIndex + 1 : 0;
    const end = rows.length ? startIndex + pageRows.length : 0;
    setCount(rows.length); updatePagination(rows.length, start, end, pageCount);
    return { rows: pageRows, total: rows.length, page: state.page, pageCount, start, end };
  }
  function showState(kind, title, description = "", action = null) {
    state.status = kind || "empty";
    nodes.status.hidden = false;
    nodes.status.dataset.state = state.status;
    nodes.status.innerHTML = `<strong>${esc(title)}</strong>${description ? `<p>${esc(description)}</p>` : ""}${action?.label ? `<button type="button" data-workspace-state-action="${esc(action.key || "action")}">${esc(action.label)}</button>` : ""}`;
    viewHosts.forEach((node) => { node.hidden = true; node.setAttribute("aria-hidden", "true"); });
    if (nodes.pagination) nodes.pagination.hidden = true;
    sync();
  }
  function hideState() { state.status = "ready"; nodes.status.hidden = true; nodes.status.dataset.state = "ready"; if (nodes.pagination) nodes.pagination.hidden = false; sync(); }
  function showEmpty(title, description = "") { showState("empty", title, description); }
  function showNoResults(title = "没有符合条件的结果", description = "请调整搜索、筛选或排序条件后重试。") { showState("no-results", title, description); }
  function showLoading(title = "正在加载", description = "请稍候，正在读取最新数据。") { showState("loading", title, description); }
  function showError(title = "数据读取失败", description = "请稍后重试；如持续出现，请检查数据源或网络状态。") { showState("error", title, description); }
  function showForbidden(title = "暂无访问权限", description = "当前账号没有查看或操作此数据范围的权限。") { showState("forbidden", title, description); }
  function hideEmpty() { hideState(); }
  function setFilter(value = "", key = filterDefs[0]?.key || "filter") {
    if (!filterNodes.has(key) && key !== "filter") return;
    state.filters[key] = value;
    if (key === "filter" || key === filterDefs[0]?.key) state.filter = value;
    const node = filterNodes.get(key) || nodes.filter; if (node) node.value = value;
    state.page = 1; sync(); emit(`filter:${key}`);
  }
  function getTableNodes(viewId = "list") { return { head: section.querySelector(`[data-workspace-table-head="${CSS.escape(viewId)}"]`), body: section.querySelector(`[data-workspace-table-body="${CSS.escape(viewId)}"]`) }; }

  filterDefs.forEach((filter) => setFilterOptions(filter.key, filter.options, filter.value));
  sync();
  return Object.freeze({
    section, state, nodes, viewHosts,
    getState: () => ({ ...state, filters: { ...state.filters } }),
    groupItems,
    getViewHost: (id) => viewHosts.get(id) || null,
    getTableNodes,
    setFilterOptions,
    setFilter,
    resetQueryState,
    setCount,
    paginateItems,
    showState,
    showEmpty,
    showNoResults,
    showLoading,
    showError,
    showForbidden,
    hideState,
    hideEmpty,
    refresh: sync,
    sortItems: (items) => sortItems(items, state.sort, sortOptions)
  });
}
