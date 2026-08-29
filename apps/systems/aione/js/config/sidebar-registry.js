/* ========================================
   AIONE Universal Sidebar Registry｜统一左边栏上下文配置
   同一母版覆盖业务型、内容展示型、应用工具型、系统型场景。
======================================== */

import { ROUTE_REGISTRY } from "./route-registry.js";
import { BUSINESS_SPACES, getBusinessSpaceForRoute, getWorkbenchForRoute } from "./business-navigation.js";
import { MIWA_COMPANY_NAVIGATION } from "../data/miwa-company-content.js";
import { MIWA_BUSINESS_NAVIGATION, MIWA_BUSINESSES } from "../data/miwa-business-home-content.js";

const PLATFORM_CONTEXT_META = Object.freeze({
  company: { icon: "knowledge", type: "content" },
  work: { icon: "work", type: "content" },
  calendar: { icon: "calendar", type: "content" },
  "business-home": { icon: "apps", type: "content" },
  "channel-home": { icon: "store", type: "content" },
  "finance-home": { icon: "income", type: "content" },
  "relations-home": { icon: "customer", type: "content" },
  "product-home": { icon: "product", type: "content" },
  "talent-home": { icon: "talent", type: "content" },
  "ai-home": { icon: "ai", type: "content" },
  "ai-office": { icon: "ai", type: "content" },
  analysis: { icon: "analysis", type: "content" },
  "knowledge-home": { icon: "knowledge", type: "content" },
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
    .filter((route) => route.parent === parentId && route.nav !== false)
    .map((route) => ({ id: route.id, label: route.label, route: route.id, icon: "" }));
}

// V1.9.33 legacy validation token: MIWA_BUSINESSES.map
function buildWorkItems() {
  const preferredBusinessIds = ["crossborder", "wholesale", "study-abroad"];
  const businessChildren = preferredBusinessIds
    .map((id) => MIWA_BUSINESSES.find((item) => item.id === id))
    .filter(Boolean)
    .map((item) => ({ id:`work-business-${item.id}`, label:item.name, route:`work-business-${item.id}`, subtitle:`按${item.name}快速查看工作进展，进入当前事业经营现场。` }));
  businessChildren.push({ id:"work-business-more", label:"更多事业", route:"work-business-more", subtitle:"查看其他事业工作，仍然读取同一份Work Item。" });
  return [
    { id:"work-home", label:"工作概览", route:"work", icon:"work", subtitle:"理解工作之家为什么存在、怎样运行以及每个章节怎么使用。", children:[] },
    { id:"work-mine", label:"我的工作", route:"work-mine", icon:"work", subtitle:"连续管理当前用户过去未完、当前应办和未来安排的工作。", children:[] },
    { id:"work-assigned", label:"我安排的", route:"work-assigned", icon:"work", subtitle:"查看由当前用户安排给他人的工作；与负责人读取同一个Work Item。", children:[] },
    { id:"work-batch", label:"批量安排工作", route:"work-batch", icon:"file", subtitle:"导入极简工作种子，预览AI补全结果并批量批准派发。", children:[] },
    { id:"work-following", label:"我的关注", route:"work-following", icon:"notification", subtitle:"集中查看你主动关注的重要对象；当前先接入工作事项，后续对象复用同一关注能力。", children:[] },
    { id:"work-suggestions", label:"我的建议", route:"work-suggestions", icon:"file", subtitle:"记录和跟踪我提出的业务改善建议。", children:[] },
    { id:"work-innovations", label:"我的创新", route:"work-innovations", icon:"brand", subtitle:"记录和跟踪值得验证的新方法、新产品、新模式或新能力。", children:[] },
    { id:"work-summaries", label:"我的总结", route:"work-summaries", icon:"knowledge", subtitle:"查看本人主动形成并确认的有价值工作总结。", children:[] },
    { id:"work-all", label:"全部工作", route:"work-all", icon:"apps", subtitle:"查看当前可见的全部工作，快速搜索、筛选和处理。", children:[], sectionGapBefore:true },
    { id:"work-business-group", label:"事业工作", route:"work-business-crossborder", icon:"apps", subtitle:"按事业快速查看工作进展，进入当前最关心的经营现场。", children:businessChildren },
    { id:"work-team", label:"团队工作", route:"work-team", icon:"people", subtitle:"从团队和成员视角查看同一份Work Item，不建立第二套工作数据。", children:[] },
    { id:"work-records", label:"工作记录", route:"work-records", icon:"knowledge", subtitle:"回看所有闭环工作的真实事实；有总结的记录同时关联总结资料。", children:[], sectionGapBefore:true }
  ];
}

function buildPlatformItems(rootId) {
  const root = ROUTE_REGISTRY[rootId];
  if (!root) return [];
  if (rootId === "company") return MIWA_COMPANY_NAVIGATION;
  if (rootId === "business-home") return MIWA_BUSINESS_NAVIGATION;
  if (rootId === "work") return buildWorkItems();
  const children = childrenFor(rootId).map((item) => rootId === "finance-home" && item.id === "expense-home"
    ? { ...item, children: childrenFor(item.id) }
    : item);
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
      primaryAction: null,
      quickActions: workbench.quickActions || []
    };
  }

  const rootId = resolvePlatformRoot(routeId);
  const root = ROUTE_REGISTRY[rootId] || ROUTE_REGISTRY[routeId];
  const meta = PLATFORM_CONTEXT_META[rootId] || { icon: "apps", type: "content" };
  const publicationActions = (rootId === "company" || rootId === "business-home" || (rootId === "work" && routeId === "work"))
    ? [
        { id:"publication-print", label:"打印", icon:"file", event:"aione:publication:print" },
        { id:"publication-pdf", label:"导出PDF", icon:"file", event:"aione:publication:pdf" }
      ]
    : [];
  return {
    type: meta.type,
    kicker: TYPE_LABELS[meta.type] || "当前空间",
    title: root?.label || "当前空间",
    icon: meta.icon,
    items: buildPlatformItems(rootId),
    activeWorkbenchId: null,
    primaryAction: null,
    quickActions: publicationActions
  };
}
