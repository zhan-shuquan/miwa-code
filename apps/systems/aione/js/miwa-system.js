import { setCurrentBusinessSpace } from "./shell/platform-context.js";
import { BUSINESS_SPACES } from "./config/business-navigation.js";
/* ========================================
   MIWA System JS Entry｜AIONE全局外壳与内部路由
   外壳只负责统一入口和页面装载；现有业务代码由各工作台模块独立初始化。
======================================== */

import { systemConfig } from "./config/system-config.js";
import { ROUTE_REGISTRY, getRouteDefinition, getRouteId } from "./config/route-registry.js";
import { loadComponents } from "./core/component-loader.js";
import { initHeader } from "./shell/header.js";
import { initPrimaryNavigation } from "./shell/primary-navigation.js";
import { initPlatformContext } from "./shell/platform-context.js";
import { initAside } from "./shell/aside.js";
import { initMiwaAILayer } from "./shell/miwa-ai-layer.js?v=20260824-v1.9.17-ai-context-router";
import { initFooter } from "./shell/footer.js";
import { initSystemSettings } from "./shell/system-settings.js";
import { initSelectionWorkbench } from "./pages/selection-workbench.js";
import { initSamplingQueue, initSamplingTasks, initSamplingWorkbench } from "./pages/sampling-workbench.js";
import { completeTaskForBusinessObject } from "./data/collaboration-store.js";
import { initMiwaCalendar } from "./pages/miwa-calendar.js";
import { initBusinessPage } from "./pages/business-page-template.js";
import { initContentPage } from "./pages/content-page-template.js";
import { initNotificationsPage } from "./pages/notifications.js";
import { initNotificationDetailPage } from "./pages/notification-detail.js";
import { syncNotificationHeader } from "./data/notification-store.js";
import { resolvePreviewIdentity, getPreviewHeaderConfig, getPreviewPermissionContext } from "./auth/preview-auth.js";
import { recordPreviewActivity, getPreviewActivityRecords, getPreviewActivitySummary } from "./auth/preview-activity.js";

const SELECTION_SUBVIEWS = Object.freeze({
  overview: "./pages/selection-workbench/overview.html",
  tasks: "./pages/selection-workbench/tasks.html"
});

const BUSINESS_TEMPLATE_ROUTES = new Set([
  "finance-home",
  "channel-home",
  "business-home",
  "category-home", "product-home", "customer-home", "supplier-home", "talent-home", "ai-home", "ai-office", "shared-home",
  "store-home", "application-home", "income-home", "expense-home", "cash-expense", "work", "analysis"
]);
const CONTENT_TEMPLATE_ROUTES = new Set(["company", "knowledge-home"]);

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

