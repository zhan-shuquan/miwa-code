import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260824-v1.9.5-sidebar-aside-lock-candidate";
import { ROUTE_ID, PRODUCT_SIDEBAR_ITEMS, SYSTEM_TREE, STORE_TAXONOMIES, findNode } from "./category-center-preview-data.js";
import { renderPageShell, renderCurrentView } from "./category-center-preview-render.js";

const state = {
  view: "system",
  systemRootId: "01",
  systemChildId: "0105",
  systemLeafId: "010506",
  storeId: "primelife",
  storeRootId: "P01",
  storeChildId: "P0101",
  storeLeafId: "P010101",
  manageMode: false,
  selected: new Set(),
  compactParents: false
};

let observer = null;
let renderScheduled = false;

function currentRoute() {
  return String(window.location.hash || "").replace(/^#\/?/, "").split(/[/?]/)[0] || "";
}

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  window.setTimeout(() => {
    renderScheduled = false;
    if (currentRoute() === ROUTE_ID) renderPreview();
  }, 0);
}

function installObserver() {
  const host = document.getElementById("app-main-host");
  if (!host || observer) return;
  observer = new MutationObserver(() => {
    if (currentRoute() === ROUTE_ID && !host.querySelector("[data-category-center-preview]")) scheduleRender();
  });
  observer.observe(host, { childList: true, subtree: false });
}

function renderPreviewSidebar() {
  const host = document.getElementById("sidebar-navigation-tree");
  if (!host) return;
  host.innerHTML = PRODUCT_SIDEBAR_ITEMS.map((item) => `
    <a class="sidebar-flat-link ${item.current ? "category-preview-current" : ""}" href="${item.href}" ${item.current ? 'aria-current="page"' : ""}>
      <span class="sidebar-icon miwa-semantic-icon" data-icon="${item.icon}"></span><span>${item.label}</span>
    </a>`).join("");
  renderSemanticIcons(host);
}

function renderPreview() {
  const host = document.getElementById("app-main-host");
  if (!host) return;
  document.body.dataset.categoryTaxonomyPreview = "true";
  renderPreviewSidebar();
  host.innerHTML = renderPageShell(state);
  bindEvents(host);
  renderSemanticIcons(host);
}

function bindEvents(host) {
  host.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
    state.view = button.dataset.view;
    state.manageMode = false;
    state.selected.clear();
    refresh(host);
  }));

  host.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const cancelButton = target.closest('.taxonomy-dialog button[value="cancel"]');
    if (cancelButton) {
      event.preventDefault();
      event.stopPropagation();
      cancelButton.closest("dialog")?.close("cancel");
      return;
    }

    const ioTab = target.closest('.taxonomy-dialog[data-dialog="io"] .dialog-tabs button');
    if (ioTab) {
      event.preventDefault();
      switchIoTab(ioTab, host);
      return;
    }

    const actionNode = target.closest("[data-action]");
    if (actionNode) {
      handleAction(actionNode.dataset.action, host);
      return;
    }

    const levelAction = target.closest("[data-level-action]");
    if (levelAction) {
      handleLevelAction(levelAction.dataset.levelAction, Number(levelAction.dataset.level), host);
      return;
    }

    const cardMenu = target.closest("[data-card-menu]");
    if (cardMenu) {
      showToast(host, `“${cardMenu.closest("[data-node-id]")?.querySelector("strong")?.textContent || "分类"}”对象菜单：编辑 / 新建下级 / 移动 / 停用 / 查看映射`);
      return;
    }

    const batchAction = target.closest("[data-batch-action]")?.dataset.batchAction;
    if (batchAction) {
      showToast(host, `批量操作“${batchAction}”入口已验证；正式执行将在数据服务接入后启用。`);
      return;
    }

    const tool = target.closest("[data-tool]")?.dataset.tool;
    if (tool) {
      openToolDialog(tool, host);
      return;
    }

    const copy = target.closest("[data-copy]");
    if (copy) {
      navigator.clipboard?.writeText(copy.dataset.copy || "");
      showToast(host, "代码已复制");
      return;
    }

    const card = target.closest("[data-node-id]");
    if (card && !target.closest("input,button")) selectNode(card.dataset.nodeId, Number(card.dataset.nodeLevel), host);
  });

  host.addEventListener("change", (event) => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (!input?.matches("[data-import-file]")) return;
    const file = input.files?.[0];
    const name = host.querySelector("[data-import-name]");
    if (name) name.textContent = file ? file.name : "尚未选择文件";
  });

  bindDynamicEvents(host);
  host.querySelector("[data-new-form]")?.addEventListener("submit", () => showToast(host, "分类已加入预览会话；正式版保存前将执行编码与父级关系校验。"));
}

