/* ========================================
   AIONE Sidebar Shell V2.0
   Desktop interaction state only.
======================================== */

const STORAGE_KEY = "aione.sidebar.mode.v2";
const MODE_AUTO = "auto";
const MODE_PINNED = "pinned";
const COLLAPSE_DELAY = 260;

function getStoredMode() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === MODE_PINNED ? MODE_PINNED : MODE_AUTO;
  } catch {
    return MODE_AUTO;
  }
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
  button.setAttribute("aria-label", pinned ? "恢复左侧导航自动隐藏" : "固定展开左侧导航");
  button.setAttribute("title", pinned ? "恢复自动隐藏" : "固定展开");
}

function applyMode(mode, { persist = false } = {}) {
  const next = mode === MODE_PINNED ? MODE_PINNED : MODE_AUTO;
  document.documentElement.dataset.sidebarMode = next;
  if (next === MODE_PINNED) setAutoExpanded(false);
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
    const current = document.documentElement.dataset.sidebarMode || MODE_AUTO;
    applyMode(current === MODE_PINNED ? MODE_AUTO : MODE_PINNED, { persist: true });
  });

  controls.append(button);
  sidebar.prepend(controls);
  syncModeButton(document.documentElement.dataset.sidebarMode || MODE_AUTO);
}

function bindAutoBehavior() {
  const host = getHost();
  if (!host || host.dataset.sidebarShellBound === "true") return;
  host.dataset.sidebarShellBound = "true";

  let collapseTimer = 0;
  const cancelCollapse = () => {
    if (collapseTimer) window.clearTimeout(collapseTimer);
    collapseTimer = 0;
  };
  const expand = () => {
    if (document.documentElement.dataset.sidebarMode !== MODE_AUTO) return;
    cancelCollapse();
    setAutoExpanded(true);
  };
  const scheduleCollapse = () => {
    if (document.documentElement.dataset.sidebarMode !== MODE_AUTO) return;
    cancelCollapse();
    collapseTimer = window.setTimeout(() => {
      const active = document.activeElement;
      if (active instanceof Node && host.contains(active)) return;
      setAutoExpanded(false);
    }, COLLAPSE_DELAY);
  };

  host.addEventListener("pointerenter", expand);
  host.addEventListener("pointerleave", scheduleCollapse);
  host.addEventListener("focusin", expand);
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