function renderBusinessHomePage() {
  const host = document.getElementById("business-space-cards");
  const count = document.getElementById("business-space-count");
  if (!host) return;

  const spaces = Object.values(BUSINESS_SPACES);
  if (count) count.textContent = String(spaces.length);

  const cards = spaces.map((space) => {
    const card = document.createElement("article");
    card.className = "business-space-card";

    const top = document.createElement("div");
    top.className = "business-space-card__top";

    const identity = document.createElement("div");
    identity.className = "business-space-card__identity";

    const icon = document.createElement("div");
    icon.className = "business-space-card__icon";
    icon.textContent = space.shortLabel?.slice(0, 1) || "事";

    const names = document.createElement("div");

    const title = document.createElement("h3");
    title.textContent = space.label;

    const shortLabel = document.createElement("div");
    shortLabel.className = "business-space-card__short";
    shortLabel.textContent = `事业简称：${space.shortLabel || space.label}`;

    names.append(title, shortLabel);
    identity.append(icon, names);

    const status = document.createElement("span");
    status.className = "business-space-card__status";
    status.textContent = "已配置";

    top.append(identity, status);

    const body = document.createElement("div");
    body.className = "business-space-card__body";

    const workbenches = Array.from(space.workbenches || []);
    const meta = document.createElement("div");
    meta.className = "business-space-card__meta";
    meta.textContent = `工作台 ${workbenches.length} 个`;

    const workbenchText = document.createElement("div");
    workbenchText.className = "business-space-card__workbenches";
    workbenchText.textContent = workbenches.length
      ? workbenches.slice(0, 6).map((item) => item.label).join(" · ")
      : "事业执行结构待配置";

    body.append(meta, workbenchText);

    const actions = document.createElement("div");
    actions.className = "business-space-card__actions";

    const enter = document.createElement("button");
    enter.type = "button";
    enter.className = "business-space-card__enter";
    enter.textContent = "进入事业";
    enter.addEventListener("click", () => {
      setCurrentBusinessSpace(space.id, {
        navigate: true,
        reason: "business-home-card"
      });
    });

    actions.append(enter);
    card.append(top, body, actions);

    return card;
  });

  host.replaceChildren(...cards);
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
  window.dispatchEvent(new CustomEvent("aione:page-aside-context", { detail: { state: "light", kicker: "当前上下文", title: route.title, text: "当前页面暂无必须展开的辅助信息；如出现关键状态、风险或关联信息，右侧将按需更新。" } }));

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

  if (routeId === "calendar") {
    await loadComponents([["selection-main-host", ROUTE_REGISTRY.calendar.page]]);
    initMiwaCalendar();
    return;
  }

  if (CONTENT_TEMPLATE_ROUTES.has(routeId)) {
    await loadComponents([["selection-main-host", route.page]]);
    await initContentPage();
    return;
  }
  if (routeId === "business-home") {
    await loadComponents([["selection-main-host", route.page]]);
    renderBusinessHomePage();
    return;
  }

  if (BUSINESS_TEMPLATE_ROUTES.has(routeId)) {
    await loadComponents([["selection-main-host", route.page]]);
    await initBusinessPage();
    return;
  }

  if (routeId === "notifications") {
    await loadComponents([["selection-main-host", route.page]]);
    initNotificationsPage();
    return;
  }

  if (routeId === "notification-detail") {
    await loadComponents([["selection-main-host", route.page]]);
    initNotificationDetailPage();
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
    initPlatformContext();

    const shellComponents = systemConfig.components.filter(([hostId]) => hostId !== "selection-main-host");
    await loadComponents(shellComponents);

    const initShellModule = (name, fn) => {
      try { return fn(); }
      catch (error) {
        console.error(`[AIONE] ${name} 初始化失败；其他Shell区域继续启动。`, error);
        return false;
      }
    };

    initShellModule("Header", () => initHeader({
      ...systemConfig.header,
      ...previewHeaderConfig,
      user: { ...systemConfig.header.user, ...previewHeaderConfig.user }
    }));
    initShellModule("Primary Navigation", () => initPrimaryNavigation());
    initShellModule("Aside", () => initAside(systemConfig.aside));
    initShellModule("美和AI", () => initMiwaAILayer());
    initShellModule("Footer", () => initFooter(systemConfig.footer));
    initShellModule("System Settings", () => initSystemSettings());
    initShellModule("Notification Header", () => syncNotificationHeader());

    // 路由监听必须独立于任何单个工作台初始化。即使某个页面局部报错，
    // 也不能阻断其他工作台、平台入口和后续 hash 路由切换。
    window.addEventListener("message", (event) => {
      const payload = event?.data;
      if (!payload || payload.type !== "aione:sampling-completed" || !payload.opportunityId) return;
      completeTaskForBusinessObject("sampling", String(payload.opportunityId));
    });

    window.addEventListener("miwa:header:notice-detail", (event) => {
      const noticeId = event?.detail?.noticeId;
      window.location.hash = noticeId
        ? `#/notification-detail?id=${encodeURIComponent(String(noticeId))}`
        : "#/notifications";
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
