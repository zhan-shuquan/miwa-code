/* ========================================
   MIWA Primary Navigation｜Universal Sidebar
   上部 Navigation：树形/手风琴导航；下部 Quick Actions：0-3个高频启动动作。
======================================== */

import { BUSINESS_SPACES } from "../config/business-navigation.js";
import { getBusinessSpaceOptions, getCurrentBusinessSpaceId, setCurrentBusinessSpace, syncPlatformContextFromRoute } from "./platform-context.js";
import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260824-v1.9.5-sidebar-aside-lock-candidate";
import { resolveSidebarContext } from "../config/sidebar-registry.js";

function getCurrentRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  return hash.split(/[/?]/)[0] || "selection";
}

function getCurrentPath() {
  return window.location.hash.replace(/^#\/?/, "").split("?")[0] || "selection";
}

function isRouteCurrent(route, routeId, currentPath) {
  return route === currentPath || route === routeId;
}

function createIcon(iconName, className = "sidebar-icon") {
  const icon = document.createElement("span");
  icon.className = `${className} miwa-semantic-icon`;
  icon.dataset.icon = iconName || "apps";
  return icon;
}

function createChildLink(entry, routeId, currentPath) {
  const link = document.createElement("a");
  link.className = "sidebar-child-link";
  link.href = `#/${entry.route}`;
  link.textContent = entry.label;
  if (isRouteCurrent(entry.route, routeId, currentPath)) link.setAttribute("aria-current", "page");
  return link;
}

function setGroupExpanded(group, expanded) {
  const toggle = group.querySelector("[data-sidebar-tree-toggle]");
  const children = group.querySelector(".sidebar-tree-children");
  group.classList.toggle("is-expanded", expanded);
  if (toggle) toggle.setAttribute("aria-expanded", String(expanded));
  if (children) children.hidden = !expanded;
}

function createAccordionItem(entry, context, routeId, currentPath) {
  const group = document.createElement("div");
  group.className = "sidebar-tree-group";
  group.dataset.sidebarTreeGroup = entry.id;

  const row = document.createElement("div");
  row.className = "sidebar-tree-row";

  const hasChildren = Array.isArray(entry.children) && entry.children.length > 0;
  if (hasChildren) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "sidebar-tree-toggle";
    toggle.dataset.sidebarTreeToggle = entry.id;
    toggle.setAttribute("aria-label", `展开或收起${entry.label}`);
    toggle.append(createIcon("chevronDown", "sidebar-tree-toggle__icon"));
    row.append(toggle);
  } else {
    const spacer = document.createElement("span");
    spacer.className = "sidebar-tree-toggle-spacer";
    row.append(spacer);
  }

  const link = document.createElement("a");
  link.className = "sidebar-tree-link";
  link.href = `#/${entry.route}`;
  link.dataset.navRoute = entry.route;
  link.append(createIcon(entry.icon || "apps"), Object.assign(document.createElement("span"), { textContent: entry.label }));
  row.append(link);
  group.append(row);

  const childCurrent = hasChildren && entry.children.some((child) => isRouteCurrent(child.route, routeId, currentPath));
  const parentCurrent = isRouteCurrent(entry.route, routeId, currentPath);
  const currentGroup = context.activeWorkbenchId === entry.id || childCurrent || parentCurrent;
  group.classList.toggle("is-current-group", currentGroup);
  if (parentCurrent) link.setAttribute("aria-current", "page");

  if (hasChildren) {
    const children = document.createElement("div");
    children.className = "sidebar-tree-children";
    children.append(...entry.children.map((child) => createChildLink(child, routeId, currentPath)));
    group.append(children);
    setGroupExpanded(group, currentGroup);
  }

  return group;
}

function createFlatItem(entry, routeId, currentPath) {
  const link = document.createElement("a");
  link.className = "sidebar-flat-link";
  link.href = `#/${entry.route}`;
  link.dataset.navRoute = entry.route;
  const icon = entry.icon ? createIcon(entry.icon) : document.createElement("span");
  if (!entry.icon) icon.className = "sidebar-flat-link__indent";
  link.append(icon, Object.assign(document.createElement("span"), { textContent: entry.label }));
  if (isRouteCurrent(entry.route, routeId, currentPath)) link.setAttribute("aria-current", "page");
  return link;
}

