import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTE_REGISTRY } from "../js/config/route-registry.js";
import { MIWA_NINE_ELEMENTS, getBusinessPageDefinition } from "../js/config/business-page-definitions.js";
import { systemConfig } from "../js/config/system-config.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const routes = ["customer-home", "store-home", "application-home", "income-home", "expense-home", "cash-expense"];
const templatePath = "./pages/business-home/template.html";
for (const routeId of routes) {
  const route = ROUTE_REGISTRY[routeId];
  if (!route || route.page !== templatePath || route.status !== "active") throw new Error(`${routeId} 未使用统一二级业务母版`);
  if (!getBusinessPageDefinition(routeId)) throw new Error(`${routeId} 缺少业务配置`);
}

const customer = getBusinessPageDefinition("customer-home");
const lockedCustomerFlow = ["发现客户", "建立客户资料", "客户分类", "建立联系", "形成商机", "商谈/报价", "成交/未成交", "交易履约", "持续维护", "复购/沉睡/流失"];
if (customer.flow.status !== "locked" || JSON.stringify(customer.flow.steps) !== JSON.stringify(lockedCustomerFlow)) {
  throw new Error("客户管理没有引用已锁定流程");
}

for (const routeId of ["store-home", "application-home", "expense-home", "income-home", "cash-expense"]) {
  const definition = getBusinessPageDefinition(routeId);
  if (!definition.flow?.status || definition.flow.status === "locked") throw new Error(`${routeId} 未验证流程被错误标记为正式锁定`);
}

if (MIWA_NINE_ELEMENTS.length !== 9) throw new Error("美和9要素数量不是9");
if (MIWA_NINE_ELEMENTS.find((item) => item.key === "money")?.label !== "钱") throw new Error("美和9要素缺少“钱”");

const template = read("pages/business-home/template.html");
for (const toolbar of ["miwa-object-search", "miwa-object-filter", "miwa-object-import", "miwa-object-export", 'data-object-view="card"', 'data-object-view="list"']) {
  if (!template.includes(toolbar)) throw new Error(`对象管理固定工具栏缺少：${toolbar}`);
}
if (!template.includes("miwa-business-auxiliary-section")) throw new Error("二级母版缺少辅助机动区");
if (!template.includes("data-miwa-nine-elements")) throw new Error("二级母版未引用统一美和9要素");

const templateJs = read("js/pages/business-page-template.js");
if (!templateJs.includes("Math.min(3")) throw new Error("业务类型未锁定前三重点/横向滑动标准");
if (!templateJs.includes("data-business-overview") || !templateJs.includes("data-business-create")) throw new Error("业务头部缺少概览/新建通用动作职责");
if (!templateJs.includes("aione:business-object-created") && !read("js/data/business-object-store.js").includes("aione:business-object-created")) throw new Error("新建业务对象没有标准事件");
if (!/label\s*:\s*[\"']业务通知[\"']/.test(templateJs)) throw new Error("新建业务对象未生成标准业务通知");
if (!templateJs.includes("aione:page-ai-context")) throw new Error("二级母版未接入页面级AI秘书");

const config = systemConfig.header.commonEntries;
if (config.stores.label !== "店铺之家") throw new Error("店铺管理入口名称不正确");
if (config.tools.label !== "应用之家") throw new Error("应用管理入口名称不正确");
if ("moreSections" in config.stores || "moreSections" in config.tools) throw new Error("旧moreSections结构仍存在");
if (!Array.isArray(config.stores.catalogSections) || !Array.isArray(config.tools.catalogSections)) throw new Error("店铺/应用完整目录未集中到catalogSections");

const header = read("components/shell/header/desktop-header.html");
if (!header.includes("店铺之家") || !header.includes("应用之家")) throw new Error("Header缺少店铺之家/应用之家");
for (const label of ["AI之家", "收入之家", "支出之家", "共享之家"]) {
  if (!header.includes(label)) throw new Error(`Header缺少集团级能力：${label}`);
}
if ((header.match(/miwa-nav-divider/g) || []).length < 3) throw new Error("Header未形成收入/支出经营组分隔");

const settings = read("components/shell/settings/global-settings.html");
if (!settings.includes("重点类型标准展示") || !settings.includes("value=\"3\" disabled")) throw new Error("重点类型没有锁定为3项标准展示");
for (const param of [
  "business.overviewActionEnabled", "business.createActionEnabled", "business.requireMiwaNineElements",
  "permissions.allowCreate", "permissions.allowImport", "permissions.allowExport",
  "finance.moneyFactRequired", "finance.autoAggregateExpense", "finance.autoAggregateIncome",
  "notifications.autoNotifyOnCreate", "ai.pageAssistantEnabled", "audit.changeReasonRequired"
]) {
  if (!settings.includes(`data-global-param="${param}"`)) throw new Error(`系统参数缺少关键控制项：${param}`);
}


const selectionHome = read("pages/selection-workbench/home.html");
for (const marker of ["data-create-opportunity", "data-selection-import", "data-selection-export", 'data-selection-view="card"', 'data-selection-view="list"', "data-miwa-nine-elements"]) {
  if (!selectionHome.includes(marker)) throw new Error(`选品工作台未对齐统一业务动作：${marker}`);
}

const samplingHome = read("pages/sampling-workbench/home.html");
for (const marker of ["＋ 新建测样任务", "data-sampling-import", "data-sampling-export", 'data-sampling-view="card"', 'data-sampling-view="list"', "data-miwa-nine-elements"]) {
  if (!samplingHome.includes(marker)) throw new Error(`测样工作台未对齐统一业务动作：${marker}`);
}
if (!/data-sampling-import[^>]*disabled/.test(samplingHome)) throw new Error("测样导入入口应保留但禁用，避免绕开选品→测样真实流程");

const notificationStore = read("js/data/notification-store.js");
if (!notificationStore.includes('item.level === "important"')) throw new Error("重要通知槽位没有与普通业务通知分离");

console.log(`AIONE V1.1业务母版专项验证通过：${routes.length}个业务页面共享母版；美和9要素9/9；对象工具栏、AI秘书、标准事件、参数中心均已接入。`);
