import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTE_REGISTRY, WORKBENCH_ROUTES } from "../js/config/route-registry.js";
import { BUSINESS_SPACES } from "../js/config/business-navigation.js";
import { MIWA_NINE_ELEMENTS } from "../js/config/business-page-definitions.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const navigationFiles = [
  "components/shell/header/desktop-header.html",
  "components/shell/header/mobile-info.html",
  "components/shell/header/mobile-topbar.html",
  "components/shell/primary-navigation/sidebar.html",
  "components/shell/primary-navigation/mobile-drawer.html",
  "components/shell/primary-navigation/mobile-bottom.html"
];

const strategicHomePages = Object.freeze({
  analysis: "pages/analysis-center/home.html"
});

const strategicHomeMarkup = Object.values(strategicHomePages).map(read).join("\n");
const navigationMarkup = [...navigationFiles.map(read), strategicHomeMarkup].join("\n");
const linkedRoutes = [...navigationMarkup.matchAll(/href="#\/([^"/?]+)/g)].map((match) => match[1]);
const unknownRoutes = linkedRoutes.filter((route) => !ROUTE_REGISTRY[route]);
if (unknownRoutes.length) throw new Error(`未登记内部路由：${[...new Set(unknownRoutes)].join(", ")}`);

// Global Shell single-source guard: business pages may never ship a second Header/Sidebar/Footer.
const pageRoot = path.join(root, "pages");
const pageFiles = [];
const walkPages = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkPages(full);
    else if (entry.isFile() && entry.name.endsWith(".html")) pageFiles.push(full);
  }
};
walkPages(pageRoot);
for (const file of pageFiles) {
  const markup = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  for (const forbidden of [
    '<header class="desktop-header"',
    '<nav class="desktop-sidebar"',
    'id="desktop-header-host"',
    'id="sidebar-host"',
    'id="desktop-footer-host"'
  ]) {
    if (markup.includes(forbidden)) throw new Error(`业务页面重复实现Global Shell：${relative} -> ${forbidden}`);
  }
}

const recordDetail = read("pages/selection-workbench/record-detail/index.html");
if (!recordDetail.includes("Global Shell is owned exclusively by apps/systems/aione/index.html")) throw new Error("商品机会详情尚未声明为纯业务内容页");
if (!recordDetail.includes("window.location.replace(target.href)")) throw new Error("旧详情直链未强制回到唯一AIONE Shell");
if (recordDetail.includes("aione-shared-css-fallback")) throw new Error("商品机会详情仍携带重复的全局CSS快照");
const selectionWorkbenchEntry = read("js/pages/selection-workbench.js");
if (selectionWorkbenchEntry.includes("new URL('./pages/selection-workbench/record-detail/index.html'")) throw new Error("选品工作台仍绕过根Shell直开详情页");
if (!selectionWorkbenchEntry.includes("target.hash = `/selection/opportunity/")) throw new Error("选品工作台尚未统一到商品机会根路由");
if (!recordDetail.includes("navigateOuterWorkbench('sampling')")) throw new Error("测样执行尚未切换到根Shell的sampling上下文");

const liveSources = [
  ...navigationFiles,
  "js/config/system-config.js",
  "js/config/business-navigation.js",
  "js/config/route-registry.js",
  "js/pages/selection-workbench.js",
  "pages/selection-workbench/record-detail/index.html"
].map(read).join("\n");
for (const forbiddenTerm of ["今日信息", "今日日常", "商品中心", "AI中心", "AI创新中心", "管理驾驶舱", "视觉设计工作台", "上架发布工作台", "运营推广工作台", "订单与库存工作台", "客服与售后工作台"]) {
  if (liveSources.includes(forbiddenTerm)) throw new Error(`发现已废止名称：${forbiddenTerm}`);
}

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

