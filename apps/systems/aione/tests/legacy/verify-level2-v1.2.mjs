import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTE_REGISTRY } from "../js/config/route-registry.js";
import { MIWA_NINE_ELEMENTS, getBusinessPageDefinition } from "../js/config/business-page-definitions.js";
import { getContentPageDefinition } from "../js/config/content-page-definitions.js";
import { systemConfig } from "../js/config/system-config.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
const assert = (cond, message) => { if (!cond) throw new Error(message); };

// 1. Global Shell remains single-source; Level-2 pages never carry a second global shell.
const level2PageFiles = [
  "pages/business-home/template.html",
  "pages/content-home/template.html",
  "pages/notifications/home.html",
  "pages/notifications/detail.html",
  "pages/today-work/home.html",
  "pages/calendar/home.html",
  "pages/analysis-center/home.html"
];
for (const file of level2PageFiles) {
  const markup = read(file);
  for (const forbidden of ['id="desktop-header-host"', 'id="sidebar-host"', 'id="desktop-footer-host"']) {
    assert(!markup.includes(forbidden), `${file} 重复实现Global Shell：${forbidden}`);
  }
}

// 2. Header information architecture.
const header = read("components/shell/header/desktop-header.html");
for (const label of ["今日工作","美和日历","分析中心","分类之家","商品之家","客户之家","人才之家","AI之家","收入之家","支出之家","知识之家","共享之家"]) {
  assert(header.includes(`>${label}<`), `Header缺少入口：${label}`);
}
assert(header.indexOf("AI之家") < header.indexOf("收入之家") && header.indexOf("收入之家") < header.indexOf("支出之家") && header.indexOf("支出之家") < header.indexOf("知识之家"), "Header集团级入口顺序异常");
assert((header.match(/miwa-nav-divider/g) || []).length >= 3, "Header未保持经营组分隔");
assert(header.includes("店铺之家") && header.includes("应用之家"), "Header第二层缺少店铺之家/应用之家");

// 3. Google Drive is both an application asset and a direct high-frequency entry.
const officeEntries = systemConfig.header?.commonEntries?.office?.items || [];
assert(officeEntries.some((item) => item.name === "Google Drive" && /drive\.google\.com/.test(item.url || "")), "Google Drive未加入Header办公应用直接入口");
const appDef = getBusinessPageDefinition("application-home");
assert(appDef?.seedObjects?.some((item) => item.name === "Google Drive" && item.type === "云盘/文件"), "Google Drive未进入应用之家统一管理对象");

// 4. One Level-2 business template, many configurations.
const businessRoutes = ["category-home","product-home","customer-home","talent-home","ai-home","shared-home","store-home","application-home","income-home","expense-home","cash-expense"];
for (const routeId of businessRoutes) {
  const route = ROUTE_REGISTRY[routeId];
  assert(route?.status === "active" && route.page === "./pages/business-home/template.html", `${routeId} 未使用唯一业务母版`);
  assert(getBusinessPageDefinition(routeId), `${routeId} 缺少业务配置`);
}
for (const legacy of ["pages/category-home/home.html","pages/product-home/home.html","pages/ai-home/home.html","pages/shared-home/home.html"]) {
  assert(!exists(legacy), `已废止独立页面仍存在：${legacy}`);
}

const businessTemplate = read("pages/business-home/template.html");
for (const token of ["miwa-level2-head","miwa-business-type-track","miwa-business-flow","miwa-business-metrics","miwa-object-toolbar","miwa-business-auxiliary","data-miwa-nine-elements"]) {
  assert(businessTemplate.includes(token), `业务母版缺少组件：${token}`);
}
assert(businessTemplate.includes('data-visible="3"'), "业务类型未使用前三重点横向轨道");
assert(businessTemplate.includes('data-visible="6"'), "核心指标未预设最多6项可见轨道");
const businessJs = read("js/pages/business-page-template.js");
for (const token of ["Math.min(3","Math.min(6","data-business-overview","data-business-create","createNotification","aione:page-ai-context"]) {
  assert(businessJs.includes(token), `业务母版行为缺少：${token}`);
}
assert(businessJs.includes('`${definition.objectName}类型`'), "类型标题没有按业务对象语义生成");
assert(businessJs.includes('Math.min(3,Math.max(1,types.length||1))'), "业务类型没有锁定前三重点+横向滑动");
assert(businessJs.includes('`${definition.objectName}管理流程`'), "管理流程标题没有按对象语义生成");

