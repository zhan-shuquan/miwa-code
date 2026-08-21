import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTE_REGISTRY, WORKBENCH_ROUTES } from "../js/config/route-registry.js";
import { BUSINESS_SPACES } from "../js/config/business-navigation.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const navigationFiles = [
  "components/shell/header/desktop-header.html",
  "components/shell/header/mobile-info.html",
  "components/shell/header/mobile-topbar.html",
  "components/shell/primary-navigation/sidebar.html",
  "components/shell/primary-navigation/mobile-drawer.html",
  "components/shell/primary-navigation/mobile-bottom.html"
];

const strategicHomePages = Object.freeze({
  "category-home": "pages/category-home/home.html",
  "product-home": "pages/product-home/home.html",
  "ai-home": "pages/ai-home/home.html",
  analysis: "pages/analysis-center/home.html",
  "shared-home": "pages/shared-home/home.html"
});

const strategicHomeMarkup = Object.values(strategicHomePages).map(read).join("\n");
const navigationMarkup = [...navigationFiles.map(read), strategicHomeMarkup].join("\n");
const linkedRoutes = [...navigationMarkup.matchAll(/href="#\/([^"/?]+)/g)].map((match) => match[1]);
const unknownRoutes = linkedRoutes.filter((route) => !ROUTE_REGISTRY[route]);
if (unknownRoutes.length) throw new Error(`未登记内部路由：${[...new Set(unknownRoutes)].join(", ")}`);

const sidebar = read("components/shell/primary-navigation/sidebar.html");
if (!sidebar.includes("当前事业")) throw new Error("左侧导航缺少当前事业区域");
for (const spaceId of ["crossborder", "wholesale"]) {
  if (!sidebar.includes(`data-business-space="${spaceId}"`)) throw new Error(`左侧导航缺少事业切换：${spaceId}`);
}

const primaryNavigation = read("js/shell/primary-navigation.js");
if (!primaryNavigation.includes("BUSINESS_SPACES") || !primaryNavigation.includes("renderWorkbenchNavigation") || !primaryNavigation.includes("replaceChildren")) {
  throw new Error("桌面与手机业务导航未由统一事业配置重建");
}

if (BUSINESS_SPACES.crossborder.workbenches.length !== 9) throw new Error("美和跨境一级工作台应为9个");
if (BUSINESS_SPACES.wholesale.workbenches.length !== 6) throw new Error("美和批发一级业务闭环应为6个");
for (const space of Object.values(BUSINESS_SPACES)) {
  for (const workbench of space.workbenches) {
    if (!ROUTE_REGISTRY[workbench.route]) throw new Error(`事业导航一级路由未登记：${workbench.route}`);
    for (const child of workbench.children) {
      const routeId = child.route.split("/")[0];
      if (routeId === workbench.route && child.route.includes("/")) continue;
      if (!ROUTE_REGISTRY[routeId]) throw new Error(`事业导航二级路由未登记：${child.route}`);
    }
  }
}

const forbiddenWorkbenchNumber = />0[1-8]\s+(选品|测样|采购|视觉设计|上架发布|运营推广|订单与库存|客服与售后)工作台/;
if (forbiddenWorkbenchNumber.test(navigationMarkup)) throw new Error("工作台前台名称仍含01–08编号");

const header = read("components/shell/header/desktop-header.html");
if (header.includes("miwa-platform-nav-row")) throw new Error("Header仍保留旧的平台级第三层");
if (!header.includes("miwa-primary-nav--global")) throw new Error("Header第一层尚未合并全局能力");
for (const label of ["今日工作", "美和日历", "分类之家", "商品之家", "AI之家", "分析中心", "共享之家"]) {
  if (!header.includes(`>${label}<`)) throw new Error(`Header缺少最新基线入口：${label}`);
}
if (!header.includes("miwa-spirit-row")) throw new Error("Header缺少已恢复的美和精神信息带");
if (!header.includes("miwa-daily-row")) throw new Error("Header缺少已恢复的今日信息/重要通知带");
for (const group of ["stores", "logistics", "office", "shopping", "mail"]) {
  if (!header.includes(`data-common-entry-group="${group}"`)) throw new Error(`Header第二层缺少分组：${group}`);
}
for (const group of ["stores", "tools"]) {
  if (!header.includes(`data-common-more="${group}"`)) throw new Error(`${group}分组缺少更多入口`);
}
for (const label of ["跨境店铺", "更多店铺"]) {
  if (!header.includes(label)) throw new Error(`Header第二层缺少：${label}`);
}

