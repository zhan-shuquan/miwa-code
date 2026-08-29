import { createUniversalWorkspace } from "../components/universal-workspace.js";
import { renderObjectList } from "../components/object-presenter.js";
import { getFieldSchema } from "../config/field-registry.js";
import {
  SELECTION_SORT_OPTIONS,
  loadSelectionItems,
  getSelectionOwners,
  filterSelectionItems,
  selectionPlatformLabel,
  selectionSourceLabel,
  selectionMoney,
  selectionResultLabel
} from "../data/selection-workbench-adapter.js?v=20260829-object-workspace-v1";
import {
  createSelectionPortal,
  initBatchImport,
  openSelectionRecordDetail
} from "./selection-workbench.js?v=20260829-selection-v3";

const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
const FIELD_MAP = new Map(getFieldSchema("selection").map((field) => [field.key, field]));
const fieldLabel = (key, fallback = key) => FIELD_MAP.get(key)?.label || fallback;

function listProductHtml(item) {
  const image = item?.representativeImage?.url
    ? `<img src="${esc(item.representativeImage.url)}" alt="" loading="lazy">`
    : `<span>${esc(String(item.name || "商").slice(0, 1))}</span>`;
  const source = item?.sourceUrl
    ? `<a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(selectionSourceLabel(item))} ↗</a>`
    : `<em>${esc(selectionSourceLabel(item))}</em>`;
  return `<div class="miwa-selection-list-product"><span class="miwa-selection-list-thumb">${image}</span><span><strong>${esc(item.name)}</strong><small>${esc(item.id)} · ${esc(item.type)} · ${source}</small></span></div>`;
}

export function mountSelectionObjectWorkspace(parent, options = {}) {
  if (!parent) throw new Error("商品机会对象工作区缺少挂载容器");

  const itemsProvider = typeof options.itemsProvider === "function" ? options.itemsProvider : () => loadSelectionItems();
  let items = itemsProvider();
  const portal = document.createElement("div");
  portal.className = "miwa-level2-portal";
  portal.dataset.selectionObjectWorkspacePortal = "";
  parent.appendChild(portal);

  let workspace;
  const renderObjects = () => {
    if (!workspace) return;
    const rows = workspace.sortItems(filterSelectionItems(items, workspace.getState(), ""));
    if (!rows.length) {
      workspace.setCount(0);
      if (items.length) workspace.showNoResults();
      else workspace.showEmpty("暂无商品机会", "商品机会对象接入数据后将在这里统一展示。");
      return;
    }

    workspace.hideState();
    const page = workspace.paginateItems(rows);
    const table = workspace.getTableNodes("list");
    renderObjectList(table.head, table.body, page.rows, {
      fields: [
        { label:"商品机会", renderHtml:listProductHtml, className:"miwa-selection-list-primary" },
        { label:fieldLabel("owner", "负责人"), value:(item)=>item.owner },
        { label:fieldLabel("stageName", "当前事项"), value:(item)=>item.stageName },
        { label:fieldLabel("platforms", "销售平台"), value:(item)=>selectionPlatformLabel(item) },
        { label:fieldLabel("time", "时间"), value:(item)=>item.time },
        { label:fieldLabel("cost", "投入成本"), value:(item)=>selectionMoney(item.cost) },
        { label:fieldLabel("result", "结果"), value:(item)=>selectionResultLabel(item) }
      ],
      actions:[{ key:"edit", label:"查看对象" }]
    });
  };

  workspace = createUniversalWorkspace(parent, {
    pageId: options.pageId || "selection-object-workspace",
    title: options.title || "商品机会一览",
    description: options.description || "公司共享的商品机会对象视图。",
    searchPlaceholder: options.searchPlaceholder || "搜索商品 / 机会ID / 负责人",
    filters: [
      { key:"type", label:"选品方式", allLabel:"全部选品方式", options:["直发选品", "常规选品"] },
      { key:"status", label:"状态", allLabel:"全部状态", options:[{ value:"ongoing", label:"进行中" }, { value:"decided", label:"已判断" }] },
      { key:"owner", label:"负责人", allLabel:"全部负责人", options:getSelectionOwners(items) },
      { key:"time", label:"时间范围", allLabel:"全部时间", options:[{ value:"today", label:"今天" }, { value:"7d", label:"近7天" }, { value:"month", label:"本月" }] }
    ],
    sortOptions: SELECTION_SORT_OPTIONS,
    views:["list"],
    defaultView:"list",
    allowImport:false,
    allowExport:false,
    pageSize:12,
    onStateChange:renderObjects
  });

  if (options.hideHeader) {
    const head = workspace.section.querySelector(".miwa-level2-block__head");
    if (head) head.hidden = true;
  }
  if (options.totalLabel && workspace.nodes.count) {
    workspace.nodes.count.setAttribute("aria-label", options.totalLabel);
  }

  const portalState = createSelectionPortal(portal);
  let toastTimer = null;
  const showToast = (text) => {
    const node = portalState?.toast;
    if (!node) return;
    node.textContent = text;
    node.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => node.classList.remove("is-visible"), 2200);
  };
  const batchImport = initBatchImport(portalState, showToast, () => {
    items = itemsProvider();
    workspace.setFilterOptions("owner", getSelectionOwners(items), workspace.getState().filters.owner || "");
    renderObjects();
  });

  parent.addEventListener("click", (event) => {
    const action = event.target.closest("[data-object-action]");
    if (!action) return;
    const item = items.find((row) => String(row.id) === String(action.dataset.objectId));
    if (!item) return;
    if (action.dataset.objectAction === "edit") {
      openSelectionRecordDetail({ id:item.id, type:item.type, mode:"edit" });
    }
  });

  const refresh = () => {
    items = itemsProvider();
    workspace.setFilterOptions("owner", getSelectionOwners(items), workspace.getState().filters.owner || "");
    renderObjects();
  };
  window.addEventListener("aione:global-settings-updated", refresh);

  renderObjects();

  return Object.freeze({
    workspace,
    refresh,
    openBatch: (type = "") => batchImport?.open(type)
  });
}
