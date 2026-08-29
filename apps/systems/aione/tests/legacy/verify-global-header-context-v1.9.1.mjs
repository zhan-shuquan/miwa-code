import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const index = read("index.html");
const desktop = read("components/shell/header/desktop-header.html");
const mobileTop = read("components/shell/header/mobile-topbar.html");
const mobileInfo = read("components/shell/header/mobile-info.html");
const systemConfig = read("js/config/system-config.js");
const system = read("js/miwa-system.js");
const context = read("js/shell/platform-context.js");
const primaryNav = read("js/shell/primary-navigation.js");

// Global Shell keeps one active mounting point for each global region.
for (const id of ["desktop-header-host", "sidebar-host", "app-main-host", "aside-host", "desktop-footer-host"]) {
  must((index.match(new RegExp(`id="${id}"`, "g")) || []).length === 1, `${id}不是唯一挂载点`);
}
must((systemConfig.match(/desktop-header-host/g) || []).length === 1, "桌面Header组件配置不是单一来源");

// First-row semantic order: company -> business -> person -> work -> time.
const orderedStages = ["company", "business", "person", "work", "time"];
let previous = -1;
for (const stage of orderedStages) {
  const position = desktop.indexOf(`data-context-stage="${stage}"`);
  must(position >= 0, `Header缺少${stage}上下文节点`);
  must(position > previous, `Header上下文顺序错误：${stage}`);
  previous = position;
}
must(desktop.includes('data-platform-context-order="company business person work time execution"'), "Header未声明完整上下文链");

// Current business is a first-class Header context, not just a Sidebar switch.
must(desktop.includes('id="desktop-business-entry"') && desktop.includes('id="desktop-business-name"'), "桌面Header缺少当前事业入口");
must(mobileTop.includes('id="mobile-business-entry"') && mobileTop.includes('id="mobile-business-name"'), "移动Header缺少当前事业入口");
must(system.includes("initPlatformContext()"), "平台上下文未在系统启动时初始化");
must(context.includes('const EVENT_NAME = "aione:platform-context-change"'), "平台上下文事件契约缺失");
must(context.includes('Object.freeze({ id: "execution", label: "业务执行", owner: "sidebar" })'), "业务执行未明确归属Sidebar");
must(primaryNav.includes('from "./platform-context.js"'), "Sidebar尚未接入平台上下文单一来源");
must(!primaryNav.includes('const STORAGE_KEY = "aione.currentBusinessSpace"'), "Sidebar仍维护重复事业状态存储");

// Work and time are locked immediately after person; business execution stays out of Header.
must(desktop.includes('data-header-route="work" data-context-stage="work"'), "工作之家未登记为工作上下文");
must(desktop.includes('data-header-route="calendar" data-context-stage="time"'), "美和日历未登记为时间上下文");

// Approved shared homes only, in the locked order.
const sharedRoutes = ["category-home", "product-home", "ai-home", "analysis", "shared-home"];
previous = desktop.indexOf('data-context-stage="time"');
for (const route of sharedRoutes) {
  const position = desktop.indexOf(`data-header-route="${route}"`);
  must(position > previous, `共享入口顺序错误：${route}`);
  previous = position;
}
for (const removedRoute of ["customer-home", "talent-home", "income-home", "expense-home", "knowledge-home"]) {
  must(!desktop.includes(`data-header-route="${removedRoute}"`), `Header仍堆叠非核心入口：${removedRoute}`);
  must(!mobileInfo.includes(`data-header-route="${removedRoute}"`), `移动Header仍堆叠非核心入口：${removedRoute}`);
}

// Notification is a global tool; it must not interrupt the work-context chain.
must(desktop.indexOf('data-header-route="notifications"') > desktop.indexOf('data-header-route="shared-home"'), "通知仍打断第一行上下文链");
must(desktop.includes('class="miwa-tool-button miwa-tool-notification"'), "通知未归入全局工具区");

// Latest naming and lightweight Today Impression.
for (const headerText of [desktop, mobileInfo]) {
  must(headerText.includes("工作之家"), "缺少工作之家");
  must(headerText.includes("分析之家"), "缺少分析之家");
  must(!headerText.includes("今日工作"), "Header仍使用旧名称今日工作");
  must(!headerText.includes("分析中心"), "Header仍使用旧名称分析中心");
}
must(desktop.includes("今日印象"), "今日印象缺失");
must(!desktop.includes("miwaSolarTerm") && !desktop.includes("miwaZodiac"), "节气/星座仍占用桌面Header");

console.log("V1.9.1 Global Shell + Header Context validation passed.");