for (const page of [
  "pages/selection-workbench/home.html",
  "pages/selection-workbench/overview.html",
  "pages/selection-workbench/tasks.html",
  "pages/selection-workbench/record-preview.html",
  "pages/selection-workbench/record-detail/index.html",
  "pages/sampling-workbench/home.html"
]) {
  if (!fs.existsSync(path.join(root, page))) throw new Error(`选品/测样核心页面资产不存在：${page}`);
}
if (!BUSINESS_SPACES.crossborder.workbenches.some((item) => item.id === "selection" && item.label === "选品工作台")) throw new Error("选品工作台未保持独立一级工作台");
if (!BUSINESS_SPACES.crossborder.workbenches.some((item) => item.id === "sampling" && item.label === "测样工作台")) throw new Error("测样工作台未保持独立一级工作台");
if (!WORKBENCH_ROUTES.includes("selection") || !WORKBENCH_ROUTES.includes("sampling")) throw new Error("选品/测样未同时登记为独立一级工作台路由");

const mainEntry = read("js/miwa-system.js");
if (mainEntry.includes("Sidebar资源校验失败")) throw new Error("仍包含会阻断整页启动的旧校验");
if (!mainEntry.includes("initSelectionWorkbench")) throw new Error("选品工作台未接入");
if (!mainEntry.includes("initSamplingWorkbench")) throw new Error("测样工作台未接入");
if (!mainEntry.includes("initTodayWork")) throw new Error("今日工作未接入");
if (!mainEntry.includes("initMiwaCalendar")) throw new Error("美和日历未接入");
if (!mainEntry.includes("initStrategicHome")) throw new Error("五个一级之家页面未接入");
if (!mainEntry.includes("initStoreHome")) throw new Error("全部店铺总览页未接入");

for (const [routeId, page] of Object.entries(strategicHomePages)) {
  const definition = ROUTE_REGISTRY[routeId];
  if (!definition || definition.status !== "active" || definition.page !== `./${page}`) {
    throw new Error(`一级页面路由配置不正确：${routeId}`);
  }
  if (!fs.existsSync(path.join(root, page))) throw new Error(`一级页面不存在：${page}`);
}

const expectedChildCounts = Object.freeze({
  "category-home": 6,
  "product-home": 6,
  "ai-home": 6,
  analysis: 7,
  "shared-home": 14
});
for (const [parent, expectedCount] of Object.entries(expectedChildCounts)) {
  const children = Object.values(ROUTE_REGISTRY).filter((route) => route.parent === parent);
  if (children.length !== expectedCount) throw new Error(`${parent}的预留入口数量不正确：${children.length}`);
}

if (!strategicHomeMarkup.includes("data-home-focus-list") || !strategicHomeMarkup.includes("data-follow-toggle")) {
  throw new Error("一级页面缺少员工个人关注入口");
}

const previewAuth = read("js/auth/preview-auth.js");
if (previewAuth.includes("renderSessionBadge") || previewAuth.includes("aione-preview-session")) throw new Error("仍存在重复的浮动身份入口");
if (!previewAuth.includes("googlePicture") || !previewAuth.includes("authenticatedEmail")) throw new Error("Google头像或登录账号未接入用户卡片");

const desktopHeader = read("components/shell/header/desktop-header.html");
for (const detail of ["position", "responsibility", "project", "entity", "email"]) {
  if (!desktopHeader.includes(`data-user-detail="${detail}"`)) throw new Error(`桌面用户卡片缺少字段：${detail}`);
}

const mobileDrawer = read("components/shell/primary-navigation/mobile-drawer.html");
for (const spaceId of ["crossborder", "wholesale"]) {
  if (!mobileDrawer.includes(`data-business-space="${spaceId}"`)) throw new Error(`手机端缺少事业切换：${spaceId}`);
}

for (const page of ["pages/today-work/home.html", "pages/calendar/home.html", "pages/store-home/home.html"]) {
  if (!fs.existsSync(path.join(root, page))) throw new Error(`核心页面不存在：${page}`);
}

console.log(`AIONE全局外壳验证通过：${Object.keys(ROUTE_REGISTRY).length}个内部入口；跨境${BUSINESS_SPACES.crossborder.workbenches.length}个工作台；批发${BUSINESS_SPACES.wholesale.workbenches.length}个业务闭环。`);
