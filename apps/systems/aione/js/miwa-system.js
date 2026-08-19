/* ========================================
   MIWA System JS Entry｜美和システムJS総入口
   公共コンポーネントの読込と初期化順序はこのファイルだけで管理する。
======================================== */

import { systemConfig } from "./config/system-config.js";
import { loadComponents } from "./core/component-loader.js";
import { initHeader } from "./shell/header.js";
import { initPrimaryNavigation } from "./shell/primary-navigation.js";
import { initAside } from "./shell/aside.js";
import { initFooter } from "./shell/footer.js";
import { initSystemSettings } from "./shell/system-settings.js";
import { initSelectionWorkbench } from "./pages/selection-workbench.js";
import { resolvePreviewIdentity, getPreviewHeaderConfig, getPreviewPermissionContext } from "./auth/preview-auth.js";
import { recordPreviewActivity, getPreviewActivityRecords, getPreviewActivitySummary } from "./auth/preview-activity.js";

const SELECTION_ROUTES = Object.freeze({
  workbench: "./pages/selection-workbench/home.html",
  overview: "./pages/selection-workbench/overview.html",
  tasks: "./pages/selection-workbench/tasks.html"
});

function getSelectionView(){
  const hash = window.location.hash || "#/selection";
  if(hash.startsWith("#/selection/overview")) return "overview";
  if(hash.startsWith("#/selection/tasks")) return "tasks";
  return "workbench";
}

async function renderSelectionRoute(){
  if(!window.location.hash.startsWith("#/selection")) return;
  const view = getSelectionView();
  await loadComponents([["selection-main-host", SELECTION_ROUTES[view]]]);
  if(view === "workbench") initSelectionWorkbench();
}

async function startMiwaSystem() {
  try {
    const previewIdentity = await resolvePreviewIdentity();
    const previewHeaderConfig = getPreviewHeaderConfig(previewIdentity);
    window.AIONEPreviewPermissionContext = getPreviewPermissionContext(previewIdentity);
    window.AIONEPreviewActivity = Object.freeze({
      record: (eventType, payload = {}) => recordPreviewActivity(previewIdentity, eventType, payload),
      records: () => getPreviewActivityRecords(previewIdentity.subjectId),
      summary: () => getPreviewActivitySummary(previewIdentity.subjectId)
    });

    if (!window.location.hash) history.replaceState(null, "", "#/selection");

    const shellComponents = systemConfig.components.filter(([hostId]) => hostId !== "selection-main-host");
    await loadComponents(shellComponents);
    initHeader({ ...systemConfig.header, ...previewHeaderConfig, user: { ...systemConfig.header.user, ...previewHeaderConfig.user } });
    initPrimaryNavigation();
    initAside(systemConfig.aside);
    initFooter(systemConfig.footer);
    initSystemSettings();
    await renderSelectionRoute();
    recordPreviewActivity(previewIdentity, "route.view", { route: window.location.hash || "#/selection" });

    window.addEventListener("hashchange", () => {
      recordPreviewActivity(previewIdentity, "route.view", { route: window.location.hash || "#/selection" });
      renderSelectionRoute().catch((error) => console.error(error));
    });

    document.documentElement.dataset.miwaSystemReady = "true";
  } catch (error) {
    console.error(error);
    document.body.insertAdjacentHTML(
      "beforeend",
      `<pre class="miwa-system-error">${String(error)}</pre>`
    );
  }
}

startMiwaSystem();
