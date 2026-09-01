/* ========================================
   AIONE Sidebar V2.0 Behavior
   Default = auto-hide. User may pin expanded.
======================================== */

const STORAGE_KEY = "aione.sidebar.mode.v2";
const MODES = new Set(["auto", "expanded"]);

function readMode() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return MODES.has(saved) ? saved : "auto";
  } catch {
    return "auto";
  }
}

function writeMode(mode) {
  try { window.localStorage.setItem(STORAGE_KEY, mode); } catch {}
}

function applyMode(mode) {
  const next = MODES.has(mode) ? mode : "auto";
  document.body.dataset.sidebarMode = next;
  writeMode(next);
  const button = document.getElementById("sidebar-v2-mode-toggle");
  if (button) {
    const expanded = next === "expanded";
    button.setAttribute("aria-pressed", String(expanded));
    button.setAttribute("aria-label", expanded ? "取消固定左边栏，恢复自动隐藏" : "固定展开左边栏");
    button.setAttribute("title", expanded ? "取消固定，自动隐藏" : "固定展开");
  }
}

function installToolbar() {
  const sidebar = document.querySelector("[data-universal-sidebar]");
  if (!sidebar || sidebar.querySelector(".sidebar-v2-toolbar")) return false;

  const toolbar = document.createElement("div");
  toolbar.className = "sidebar-v2-toolbar";
  toolbar.setAttribute("aria-label", "左边栏显示方式");

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.id = "sidebar-v2-mode-toggle";
  toggle.className = "sidebar-v2-mode-toggle";
  toggle.innerHTML = '<span class="sidebar-v2-mode-toggle__glyph" aria-hidden="true">⌖</span>';
  toggle.addEventListener("click", () => {
    const current = document.body.dataset.sidebarMode || "auto";
    applyMode(current === "expanded" ? "auto" : "expanded");
  });

  toolbar.append(toggle);
  sidebar.prepend(toolbar);
  applyMode(document.body.dataset.sidebarMode || readMode());
  return true;
}

function normalizeBusinessLabels() {
  const businessLabels = new Map([
    ["selection", "选品"],
    ["sampling", "测样"],
    ["procurement", "采购"],
    ["design", "设计"],
    ["publishing", "上架"],
    ["operations", "运营"],
    ["orders", "订单"],
    ["inventory", "库存"],
    ["service", "客服"]
  ]);

  document.querySelectorAll("[data-sidebar-tree-group]").forEach((group) => {
    const label = businessLabels.get(group.dataset.sidebarTreeGroup || "");
    if (!label) return;
    const text = group.querySelector(".sidebar-tree-link>span:not(.sidebar-icon)");
    if (text) text.textContent = label;
    const toggle = group.querySelector("[data-sidebar-tree-toggle]");
    if (toggle) toggle.setAttribute("aria-label", `展开或收起${label}`);
  });
}

function refreshSidebarV2() {
  installToolbar();
  normalizeBusinessLabels();
}

export function initSidebarV2() {
  applyMode(readMode());
  refreshSidebarV2();

  const host = document.getElementById("sidebar-host");
  if (host) {
    const observer = new MutationObserver(refreshSidebarV2);
    observer.observe(host, { childList:true, subtree:true });
  }

  window.addEventListener("hashchange", () => window.requestAnimationFrame(refreshSidebarV2));
  window.addEventListener("aione:platform-context-change", () => window.requestAnimationFrame(refreshSidebarV2));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSidebarV2, { once:true });
} else {
  initSidebarV2();
}