// 5. MIWA 9 Elements is the unique method component.
assert(MIWA_NINE_ELEMENTS.length === 9, "美和9要素数量不是9");
assert(MIWA_NINE_ELEMENTS.map((x) => x.label).join("|") === "目标|人|物|事|平台|时间|钱|信息|结果", "美和9要素顺序或命名错误");
const nineComponent = read("js/components/miwa-nine-elements.js");
const nineStylesCss = read("css/components/level2-components.css");
for (const token of [".miwa-nine-elements{", ".miwa-nine-elements__head{", ".miwa-nine-elements__grid{", ".miwa-nine-elements__grid button{"]) assert(nineStylesCss.includes(token), `美和9要素组件缺少统一样式：${token}`);
assert(nineComponent.includes("美和9要素") && nineComponent.includes("美和方法论"), "美和9要素组件命名错误");
assert(!nineComponent.includes("业务关键要素"), "仍使用旧的业务关键要素名称");

// 6. Talent home + PPC relation.
const talent = getBusinessPageDefinition("talent-home");
assert(talent?.title === "人才之家" && talent?.objectName === "人才", "人才之家定义不完整");
assert(talent?.flow?.steps?.length >= 5, "人才管理流程未预留真实管理骨架");
const knowledge = getContentPageDefinition("knowledge-home");
assert(knowledge?.seedObjects?.some((item) => item.title === "PPC｜人的关系框架"), "知识之家缺少客户/人才/PPC关系说明入口");

// 7. One Level-2 content template for Miwa Home + Knowledge Home.
for (const routeId of ["company","knowledge-home"]) {
  const route = ROUTE_REGISTRY[routeId];
  assert(route?.status === "active" && route.page === "./pages/content-home/template.html", `${routeId} 未使用唯一内容母版`);
  assert(getContentPageDefinition(routeId), `${routeId} 缺少内容配置`);
}
const contentTemplate = read("pages/content-home/template.html");
for (const token of ["miwa-level2-head","miwa-content-type-track","miwa-content-metrics","miwa-object-toolbar","miwa-content-related"]) {
  assert(contentTemplate.includes(token), `内容母版缺少：${token}`);
}
const knowledgeTypes = knowledge.types || [];
for (const type of ["方法论","标准","制度","SOP","业务知识","培训资料","案例/研究","系统/AI知识"]) {
  assert(knowledgeTypes.includes(type), `知识之家缺少知识类型：${type}`);
}
for (const forbiddenHome of ["标准之家","制度之家","SOP之家"]) {
  assert(!JSON.stringify(ROUTE_REGISTRY).includes(forbiddenHome), `之家泛滥：仍存在${forbiddenHome}`);
}
const contentJs = read("js/pages/content-page-template.js");
assert(contentJs.includes("本次升级锁定到二级页面，不展开三级页面"), "本次升级越界实现了三级内容页");

// 8. Shared Home manages objective shared assets/capabilities, not knowledge.
const shared = getBusinessPageDefinition("shared-home");
for (const name of ["文件资产","账号资产","美和图标与Logo素材","美和图片素材","美和视频素材","美和代码资产 / GitHub"]) {
  assert(shared?.seedObjects?.some((item) => item.name === name), `共享之家缺少共享资产：${name}`);
}
assert(shared?.auxiliary?.some((item) => /Google Drive/.test(item.title || "") && /drive\.google\.com/.test(item.url || "")), "共享之家缺少Google Drive资产入口");
assert(shared?.auxiliary?.some((item) => /GitHub/.test(item.title || "") && /github\.com/.test(item.url || "")), "共享之家缺少GitHub代码资产入口");

