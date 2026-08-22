/* ========================================
   MIWA Primary Navigation｜事业切换・現在地・二级业务导航
======================================== */

import { ROUTE_REGISTRY } from "../config/route-registry.js";
import { BUSINESS_SPACES, getBusinessSpaceForRoute, getWorkbenchForRoute } from "../config/business-navigation.js";
import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260822-v1.3.0-level2-empty-base-candidate";

const STORAGE_KEY = "aione.currentBusinessSpace";

function getCurrentRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return hash.split(/[/?]/)[0] || "work";
}

function getStoredBusinessSpace() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return BUSINESS_SPACES[saved] ? saved : "crossborder";
  } catch {
    return "crossborder";
  }
}

function setStoredBusinessSpace(spaceId) {
  try { window.localStorage.setItem(STORAGE_KEY, spaceId); } catch { /* no-op */ }
}

function resolveBusinessSpace() {
  const routeSpace = getBusinessSpaceForRoute(getCurrentRoute());
  return routeSpace?.id || getStoredBusinessSpace();
}

function createWorkbenchLink(workbench, mobile = false) {
  const link = document.createElement("a");
  link.href = `#/${workbench.route}`;
  link.dataset.navRoute = workbench.route;
  link.className = mobile ? "drawer-link" : "sidebar-link";

  const icon = document.createElement("span");
  icon.className = mobile ? "drawer-link__icon miwa-semantic-icon" : "sidebar-icon miwa-semantic-icon";
  icon.dataset.icon = workbench.icon || "apps";
  const label = document.createElement("span");
  label.textContent = workbench.label;
  link.append(icon, label);
  return link;
}

function renderBusinessSwitch(spaceId) {
  document.querySelectorAll("[data-business-space]").forEach((button) => {
    const active = button.dataset.businessSpace === spaceId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const space = BUSINESS_SPACES[spaceId];
  const desktopTitle = document.getElementById("sidebar-business-title");
  const mobileTitle = document.getElementById("mobile-business-title");
  if (desktopTitle) desktopTitle.textContent = space.label;
  if (mobileTitle) mobileTitle.textContent = space.label;
}

function renderWorkbenchNavigation(spaceId = resolveBusinessSpace()) {
  const space = BUSINESS_SPACES[spaceId] || BUSINESS_SPACES.crossborder;
  const desktopHost = document.getElementById("workbench-navigation-list");
  const mobileHost = document.getElementById("mobile-workbench-navigation-list");
  if (desktopHost) desktopHost.replaceChildren(...space.workbenches.map((entry) => createWorkbenchLink(entry)));
  if (mobileHost) mobileHost.replaceChildren(...space.workbenches.map((entry) => createWorkbenchLink(entry, true)));
  renderBusinessSwitch(space.id);
  renderSemanticIcons(document);
}

function renderContextNavigation() {
  const host = document.getElementById("business-quick-links");
  if (!host) return;
  const routeId = getCurrentRoute();
  const currentPath = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  const workbench = getWorkbenchForRoute(routeId);

  if (!workbench?.children?.length) {
    const empty = document.createElement("div");
    empty.className = "quick-links-empty";
    empty.textContent = "当前页面的二级业务入口将在模块建设时接入。";
    host.replaceChildren(empty);
    return;
  }

  const links = workbench.children.map((entry) => {
    const link = document.createElement("a");
    link.className = "sidebar-context-link";
    link.href = `#/${entry.route}`;
    link.textContent = entry.label;
    if (entry.route === currentPath || entry.route === routeId) link.setAttribute("aria-current", "page");
    return link;
  });
  host.replaceChildren(...links);
}

function updateActiveRoute() {
  const routeId = getCurrentRoute();
  const workbench = getWorkbenchForRoute(routeId);
  const activeWorkbenchRoute = workbench?.route || routeId;

  document.querySelectorAll("[data-nav-route]").forEach((item) => {
    const isActive = item.dataset.navRoute === activeWorkbenchRoute;
    item.classList.toggle("active", isActive);
    if (isActive) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });

  document.querySelectorAll("[data-mobile-route]").forEach((item) => {
    item.classList.toggle("active", item.dataset.mobileRoute === routeId);
  });

  const isBusinessRoute = Boolean(workbench);
  document.querySelectorAll('[data-mobile-section="workbenches"]').forEach((item) => {
    item.classList.toggle("active", isBusinessRoute);
  });
}

function bindBusinessSwitch() {
  document.querySelectorAll("[data-business-space]").forEach((button) => {
    button.addEventListener("click", () => {
      const spaceId = button.dataset.businessSpace;
      const space = BUSINESS_SPACES[spaceId];
      if (!space) return;
      setStoredBusinessSpace(spaceId);
      renderWorkbenchNavigation(spaceId);
      renderContextNavigation();
      window.location.hash = `#/${space.defaultRoute}`;
    });
  });
}

export function initPrimaryNavigation() {
  const initialSpace = resolveBusinessSpace();
  renderWorkbenchNavigation(initialSpace);
  bindBusinessSwitch();

  const drawer = document.getElementById("mobile-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  const closeButton = drawer?.querySelector(".drawer-close");
  const workbenchMenu = document.getElementById("mobile-workbench-menu");
  const openDrawer = () => {
    drawer?.classList.add("open");
    backdrop?.classList.add("open");
  };
  const closeDrawer = () => {
    drawer?.classList.remove("open");
    backdrop?.classList.remove("open");
  };

  closeButton?.addEventListener("click", closeDrawer);
  backdrop?.addEventListener("click", closeDrawer);
  workbenchMenu?.addEventListener("click", openDrawer);
  drawer?.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeDrawer();
  });

  updateActiveRoute();
  renderContextNavigation();

  window.addEventListener("hashchange", () => {
    const routeSpace = getBusinessSpaceForRoute(getCurrentRoute());
    if (routeSpace) {
      setStoredBusinessSpace(routeSpace.id);
      renderWorkbenchNavigation(routeSpace.id);
    }
    updateActiveRoute();
    renderContextNavigation();
  });
}
