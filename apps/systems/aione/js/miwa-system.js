/* ========================================
   MIWA System JS Entry｜AIONE全局外壳与内部路由
   外壳只负责统一入口和页面装载；现有业务代码由各工作台模块独立初始化。
======================================== */

import { systemConfig } from "./config/system-config.js";
import { ROUTE_REGISTRY, getRouteDefinition, getRouteId } from "./config/route-registry.js";
import { loadComponents } from "./core/component-loader.js";
import { initHeader } from "./shell/header.js";
import { initPrimaryNavigation } from "./shell/primary-navigation.js";
import { initAside } from "./shell/aside.js";
import { initFooter } from "./shell/footer.js";
import { initSystemSettings } from "./shell/system-settings.js";
import { initSelectionWorkbench } from "./pages/selection-workbench.js";
import { initSamplingQueue, initSamplingTasks, initSamplingWorkbench } from "./pages/sampling-workbench.js";
import { initTodayWork } from "./pages/today-work.js";
import { completeTaskForBusinessObject } from "./data/collaboration-store.js";
import { initMiwaCalendar } from "./pages/miwa-calendar.js";
import { initStrategicHome } from "./pages/strategic-homes.js";
import { initStoreHome } from "./pages/store-home.js";
import { resolvePreviewIdentity, getPreviewHeaderConfig, getPreviewPermissionContext } from "./auth/preview-auth.js";
import { recordPreviewActivity, getPreviewActivityRecords, getPreviewActivitySummary } from "./auth/preview-activity.js";

const SELECTION_SUBVIEWS = Object.freeze({
  overview: "./pages/selection-workbench/overview.html",
  tasks: "./pages/selection-workbench/tasks.html"
});

const STRATEGIC_HOME_ROUTES = new Set([
  "category-home",
  "product-home",
  "ai-home",
  "analysis",
  "shared-home"
]);

function getSelectionPage(hash = window.location.hash) {
  if (hash.startsWith("#/selection/overview")) return SELECTION_SUBVIEWS.overview;
  if (hash.startsWith("#/selection/tasks")) return SELECTION_SUBVIEWS.tasks;
  return ROUTE_REGISTRY.selection.page;
}

