import { SYSTEM_TREE, STORE_TAXONOMIES } from "./category-center-preview-data.js";

function currentContext() {
  const root = document.querySelector("[data-category-center-preview]");
  if (!root) return null;
  const storeActive = root.querySelector('[data-view="store"]')?.classList.contains("is-active");
  const storeId = root.querySelector("[data-store-select]")?.value || "primelife";
  return {
    mode: storeActive ? "store" : "system",
    tree: storeActive ? (STORE_TAXONOMIES[storeId]?.roots || []) : SYSTEM_TREE,
    title: storeActive ? `${STORE_TAXONOMIES[storeId]?.label || "店铺"} · 分类全景` : "系统分类 · 分类全景"
  };
}

function countNodes(nodes) {
  let total = 0;
  let leaves = 0;
  (nodes || []).forEach((node) => {
    total += 1;
    if (node.children?.length) {
      const next = countNodes(node.children);
      total += next.total;
      leaves += next.leaves;
    } else leaves += 1;
  });
  return { total, leaves };
}

function renderTree(nodes, depth = 0) {
  return (nodes || []).map((node) => {
    const hasChildren = Boolean(node.children?.length);
    return `<div class="category-panorama-node" style="--tree-depth:${depth}">
      <button type="button" class="category-panorama-node__row" data-panorama-node="${node.id}">
        <span class="category-panorama-node__chevron">${hasChildren ? "▾" : "·"}</span>
        <span class="category-panorama-node__icon">${node.icon || "•"}</span>
        <strong>${node.name}</strong><small>${node.id}</small>
        ${hasChildren ? `<em>${node.children.length}</em>` : ""}
      </button>
      ${hasChildren ? `<div class="category-panorama-node__children">${renderTree(node.children, depth + 1)}</div>` : ""}
    </div>`;
  }).join("");
}

function renderStats(nodes) {
  const counts = countNodes(nodes);
  const top = (nodes || []).map((node, index) => ({
    name: node.name,
    childCount: node.children?.length || 0,
    pseudoProducts: Math.max(0, (node.children?.length || 0) * 37 + 48 - index * 3)
  }));
  const max = Math.max(...top.map((item) => item.pseudoProducts), 1);
  return `<div class="category-panorama-stats">
    <div class="category-panorama-metrics">
      <div><span>分类节点</span><strong>${counts.total}</strong></div>
      <div><span>末级分类</span><strong>${counts.leaves}</strong></div>
      <div><span>空分类</span><strong>待接真实数据</strong></div>
      <div><span>未分类商品</span><strong>待接真实数据</strong></div>
    </div>
    <section class="category-panorama-distribution">
      <header><h3>分类结构分布</h3><span>当前为结构验证；商品数量接数据库后显示真实值</span></header>
      ${top.map((item) => `<div class="category-panorama-bar"><span>${item.name}</span><div><i style="width:${Math.round(item.pseudoProducts / max * 100)}%"></i></div><b>${item.childCount} 个下级</b></div>`).join("")}
    </section>
    <section class="category-panorama-health"><h3>分类健康状态</h3><div><span>缺少图片</span><b>待接真实数据</b></div><div><span>辅助分类映射</span><b>待接平台 / 海关 / GS1 数据源</b></div><div><span>店铺同步差异</span><b>待接 Rakuten RMS</b></div></section>
  </div>`;
}

function ensureDialog(root) {
  let dialog = root.querySelector("[data-category-panorama-dialog]");
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.className = "taxonomy-dialog category-panorama-dialog";
  dialog.dataset.categoryPanoramaDialog = "true";
  root.append(dialog);
  dialog.addEventListener("click", (event) => {
    if (event.target.closest("[data-panorama-close]")) dialog.close();
    const row = event.target.closest("[data-panorama-node]");
    if (row) {
      dialog.querySelectorAll(".category-panorama-node__row.is-active").forEach((item) => item.classList.remove("is-active"));
      row.classList.add("is-active");
    }
  });
  return dialog;
}

function openPanorama() {
  const root = document.querySelector("[data-category-center-preview]");
  const context = currentContext();
  if (!root || !context) return;
  const dialog = ensureDialog(root);
  dialog.innerHTML = `<div class="category-panorama-shell">
    <header class="category-panorama-head"><div><span>结构 + 统计</span><h2>${context.title}</h2><p>左侧快速理解整棵分类树，右侧查看当前分类体系的结构与健康状态。</p></div><button type="button" data-panorama-close aria-label="关闭">×</button></header>
    <div class="category-panorama-toolbar"><label><span>搜索</span><input type="search" placeholder="分类名称 / 编号"></label><div><button type="button">全部展开</button><button type="button">全部收起</button></div></div>
    <div class="category-panorama-body"><section class="category-panorama-tree">${renderTree(context.tree)}</section>${renderStats(context.tree)}</div>
  </div>`;
  dialog.showModal();
}

function enhance() {
  const root = document.querySelector("[data-category-center-preview]");
  if (!root) return;

  const actions = root.querySelector(".category-page-actions");
  if (actions && !actions.querySelector("[data-category-panorama]")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tax-btn";
    button.dataset.categoryPanorama = "true";
    button.innerHTML = `<span class="miwa-semantic-icon" data-icon="category"></span>分类全景`;
    button.addEventListener("click", openPanorama);
    actions.prepend(button);
  }

  const settings = root.querySelector('[data-tool="settings"]');
  if (settings) {
    settings.lastChild.textContent = "分类规则";
    settings.setAttribute("title", "查看只读分类规则");
  }
}

window.addEventListener("aione:category-preview-rendered", enhance);
window.addEventListener("DOMContentLoaded", enhance);
window.setTimeout(enhance, 500);
