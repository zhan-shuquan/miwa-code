/* ========================================
   AIONE Primary Navigation｜RESET BASELINE
   2026-09-05

   Legacy desktop Sidebar / Workbench navigation has been removed.
   Legacy fixed Aside has also been removed.

   CURRENT locked shell:
   Header = 12之家全局入口
   Main = 当前业务内容
   Footer = 低干扰系统信息

   To be rebuilt from zero after Product Freeze:
   Sidebar = 当前之家目录（章）
   Context Drawer = 按需上下文辅助
======================================== */

function applyShellResetLayout() {
  const sidebarHost = document.getElementById("sidebar-host");
  if (sidebarHost) {
    sidebarHost.replaceChildren();
    sidebarHost.hidden = true;
    sidebarHost.style.display = "none";
  }

  const asideHost = document.getElementById("aside-host");
  if (asideHost) {
    asideHost.replaceChildren();
    asideHost.hidden = true;
    asideHost.style.display = "none";
  }

  const appBody = document.querySelector(".app-body");
  if (appBody && window.matchMedia("(min-width: 1100px)").matches) {
    appBody.style.gridTemplateColumns = "minmax(0,1fr)";
    appBody.classList.remove("has-aside");
    appBody.removeAttribute("data-aside-state");
  }

  document.documentElement.dataset.sidebarArchitecture = "reset-20260905";
  document.documentElement.dataset.contextDrawerArchitecture = "reset-20260905";
}

export function initPrimaryNavigation() {
  applyShellResetLayout();

  window.addEventListener("resize", applyShellResetLayout, { passive: true });
  window.addEventListener("hashchange", applyShellResetLayout);
  return true;
}