function switchIoTab(button, host) {
  const dialog = button.closest('[data-dialog="io"]');
  if (!dialog) return;
  const tabs = [...dialog.querySelectorAll(".dialog-tabs button")];
  tabs.forEach((tab) => tab.classList.toggle("is-active", tab === button));
  const panel = dialog.querySelector(".dialog-panel");
  const footer = dialog.querySelector("footer");
  const isExport = tabs.indexOf(button) === 1;

  if (isExport) {
    if (panel) panel.innerHTML = `
      <div class="tool-list">
        <div><b>导出范围</b><span>当前分类分支 / 当前层级 / 整个分类体系</span></div>
        <div><b>导出字段</b><span>分类编号、名称、父级、层级、状态、映射关系</span></div>
        <div><b>导出格式</b><span>Excel / CSV（正式版接统一导出服务）</span></div>
      </div>`;
    if (footer) footer.innerHTML = `<button value="cancel" class="tax-btn">取消</button><button type="button" class="tax-btn tax-btn--primary" data-action="preview-export">预览导出</button>`;
  } else {
    if (panel) panel.innerHTML = `<label class="upload-box"><input type="file" accept=".csv,.xlsx" data-import-file><span>选择 CSV / Excel</span><small data-import-name>尚未选择文件</small></label><div class="dialog-checks"><span>✓ 字段校验</span><span>✓ 父级关系检查</span><span>✓ 编码冲突检查</span><span>✓ 变更预览</span></div>`;
    if (footer) footer.innerHTML = `<button value="cancel" class="tax-btn">取消</button><button type="button" class="tax-btn" data-action="download-template">下载模板</button><button type="button" class="tax-btn tax-btn--primary" data-action="preview-import">预览导入</button>`;
  }
}

function bindDynamicEvents(host) {
  host.querySelectorAll("[data-select-node]").forEach((checkbox) => checkbox.addEventListener("change", () => {
    if (checkbox.checked) state.selected.add(checkbox.dataset.selectNode);
    else state.selected.delete(checkbox.dataset.selectNode);
    refresh(host);
  }));
  host.querySelector("[data-store-select]")?.addEventListener("change", (event) => {
    state.storeId = event.target.value;
    const tree = STORE_TAXONOMIES[state.storeId];
    state.storeRootId = tree.roots[0]?.id || "";
    state.storeChildId = tree.roots[0]?.children?.[0]?.id || "";
    state.storeLeafId = tree.roots[0]?.children?.[0]?.children?.[0]?.id || "";
    refresh(host);
  });
}

function handleAction(action, host) {
  if (action === "batch") {
    state.manageMode = !state.manageMode;
    if (!state.manageMode) state.selected.clear();
    refresh(host);
    return;
  }
  if (action === "io") return host.querySelector('[data-dialog="io"]')?.showModal();
  if (action === "new") return host.querySelector('[data-dialog="new"]')?.showModal();
  if (action === "more") {
    const menu = host.querySelector("[data-more-menu]");
    if (menu) menu.hidden = !menu.hidden;
    return;
  }
  if (action === "view-mapping") {
    state.view = "mapping";
    refresh(host);
    return;
  }
  if (["sync-store", "sync-current"].includes(action)) return showToast(host, "同步控制室入口已验证；正式版将先做差异预览，再确认发布到 Rakuten。 ");
  if (action === "download-template") return downloadTemplate();
  if (action === "preview-import") return showToast(host, "导入预览：正式版将显示新增 / 更新 / 冲突 / 父级缺失等变更摘要。 ");
  if (action === "preview-export") return showToast(host, "导出预览：正式版将按当前 Scope 生成 Excel / CSV，并保留分类层级与映射字段。 ");
  if (action === "mapping-search") return showToast(host, "已触发辅助分类查询入口；后续接平台 API、海关标准库与 GS1 GPC 数据源。 ");
  if (["edit-current", "view-related"].includes(action)) return showToast(host, `${action === "edit-current" ? "编辑" : "关联对象"}入口已验证。`);
  if (action?.startsWith("open-")) return showToast(host, "来源详情将在辅助分类数据源接入后显示版本、更新时间与原始路径。 ");
}