function renderQuickActions(context) {
  const section = document.getElementById("sidebar-quick-actions");
  const host = document.getElementById("sidebar-quick-actions-list");
  if (!section || !host) return;
  const actions = (context.quickActions || []).slice(0, 4);
  section.hidden = actions.length === 0;
  host.replaceChildren();

  actions.forEach((action) => {
    const node = action.route ? document.createElement("a") : document.createElement("button");
    node.className = "sidebar-quick-action";
    if (action.route) node.href = action.route.startsWith("#/") ? action.route : `#/${action.route}`;
    else {
      node.type = "button";
      node.dataset.sidebarQuickAction = action.event || action.id;
    }
    node.append(createIcon(action.icon || "apps", "sidebar-quick-action__icon"), Object.assign(document.createElement("span"), { textContent: action.label }));
    host.append(node);
  });
}

function renderBusinessSwitcher(context, routeId) {
  const host = document.getElementById("sidebar-business-switcher");
  const select = document.getElementById("sidebar-business-select");
  const label = document.getElementById("sidebar-business-switcher-label");

  if (!host || !select) return;

  const isBusinessContext = context?.type === "business";
  const isBusinessHome =
    routeId === "business-home" ||
    String(routeId || "").startsWith("business-");

  const shouldShow = isBusinessContext || isBusinessHome;
  host.hidden = !shouldShow;

  if (!shouldShow) return;

  const currentId = getCurrentBusinessSpaceId();
  const options = getBusinessSpaceOptions();

  select.replaceChildren(
    ...options.map((space) => {
      const option = document.createElement("option");
      option.value = space.id;
      option.textContent = space.label;
      option.selected = space.id === currentId;
      return option;
    })
  );

  if (select?.parentElement) {
    select.parentElement.hidden = !isBusinessContext;
  }

  if (label) {
    label.textContent = "";
    label.hidden = true;
  }

  if (select) {
    select.classList.toggle("sidebar-business-context-select", isBusinessContext);
    select.setAttribute(
      "aria-label",
      isBusinessContext ? "切换当前事业" : "进入事业"
    );

    if (select.parentElement) {
      select.parentElement.classList.toggle(
        "sidebar-business-context-control",
        isBusinessContext
      );
    }
  }

  if (select.dataset.bound !== "true") {
    select.dataset.bound = "true";
    select.addEventListener("change", () => {
      if (!select.value) return;
      setCurrentBusinessSpace(select.value, {
        navigate: true,
        reason: "sidebar-business-switcher"
      });
    });
  }
}
function renderSidebar() {
  const routeId = getCurrentRoute();
  const currentPath = getCurrentPath();
  const context = resolveSidebarContext(routeId, currentPath, getCurrentBusinessSpaceId());
  renderBusinessSwitcher(context, routeId);
  const title = document.getElementById("sidebar-context-title");
  const kicker = document.getElementById("sidebar-context-kicker");
  const icon = document.getElementById("sidebar-context-icon");
  const host = document.getElementById("sidebar-navigation-tree");
  if (!host) return;

  const isBusinessSidebar = context.type === "business";

  if (title) {
    title.textContent = context.title;
    title.hidden = isBusinessSidebar;
  }

  if (kicker) kicker.textContent = context.kicker;

  if (icon) {
    icon.hidden = isBusinessSidebar;
    icon.dataset.icon = context.icon || "apps";
    icon.dataset.iconReady = "false";
  }

  const hasTreeItems = context.items.some((entry) => Array.isArray(entry.children) && entry.children.length > 0);
  const nodes = context.type === "business" || hasTreeItems
    ? context.items.map((entry) => createAccordionItem(entry, context, routeId, currentPath))
    : context.items.map((entry) => createFlatItem(entry, routeId, currentPath));
  host.replaceChildren(...nodes);
  renderQuickActions(context);
  renderSemanticIcons(document);
}

