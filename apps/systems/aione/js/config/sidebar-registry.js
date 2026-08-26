/* ========================================
   AIONE Universal Sidebar Registry｜统一左边栏上下文配置
   同一母版覆盖业务型、内容展示型、应用工具型、系统型场景。
======================================== */

import { ROUTE_REGISTRY } from "./route-registry.js";
import { BUSINESS_SPACES, getBusinessSpaceForRoute, getWorkbenchForRoute } from "./business-navigation.js";
import { MIWA_COMPANY_NAVIGATION } from "../data/miwa-company-content.js";

const PLATFORM_CONTEXT_META = Object.freeze({
  company: { icon: "knowledge", type: "content" },
  work: { icon: "work", type: "content" },
  calendar: { icon: "calendar", type: "content" },
  "category-home": { icon: "category", type: "content" },
  "business-home": { icon: "apps", type: "content" },
  "channel-home": { icon: "store", type: "content" },
  "finance-home": { icon: "income", type: "content" },
  "product-home": { icon: "product", type: "content" },
  "customer-home": { icon: "customer", type: "content" },
  "supplier-home": { icon: "supplier", type: "content" },
  "talent-home": { icon: "talent", type: "content" },
  "income-home": { icon: "income", type: "content" },
  "expense-home": { icon: "expense", type: "content" },
  "ai-home": { icon: "ai", type: "content" },
  "ai-office": { icon: "ai", type: "content" },
  analysis: { icon: "analysis", type: "content" },
  "knowledge-home": { icon: "knowledge", type: "content" },
  "store-home": { icon: "store", type: "content" },
  "shared-home": { icon: "apps", type: "tools" },
  "application-home": { icon: "apps", type: "tools" },
  notifications: { icon: "notification", type: "system" },
  settings: { icon: "settings", type: "system" },
  "platform-admin": { icon: "settings", type: "system" },
  "employee-profile": { icon: "people", type: "system" }
});

const TYPE_LABELS = Object.freeze({
  business: "当前事业",
  content: "当前空间",
  tools: "当前空间",
  system: "当前系统"
});

function getParentRoute(routeId) {
  return ROUTE_REGISTRY[routeId]?.parent || null;
}

function resolvePlatformRoot(routeId) {
  if (PLATFORM_CONTEXT_META[routeId]) return routeId;
  let cursor = routeId;
  const visited = new Set();
  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const parent = getParentRoute(cursor);
    if (!parent) break;
    if (PLATFORM_CONTEXT_META[parent]) return parent;
    cursor = parent;
  }
  return routeId;
}

function childrenFor(parentId) {
  return Object.values(ROUTE_REGISTRY)
    .filter((route) => route.parent === parentId)
    .map((route) => ({ id: route.id, label: route.label, route: route.id, icon: "" }));
}

function buildPlatformItems(rootId) {
  const root = ROUTE_REGISTRY[rootId];
  if (!root) return [];
  if (rootId === "company") return MIWA_COMPANY_NAVIGATION;
  const children = childrenFor(rootId);
  const homeLabel = children.length ? "概览" : root.label;
  return [
    { id: `${rootId}-home`, label: homeLabel, route: rootId, icon: PLATFORM_CONTEXT_META[rootId]?.icon || "apps", children: [] },
    ...children
  ];
}

export function resolveSidebarContext(routeId, currentPath, currentBusinessSpaceId = "crossborder") {
  const workbench = getWorkbenchForRoute(routeId);
  if (workbench) {
    const routeSpace = getBusinessSpaceForRoute(routeId);
    const space = routeSpace || BUSINESS_SPACES[currentBusinessSpaceId] || BUSINESS_SPACES.crossborder;
    return {
      type: "business",
      kicker: TYPE_LABELS.business,
      title: space.label,
      icon: "work",
      items: space.workbenches,
      activeWorkbenchId: workbench.id,
      quickActions: workbench.quickActions || []
    };
  }

  const rootId = resolvePlatformRoot(routeId);
  const root = ROUTE_REGISTRY[rootId] || ROUTE_REGISTRY[routeId];
  const meta = PLATFORM_CONTEXT_META[rootId] || { icon: "apps", type: "content" };
  return {
    type: meta.type,
    kicker: TYPE_LABELS[meta.type] || "当前空间",
    title: root?.label || "当前空间",
    icon: meta.icon,
    items: buildPlatformItems(rootId),
    activeWorkbenchId: null,
    quickActions: []
  };
}
