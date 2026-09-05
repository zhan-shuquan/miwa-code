/* ========================================
   AIONE Context Drawer｜RESET BASELINE
   2026-09-05

   Legacy fixed Aside has been removed from CURRENT runtime.

   CURRENT shell direction:
   Header = global / 12之家
   Sidebar = current House directory (to be rebuilt from zero)
   Main = primary workspace
   Context Drawer = on-demand contextual assistance (to be rebuilt from zero)
   Footer = low-attention system information

   No fixed third column, no default light/standard panel, and no automatic
   placeholder content are retained here.
======================================== */

function applyContextDrawerReset() {
  const host = document.getElementById("aside-host");
  if (host) {
    host.replaceChildren();
    host.hidden = true;
    host.style.display = "none";
  }

  const appBody = document.querySelector(".app-body");
  if (appBody) {
    appBody.removeAttribute("data-aside-state");
    appBody.classList.remove("has-aside");
  }

  document.documentElement.dataset.contextDrawerArchitecture = "reset-20260905";
}

export function initAside() {
  applyContextDrawerReset();

  // Preserve a minimal compatibility surface so legacy page events do not fail
  // while the new Context Drawer V1 is being Product-Frozen.
  window.AIONEContextAside = Object.freeze({
    setContext() {},
    open() {},
    close() {}
  });

  window.addEventListener("aione:page-aside-context", applyContextDrawerReset);
  window.addEventListener("resize", applyContextDrawerReset, { passive: true });
  return true;
}