// 9. Notifications use the same Level-2 language and are ready for internal testing.
const notificationsRoute = ROUTE_REGISTRY.notifications;
assert(notificationsRoute?.status === "active" && notificationsRoute.page === "./pages/notifications/home.html", "通知中心路由未启用");
const notificationPage = read("pages/notifications/home.html");
for (const token of ["通知概览","＋ 新建通知","通知类型","通知管理流程","核心指标","通知记录","辅助机动区","data-miwa-nine-elements"]) {
  assert(notificationPage.includes(token), `通知中心缺少统一模块：${token}`);
}
const notificationStore = read("js/data/notification-store.js");
assert(notificationStore.includes("LEGACY_STORAGE_KEYS") && notificationStore.includes("miwa-aione:v1.1:notifications"), "通知数据未兼容V1.1本地记录");
const notificationJs = read("js/pages/notifications.js");
assert(!notificationJs.includes("bindHorizontalRails(root);syncNotificationHeader();"), "通知页面存在render→sync循环风险");
assert(notificationJs.includes("AI秘书｜通知辅助"), "通知中心缺少AI秘书职责");
assert(notificationJs.includes('notification-detail?id='), "通知列表未接入统一通知详情页");
const notificationDetail = read("pages/notifications/detail.html");
for (const token of ["miwa-level2-head","通知内容","通知信息","当前操作","data-miwa-nine-elements"]) assert(notificationDetail.includes(token), `通知详情页缺少统一模块：${token}`);
assert(ROUTE_REGISTRY["notification-detail"]?.status === "active", "通知详情路由未启用");
const systemJs = read("js/miwa-system.js");
assert(systemJs.includes("miwa:header:notice-detail") && systemJs.includes("#/notification-detail?id="), "Header重要通知没有接通通知详情路由");
const notificationDetailJs = read("js/pages/notification-detail.js");
assert(notificationDetailJs.includes("markNotificationRead") && notificationDetailJs.includes("我已知悉"), "通知详情缺少已读/确认闭环");

// 10. Special navigation pages inherit the common Level-2 header without forcing the business middle template.
for (const file of ["pages/today-work/home.html","pages/calendar/home.html","pages/analysis-center/home.html"]) {
  assert(read(file).includes("miwa-level2-head"), `${file} 未继承统一二级页面头部`);
}

// 11. Workbench language aligned without replacing the real workbench structure.
const selection = read("pages/selection-workbench/home.html");
assert(selection.includes("选品类型") && selection.includes("选品业务流程") && selection.includes("核心指标"), "选品工作台语义未对齐统一页面语言");
const sampling = read("pages/sampling-workbench/home.html");
assert(sampling.includes("测样业务流程") && sampling.includes("核心指标"), "测样工作台语义未对齐统一页面语言");

// 12. System parameters include the new global dictionaries and keep the important values configurable.
const settingsJs = read("js/shell/system-settings.js");
for (const key of ["talentTypes","categoryTypes","productTypes","aiCapabilityTypes","sharedResourceTypes","miwaContentTypes","knowledgeContentTypes","notificationTypes"]) {
  assert(settingsJs.includes(key), `系统参数缺少字典：${key}`);
}
const settingsHtml = read("components/shell/settings/global-settings.html");
assert(settingsHtml.includes('重点类型标准展示') && settingsHtml.includes('value="3" disabled'), "重点类型标准展示没有锁定为3项");

// 13. Reusable component foundation stays deliberately small.
const level2Css = read("css/components/level2-components.css");
for (const token of ["miwa-horizontal-rail","miwa-core-metric","miwa-object-toolbar","miwa-object-card","miwa-object-table","miwa-auxiliary-card","miwa-disclosure","miwa-nine-elements","miwa-nine-elements__grid","miwa-nine-elements__score"]) {
  assert(level2Css.includes(token), `二级组件基础缺少：${token}`);
}
const railJs = read("js/components/horizontal-rail.js");
assert(railJs.includes("bindHorizontalRails") && railJs.includes("scrollHorizontalRail"), "横向轨道没有统一JS实现");

console.log(`AIONE V1.2统一二级体系验证通过：${businessRoutes.length}个业务管理页面共用业务母版；2个内容入口共用内容母版；通知中心、人才之家、Google Drive、共享资产、美和9要素均已接入。`);