function handleLevelAction(action, level, host) {
  if (action === "toggle" && level === 1) {
    state.compactParents = !state.compactParents;
    refresh(host);
    return;
  }
  if (action === "sort") return showToast(host, `LEVEL ${level} 排序入口已验证；管理模式下可拖拽或批量调整。`);
  if (action === "add") return host.querySelector('[data-dialog="new"]')?.showModal();
  showToast(host, `LEVEL ${level} 操作已记录。`);
}

function selectNode(id, level, host) {
  if (state.view === "store") {
    const tree = STORE_TAXONOMIES[state.storeId];
    if (level === 1) {
      const root = findNode(tree.roots, id);
      state.storeRootId = id;
      state.storeChildId = root?.children?.[0]?.id || "";
      state.storeLeafId = root?.children?.[0]?.children?.[0]?.id || "";
    } else if (level === 2) {
      const root = findNode(tree.roots, state.storeRootId);
      const child = findNode(root?.children, id);
      state.storeChildId = id;
      state.storeLeafId = child?.children?.[0]?.id || "";
    } else state.storeLeafId = id;
  } else {
    if (level === 1) {
      const root = findNode(SYSTEM_TREE, id);
      state.systemRootId = id;
      state.systemChildId = root?.children?.[0]?.id || "";
      state.systemLeafId = root?.children?.[0]?.children?.[0]?.id || "";
    } else if (level === 2) {
      const root = findNode(SYSTEM_TREE, state.systemRootId);
      const child = findNode(root?.children, id);
      state.systemChildId = id;
      state.systemLeafId = child?.children?.[0]?.id || "";
    } else state.systemLeafId = id;
  }
  refresh(host);
}

function openToolDialog(tool, host) {
  const dialog = host.querySelector('[data-dialog="tool"]');
  if (!dialog) return;
  const map = {
    settings: ["分类设置", "设置分类编码规则、层级规则、默认展示方式、AI分类建议与权限。", `<div class="tool-list"><div><b>编码规则</b><span>01 / 0101 / 010501</span></div><div><b>层级规则</b><span>一级 → 二级 → 三级</span></div><div><b>默认展示</b><span>图文卡片</span></div><div><b>AI建议</b><span>启用（待服务接入）</span></div></div>`],
    trash: ["回收站", "误建或无业务关联的分类进入软删除回收站；已产生业务关系的分类优先停用或废止。", `<div class="tool-empty"><span>🗑️</span><b>暂无预览回收项</b><p>恢复时保留原分类 ID、编号、层级与关联历史。</p></div>`],
    history: ["操作记录", "查看分类新增、编辑、移动、合并、停用、恢复与映射变化。", `<div class="tool-timeline"><div><b>21:05</b><span>进入 Visual Taxonomy 交互验证</span></div><div><b>当前</b><span>操作记录将接入统一 Audit Log</span></div></div>`]
  };
  const item = map[tool] || map.settings;
  dialog.querySelector("[data-tool-title]").textContent = item[0];
  dialog.querySelector("[data-tool-description]").textContent = item[1];
  dialog.querySelector("[data-tool-content]").innerHTML = item[2];
  host.querySelector("[data-more-menu]")?.setAttribute("hidden", "");
  dialog.showModal();
}

function refresh(host) {
  const viewHost = host.querySelector("[data-category-view-host]");
  if (viewHost) viewHost.innerHTML = renderCurrentView(state);
  host.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === state.view));
  const batchButton = host.querySelector('[data-action="batch"]');
  if (batchButton) batchButton.lastChild.textContent = state.manageMode ? "退出管理" : "批量管理";
  bindDynamicEvents(host);
  renderSemanticIcons(host);
}

function showToast(host, message) {
  const toast = host.querySelector("[data-category-toast]");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function downloadTemplate() {
  const csv = "分类编号,分类名称,父级编号,层级,状态\n0105,男袜,01,2,启用\n010506,保暖袜,0105,3,启用\n";
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "AIONE分类导入模板_交互验证.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

window.addEventListener("hashchange", () => {
  if (currentRoute() === ROUTE_ID) scheduleRender();
  else delete document.body.dataset.categoryTaxonomyPreview;
});
window.addEventListener("DOMContentLoaded", () => {
  installObserver();
  if (currentRoute() === ROUTE_ID) scheduleRender();
});
window.setTimeout(() => {
  installObserver();
  if (currentRoute() === ROUTE_ID) scheduleRender();
}, 400);