function getOpportunityRoute(hash = window.location.hash) {
  const match = String(hash).match(/^#\/(selection|sampling)\/opportunity\/([^?]+)/);
  if (!match) return null;
  const search = String(hash).includes("?") ? String(hash).slice(String(hash).indexOf("?")) : "";
  return {
    workbench: match[1],
    opportunityId: decodeURIComponent(match[2]),
    params: new URLSearchParams(search)
  };
}

function renderOpportunityFrame(context) {
  const host = document.getElementById("selection-main-host");
  if (!host) return;

  const source = new URL("./pages/selection-workbench/record-detail/index.html", window.location.href);
  source.searchParams.set("opportunity_id", context.opportunityId);
  source.searchParams.set("mode", context.params.get("mode") || "edit");
  source.searchParams.set("embed", "1");
  source.searchParams.set("entry", context.workbench);
  const selectionType = context.params.get("selection_type");
  if (selectionType) source.searchParams.set("selection_type", selectionType);
  ["owner", "created_at"].forEach((key) => {
    const value = context.params.get(key);
    if (value) source.searchParams.set(key, value);
  });
  source.hash = `/${context.workbench}/opportunity/${encodeURIComponent(context.opportunityId)}`;

  host.innerHTML = `
    <section class="route-business-frame" aria-label="${context.workbench === "sampling" ? "测样工作台" : "商品机会记录详情"}">
      <iframe title="${context.workbench === "sampling" ? "测样工作台" : "商品机会记录详情"}" src="${source.href}"></iframe>
    </section>
  `;
}

function renderReservedRoute(route) {
  const host = document.getElementById("selection-main-host");
  if (!host) return;
  const parent = route.parent ? ROUTE_REGISTRY[route.parent] : null;
  const returnLink = parent
    ? `<a class="route-reserved__back" href="#/${parent.id}">← 返回${parent.label}</a>`
    : "";
  host.innerHTML = `
    <section class="route-reserved" aria-labelledby="route-reserved-title">
      <div class="route-reserved__identity">
        ${returnLink}
        <h1 id="route-reserved-title">${route.title}</h1>
        <p>内部入口和所属位置已经预设，正式内容将在该模块进入建设阶段后接入。</p>
        <span>当前状态｜入口已就位 · 内容待建设</span>
      </div>
    </section>
  `;
}

async function renderCurrentRoute() {
  const route = getRouteDefinition();
  const routeId = getRouteId();

  document.title = `美和AIONE一体化工作平台｜${route.title}`;
  document.body.dataset.currentRoute = routeId;

  const opportunityRoute = getOpportunityRoute();
  if (opportunityRoute) {
    renderOpportunityFrame(opportunityRoute);
    return;
  }

  if (routeId === "selection") {
    const page = getSelectionPage();
    await loadComponents([["selection-main-host", page]]);
    if (page === ROUTE_REGISTRY.selection.page) initSelectionWorkbench();
    return;
  }

  if (routeId === "sampling") {
    await loadComponents([["selection-main-host", ROUTE_REGISTRY.sampling.page]]);
    initSamplingWorkbench();
    return;
  }

  if (routeId === "sampling-overview") {
    await loadComponents([["selection-main-host", ROUTE_REGISTRY["sampling-overview"].page]]);
    return;
  }

  if (routeId === "sampling-tasks") {
    await loadComponents([["selection-main-host", ROUTE_REGISTRY["sampling-tasks"].page]]);
    initSamplingTasks();
    return;
  }

  if (routeId === "sampling-queue") {
    await loadComponents([["selection-main-host", ROUTE_REGISTRY["sampling-queue"].page]]);
    initSamplingQueue();
    return;
  }

  if (routeId === "work") {
    await loadComponents([["selection-main-host", ROUTE_REGISTRY.work.page]]);
    initTodayWork();
    return;
  }

  if (routeId === "calendar") {
    await loadComponents([["selection-main-host", ROUTE_REGISTRY.calendar.page]]);
    initMiwaCalendar();
    return;
  }

  if (STRATEGIC_HOME_ROUTES.has(routeId)) {
    await loadComponents([["selection-main-host", route.page]]);
    initStrategicHome();
    return;
  }

  renderReservedRoute(route);
}

function showStartupError(error) {
  console.error("[AIONE] startup failed", error);
  document.querySelector(".miwa-system-error")?.remove();
  const panel = document.createElement("pre");
  panel.className = "miwa-system-error";
  panel.textContent = `AIONE启动失败：${String(error)}`;
  document.body.appendChild(panel);
}

async function safeRenderCurrentRoute() {
  try {
    await renderCurrentRoute();
    document.querySelector(".miwa-system-error")?.remove();
    return true;
  } catch (error) {
    showStartupError(error);
    return false;
  }
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

    initHeader({
      ...systemConfig.header,
      ...previewHeaderConfig,
      user: { ...systemConfig.header.user, ...previewHeaderConfig.user }
    });
    initPrimaryNavigation();
    initAside(systemConfig.aside);
    initFooter(systemConfig.footer);
    initSystemSettings();

    // 路由监听必须独立于任何单个工作台初始化。即使某个页面局部报错，
    // 也不能阻断其他工作台、平台入口和后续 hash 路由切换。
    window.addEventListener("message", (event) => {
      const payload = event?.data;
      if (!payload || payload.type !== "aione:sampling-completed" || !payload.opportunityId) return;
      completeTaskForBusinessObject("sampling", String(payload.opportunityId));
    });

    window.addEventListener("hashchange", async () => {
      await safeRenderCurrentRoute();
      recordPreviewActivity(previewIdentity, "route.view", { route: window.location.hash || "#/selection" });
    });

    await safeRenderCurrentRoute();
    recordPreviewActivity(previewIdentity, "route.view", { route: window.location.hash || "#/selection" });

    document.documentElement.dataset.miwaSystemReady = "true";
  } catch (error) {
    showStartupError(error);
  }
}

startMiwaSystem();
