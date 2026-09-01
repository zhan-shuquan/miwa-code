/* ========================================
   AIONE Sidebar Shell V2.0
   Desktop interaction state only.
======================================== */

const STORAGE_KEY = "aione.sidebar.mode.v2";
const MODE_AUTO = "auto";
const MODE_PINNED = "pinned";

/* Auto mode is optional. Delays intentionally require deliberate interaction
   so ordinary pointer travel across the left edge does not make the workspace
   continuously move or cover Main. */
const EXPAND_DELAY = 220;
const COLLAPSE_DELAY = 560;

function getStoredMode() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === MODE_AUTO || value === MODE_PINNED) return value;
  } catch {
    // Preference persistence must never block Sidebar usability.
  }

  /* Stability-first default: new users receive a normal pinned Sidebar.
     Auto hide is an explicit user choice, not an automatic platform behavior. */
  return MODE_PINNED;
}

function storeMode(mode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Preference persistence must never block Sidebar usability.
  }
}

function getHost() {
  return document.querySelector(".desktop-sidebar-host");
}

function getSidebar() {
  return document.querySelector(".desktop-sidebar-host .desktop-sidebar");
}

function getModeButton() {
  return document.querySelector(".desktop-sidebar-host [data-sidebar-shell-mode]");
}

function setAutoExpanded(expanded) {
  const host = getHost();
  if (!host) return;
  host.classList.toggle("is-sidebar-auto-expanded", expanded);
}

function syncModeButton(mode) {
  const button = getModeButton();
  if (!button) return;
  const pinned = mode === MODE_PINNED;
  button.setAttribute("aria-pressed", String(pinned));
  button.setAttribute("aria-label", pinned ? "切换为左侧导航自动隐藏" : "固定展开左侧导航");
  button.setAttribute("title", pinned ? "启用自动隐藏" : "固定展开");
}

function applyMode(mode, { persist = false } = {}) {
  const next = mode === MODE_AUTO ? MODE_AUTO : MODE_PINNED;
  document.documentElement.dataset.sidebarMode = next;
  setAutoExpanded(false);
  syncModeButton(next);
  if (persist) storeMode(next);
}

function installModeButton() {
  const sidebar = getSidebar();
  if (!sidebar || getModeButton()) return;

  const controls = document.createElement("div");
  controls.className = "sidebar-shell-controls";
  controls.setAttribute("aria-label", "左侧导航显示方式");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "sidebar-shell-mode-button";
  button.dataset.sidebarShellMode = "true";
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 3h8l1 5 3 3v1H4v-1l3-3 1-5Z"></path>
      <path d="M12 12v9"></path>
    </svg>
  `;

  button.addEventListener("click", () => {
    const current = document.documentElement.dataset.sidebarMode || MODE_PINNED;
    applyMode(current === MODE_PINNED ? MODE_AUTO : MODE_PINNED, { persist: true });
  });

  controls.append(button);
  sidebar.prepend(controls);
  syncModeButton(document.documentElement.dataset.sidebarMode || MODE_PINNED);
}

function bindAutoBehavior() {
  const host = getHost();
  if (!host || host.dataset.sidebarShellBound === "true") return;
  host.dataset.sidebarShellBound = "true";

  let expandTimer = 0;
  let collapseTimer = 0;

  const cancelExpand = () => {
    if (expandTimer) window.clearTimeout(expandTimer);
    expandTimer = 0;
  };

  const cancelCollapse = () => {
    if (collapseTimer) window.clearTimeout(collapseTimer);
    collapseTimer = 0;
  };

  const scheduleExpand = () => {
    if (document.documentElement.dataset.sidebarMode !== MODE_AUTO) return;
    cancelCollapse();
    cancelExpand();
    expandTimer = window.setTimeout(() => {
      if (document.documentElement.dataset.sidebarMode !== MODE_AUTO) return;
      setAutoExpanded(true);
      expandTimer = 0;
    }, EXPAND_DELAY);
  };

  const expandForKeyboard = () => {
    if (document.documentElement.dataset.sidebarMode !== MODE_AUTO) return;
    cancelExpand();
    cancelCollapse();
    setAutoExpanded(true);
  };

  const scheduleCollapse = () => {
    if (document.documentElement.dataset.sidebarMode !== MODE_AUTO) return;
    cancelExpand();
    cancelCollapse();
    collapseTimer = window.setTimeout(() => {
      const active = document.activeElement;
      if (active instanceof Node && host.contains(active)) return;
      setAutoExpanded(false);
      collapseTimer = 0;
    }, COLLAPSE_DELAY);
  };

  host.addEventListener("pointerenter", scheduleExpand);
  host.addEventListener("pointerleave", scheduleCollapse);
  host.addEventListener("focusin", expandForKeyboard);
  host.addEventListener("focusout", scheduleCollapse);
}

function ensureSidebarShell() {
  if (!window.matchMedia("(min-width: 1100px)").matches) return false;
  const sidebar = getSidebar();
  if (!sidebar) return false;
  installModeButton();
  bindAutoBehavior();
  applyMode(getStoredMode());
  return true;
}

export function initSidebarShellV2() {
  if (ensureSidebarShell()) return;

  const observer = new MutationObserver(() => {
    if (!ensureSidebarShell()) return;
    observer.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 12000);
}

initSidebarShellV2();
