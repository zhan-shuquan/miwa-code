/* ========================================
   AIONE Primary Navigation｜RESET BASELINE
   2026-09-05

   The legacy desktop Sidebar / Workbench navigation has been intentionally
   removed from CURRENT runtime.

   CURRENT locked shell:
   Header = 12之家全局入口
   Main = 当前业务内容
   Aside = 上下文辅助
   Footer = 低干扰系统信息

   Sidebar will be rebuilt from zero after the House directory (章) Product
   Freeze is confirmed. The Google Sheets directory baselines are the source
   for that rebuild; do not infer a new directory from legacy code.
======================================== */

function applySidebarResetLayout() {
  const host = document.getElementById("sidebar-host");
  if (host) {
    host.replaceChildren();
    host.hidden = true;
    host.style.display = "none";
  }

  const appBody = document.querySelector(".app-body");
  if (appBody && window.matchMedia("(min-width: 1100px)").matches) {
    appBody.style.gridTemplateColumns = "minmax(0,1fr) var(--desktop-aside)";
  }

  document.documentElement.dataset.sidebarArchitecture = "reset-20260905";
}

export function initPrimaryNavigation() {
  applySidebarResetLayout();

  window.addEventListener("resize", applySidebarResetLayout, { passive: true });
  window.addEventListener("hashchange", applySidebarResetLayout);
  return true;
}