// Header V1.1: global management homes are explicit; income/expense are one visual group.
const header = read("components/shell/header/desktop-header.html");
if (header.includes("miwa-platform-nav-row")) throw new Error("Header仍保留旧的平台级第三层");
if (!header.includes("miwa-primary-nav--global")) throw new Error("Header第一层尚未合并全局能力");
for (const label of ["今日工作", "美和日历", "分析中心", "分类之家", "商品之家", "客户之家", "人才之家", "AI之家", "收入之家", "支出之家", "知识之家", "共享之家"]) {
  if (!header.includes(`>${label}<`)) throw new Error(`Header缺少V1.1入口：${label}`);
}
for (const routeId of ["customer-home", "talent-home", "knowledge-home", "income-home", "expense-home", "store-home", "application-home"]) {
  if (!header.includes(`data-header-route="${routeId}"`)) throw new Error(`Header缺少管理入口：${routeId}`);
}
if (!header.includes("miwa-spirit-row")) throw new Error("Header缺少美和精神信息带");
if (!header.includes("miwa-daily-row")) throw new Error("Header缺少今日印象/重要通知带");
for (const group of ["stores", "logistics", "office", "shopping", "mail"]) {
  if (!header.includes(`data-common-entry-group="${group}"`)) throw new Error(`Header第二层缺少快捷分组：${group}`);
}
for (const obsolete of ["data-common-more=", "更多店铺", "更多工具", ">跨境店铺<"]) {
  if (header.includes(obsolete)) throw new Error(`Header仍包含已废止第二层结构：${obsolete}`);
}
if (!header.includes('href="#/store-home"') || !header.includes(">店铺之家<")) throw new Error("Header第二层缺少合并后的店铺之家入口");
if (!header.includes('href="#/application-home"') || !header.includes(">应用之家<")) throw new Error("Header第二层缺少应用之家入口");

for (const page of [
  "pages/selection-workbench/home.html",
  "pages/selection-workbench/overview.html",
  "pages/selection-workbench/tasks.html",
  "pages/selection-workbench/record-preview.html",
  "pages/selection-workbench/record-detail/index.html",
  "pages/sampling-workbench/home.html"
]) {
  if (!exists(page)) throw new Error(`选品/测样核心页面资产不存在：${page}`);
}
if (!BUSINESS_SPACES.crossborder.workbenches.some((item) => item.id === "selection" && item.label === "选品工作台")) throw new Error("选品工作台未保持独立一级工作台");
if (!BUSINESS_SPACES.crossborder.workbenches.some((item) => item.id === "sampling" && item.label === "测样工作台")) throw new Error("测样工作台未保持独立一级工作台");
if (!WORKBENCH_ROUTES.includes("selection") || !WORKBENCH_ROUTES.includes("sampling")) throw new Error("选品/测样未同时登记为独立一级工作台路由");

const mainEntry = read("js/miwa-system.js");
if (mainEntry.includes("Sidebar资源校验失败")) throw new Error("仍包含会阻断整页启动的旧校验");
for (const initializer of ["initSelectionWorkbench", "initSamplingWorkbench", "initTodayWork", "initMiwaCalendar", "initStrategicHome", "initBusinessPage", "initContentPage", "initNotifications"]) {
  if (!mainEntry.includes(initializer)) throw new Error(`主入口缺少初始化器：${initializer}`);
}
if (mainEntry.includes("initStoreHome")) throw new Error("店铺之家仍使用第二套旧页面初始化器");
for (const legacyStoreAsset of ["pages/store-home/home.html", "js/pages/store-home.js", "css/pages/store-home.css"]) {
  if (exists(legacyStoreAsset)) throw new Error(`店铺之家仍保留第二套独立实现：${legacyStoreAsset}`);
}

for (const [routeId, page] of Object.entries(strategicHomePages)) {
  const definition = ROUTE_REGISTRY[routeId];
  if (!definition || definition.status !== "active" || definition.page !== `./${page}`) throw new Error(`一级页面路由配置不正确：${routeId}`);
  if (!exists(page)) throw new Error(`一级页面不存在：${page}`);
}

const expectedChildCounts = Object.freeze({
  "category-home": 6,
  "product-home": 6,
  "ai-home": 6,
  analysis: 7,
  "shared-home": 10
});
for (const [parent, expectedCount] of Object.entries(expectedChildCounts)) {
  const children = Object.values(ROUTE_REGISTRY).filter((route) => route.parent === parent);
  if (children.length !== expectedCount) throw new Error(`${parent}的预留入口数量不正确：${children.length}`);
}
if (!strategicHomeMarkup.includes("data-home-focus-list") || !strategicHomeMarkup.includes("data-follow-toggle")) throw new Error("一级页面缺少员工个人关注入口");