function bindDesktopAccordion() {
  document.querySelector("[data-universal-sidebar]")?.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-sidebar-tree-toggle]");
    if (toggle) {
      event.preventDefault();
      const group = toggle.closest(".sidebar-tree-group");
      const shell = group?.parentElement;
      if (!group || !shell) return;
      const nextExpanded = !group.classList.contains("is-expanded");
      shell.querySelectorAll(".sidebar-tree-group.is-expanded").forEach((other) => {
        if (other !== group) setGroupExpanded(other, false);
      });
      setGroupExpanded(group, nextExpanded);
      return;
    }

    const quick = event.target.closest("[data-sidebar-quick-action]");
    if (quick) {
      const action = quick.dataset.sidebarQuickAction || "";
      if (action.startsWith("aione:publication:")) {
        window.dispatchEvent(new CustomEvent(action));
        return;
      }
      const mainHost = document.getElementById("selection-main-host");
      mainHost?.dispatchEvent(new CustomEvent("aione:sidebar-quick-action", {
        bubbles: false,
        detail: { action, route: getCurrentRoute() }
      }));
    }
  });
}

function createMobileWorkbenchLink(workbench) {
  const link = document.createElement("a");
  link.href = `#/${workbench.route}`;
  link.dataset.navRoute = workbench.route;
  link.className = "drawer-link";
  link.append(createIcon(workbench.icon || "apps", "drawer-link__icon"), Object.assign(document.createElement("span"), { textContent: workbench.label }));
  return link;
}

function renderMobileBusinessSwitcher(spaceId = getCurrentBusinessSpaceId()) {
  const select = document.getElementById("mobile-drawer-business-select");
  if (!select) return;

  const options = getBusinessSpaceOptions();

  select.replaceChildren(
    ...options.map((space) => {
      const option = document.createElement("option");
      option.value = space.id;
      option.textContent = space.label;
      return option;
    })
  );

  select.value = spaceId;

  if (select.dataset.bound !== "true") {
    select.dataset.bound = "true";

    select.addEventListener("change", () => {
      const nextId = select.value;
      if (!nextId || nextId === getCurrentBusinessSpaceId()) return;

      setCurrentBusinessSpace(nextId, {
        navigate: true,
        reason: "mobile-drawer-business-switcher"
      });
    });
  }
}
function renderMobileBusinessNavigation(spaceId = getCurrentBusinessSpaceId()) {
  renderMobileBusinessSwitcher(spaceId);

  const currentSpace = getBusinessSpaceOptions().find((space) => space.id === spaceId);
  const mobileBusinessLabel = document.getElementById("mobile-workbench-menu-label");

  if (mobileBusinessLabel && currentSpace) {
    mobileBusinessLabel.textContent = `${currentSpace.shortLabel || currentSpace.label}业务`;
  }
  const space = BUSINESS_SPACES[spaceId] || BUSINESS_SPACES.crossborder;
  const host = document.getElementById("mobile-workbench-navigation-list");
  if (host) host.replaceChildren(...space.workbenches.map(createMobileWorkbenchLink));
  const title = document.getElementById("mobile-business-title");
  if (title) title.textContent = space.label;
  renderSemanticIcons(document);
}

function bindMobileDrawer() {
  const drawer = document.getElementById("mobile-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  const closeButton = drawer?.querySelector(".drawer-close");
  const workbenchMenu = document.getElementById("mobile-workbench-menu");
  const openDrawer = () => { drawer?.classList.add("open"); backdrop?.classList.add("open"); };
  const closeDrawer = () => { drawer?.classList.remove("open"); backdrop?.classList.remove("open"); };
  closeButton?.addEventListener("click", closeDrawer);
  backdrop?.addEventListener("click", closeDrawer);
  workbenchMenu?.addEventListener("click", openDrawer);
  drawer?.addEventListener("click", (event) => { if (event.target.closest("a")) closeDrawer(); });
}

export function initPrimaryNavigation() {
  renderSidebar();
  bindDesktopAccordion();
  renderMobileBusinessNavigation();
  bindMobileDrawer();

  window.addEventListener("aione:platform-context-change", (event) => {
    const spaceId = event?.detail?.businessSpaceId;
    if (spaceId && BUSINESS_SPACES[spaceId]) renderMobileBusinessNavigation(spaceId);
    renderSidebar();
  });

  window.addEventListener("hashchange", () => {
    syncPlatformContextFromRoute({ reason: "sidebar-route" });
    renderSidebar();
  });
}