// V1.1 second-level business template: one page template, one object toolbar, one MIWA 9 component.
const genericBusinessRoutes = ["category-home", "product-home", "customer-home", "talent-home", "ai-home", "shared-home", "store-home", "application-home", "income-home", "expense-home", "cash-expense"];
for (const routeId of genericBusinessRoutes) {
  const definition = ROUTE_REGISTRY[routeId];
  if (!definition || definition.status !== "active" || definition.page !== "./pages/business-home/template.html") {
    throw new Error(`二级业务页面没有复用统一母版：${routeId}`);
  }
}
const businessTemplate = read("pages/business-home/template.html");
for (const token of [
  "miwa-business-head", "miwa-business-type-track", "miwa-business-flow", "miwa-business-metrics",
  "miwa-object-search", "miwa-object-filter", "miwa-object-import", "miwa-object-export",
  'data-object-view="card"', 'data-object-view="list"', "miwa-business-auxiliary-section", "data-miwa-nine-elements"
]) {
  if (!businessTemplate.includes(token)) throw new Error(`二级业务母版缺少统一结构：${token}`);
}
if (MIWA_NINE_ELEMENTS.length !== 9 || MIWA_NINE_ELEMENTS.map((item) => item.label).join("|") !== "目标|人|物|事|平台|时间|钱|信息|结果") {
  throw new Error("美和9要素定义不正确");
}
const miwaNineComponent = read("js/components/miwa-nine-elements.js");
if (!miwaNineComponent.includes("美和9要素") || !miwaNineComponent.includes("美和方法论")) throw new Error("美和9要素共享组件未正确命名");
for (const workbench of ["pages/selection-workbench/home.html", "pages/sampling-workbench/home.html"]) {
  if (!read(workbench).includes("data-miwa-nine-elements")) throw new Error(`工作台没有引用统一美和9要素组件：${workbench}`);
}

const businessPageJs = read("js/pages/business-page-template.js");
for (const required of ["data-business-overview", "data-business-create", "aione:page-ai-context", "createNotification", "autoNotifyOnCreate"]) {
  if (!businessPageJs.includes(required)) throw new Error(`二级业务页面缺少统一行为：${required}`);
}
if (!/label\s*:\s*[\"']业务通知[\"']/.test(businessPageJs) || !/level\s*:\s*[\"']normal[\"']/.test(businessPageJs)) throw new Error("新建对象通知没有与重要通知分级");

const settingsMarkup = read("components/shell/settings/global-settings.html");
for (const key of ["foundation", "permission", "dictionary", "business", "money", "finance", "assets", "io", "notification", "ai", "audit"]) {
  if (!settingsMarkup.includes(`data-global-settings-tab="${key}"`)) throw new Error(`系统参数缺少参数域：${key}`);
}
for (const oldPricingField of [
  "common.cnyToJpyRate", "common.internationalFreightRate", "common.importMiscRate", "common.costSafetyBufferRate",
  "common.packageCostPerSaleSetJPY", "common.consumptionTaxRate", "shop.platformFeeRate", "shop.couponRate",
  "pricing.officialRetailHighMarkupRate", "pricing.normalDisposalLossRate", "pricing.maximumDisposalLossRate",
  "common.directShippingFirstWeightGram", "common.directShippingFirstWeightFeeCNY",
  "common.directShippingAdditionalWeightUnitGram", "common.directShippingAdditionalWeightFeeCNY"
]) {
  if (!settingsMarkup.includes(`data-global-param="${oldPricingField}"`)) throw new Error(`系统参数升级破坏既有字段：${oldPricingField}`);
}
const settingsJs = read("js/shell/system-settings.js");
if (!settingsJs.includes("miwa-aione:restored-preview:v0.4:pricing-profiles")) throw new Error("系统参数没有保留既有LocalStorage兼容键");
if (!settingsJs.includes("aione:global-pricing-updated") || !settingsJs.includes("aione:global-settings-updated")) throw new Error("系统参数没有同时广播兼容事件和新版事件");

const notificationPage = read("pages/notifications/home.html");
for (const token of ["通知中心", "通知类型", "通知管理流程", "核心指标", "通知记录", "辅助机动区", "data-miwa-nine-elements"]) {
  if (!notificationPage.includes(token)) throw new Error(`通知中心未对齐统一二级母版：${token}`);
}
const systemSettingsJs = read("js/shell/system-settings.js");
for (const label of ["重要通知", "会议通知", "业务通知", "系统通知"]) {
  if (!systemSettingsJs.includes(label)) throw new Error(`通知类型字典缺少：${label}`);
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
for (const page of ["pages/today-work/home.html", "pages/calendar/home.html", "pages/business-home/template.html", "pages/notifications/home.html"]) {
  if (!exists(page)) throw new Error(`核心页面不存在：${page}`);
}

console.log(`AIONE V1.1全局与二级母版验证通过：${Object.keys(ROUTE_REGISTRY).length}个内部入口；${genericBusinessRoutes.length}个业务页面共享同一母版；美和9要素9/9。`);
