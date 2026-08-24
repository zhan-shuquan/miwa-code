import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const sidebar = read("components/shell/primary-navigation/sidebar.html");
const navJs = read("js/shell/primary-navigation.js");
const navCss = read("css/shell/primary-navigation.css");
const registry = read("js/config/sidebar-registry.js");
const businessNav = read("js/config/business-navigation.js");
const aside = read("components/shell/aside/aside.html");
const asideJs = read("js/shell/aside.js");
const asideCss = read("css/shell/aside.css");
const system = read("js/miwa-system.js");
const config = read("js/config/system-config.js");
const lockDoc = read("docs/AIONE_SIDEBAR_ASIDE_LOCK_V1.0.md");
const deprecatedDoc = read("docs/DEPRECATED_SIDEBAR_ASIDE_STANDARDS.md");

must(sidebar.includes('id="sidebar-navigation-tree"'), "Sidebar缺少统一Navigation Area");
must(sidebar.includes('id="sidebar-quick-actions"'), "Sidebar缺少Quick Actions Dock");
must(!sidebar.includes("sidebar-business-switch"), "Desktop Sidebar仍包含事业切换器");
must(!sidebar.includes("当前工作台"), "Sidebar仍保留旧下半区二级导航语义");
must(navJs.includes("resolveSidebarContext") && navJs.includes("data-sidebar-tree-toggle"), "Sidebar未接统一上下文/手风琴逻辑");
must(navJs.includes('mainHost?.dispatchEvent(new CustomEvent("aione:sidebar-quick-action"'), "Quick Actions未形成统一启动事件");
must(navCss.includes(".sidebar-tree-children") && navCss.includes(".sidebar-quick-actions"), "Sidebar统一视觉规则不完整");
for (const type of ['business: "当前事业"', 'content: "当前空间"', 'tools: "当前空间"', 'system: "当前系统"']) must(registry.includes(type), `Sidebar Registry缺少类型 ${type}`);
must(businessNav.includes('quickActions: Object.freeze(options.quickActions || [])'), "业务导航未支持Quick Actions配置");
must(businessNav.includes('id: "selection-create"') && businessNav.includes('id: "selection-import"'), "选品工作台未接首批Quick Actions验证");

must(aside.includes("data-contextual-aside"), "Aside未切换为Contextual Aside");
must(!aside.includes("AI秘书") && !aside.includes("ai-secretary") && !aside.includes("AI办公室"), "Aside仍残留AI常驻UI");
for (const state of ["hidden", "light", "standard"]) must(asideCss.includes(`data-aside-state="${state}"`), `Aside缺少${state}状态`);
must(asideJs.includes('aione:page-aside-context'), "Aside未接新上下文事件");
must(!asideJs.includes("aione:page-ai-context"), "Aside JS仍监听旧AI事件");

must(!system.includes("initAISecretaryClient"), "Global Shell仍通过Aside初始化AI秘书Client");
must(!system.includes("aione:page-ai-context"), "Global Shell仍发出旧AI Aside事件");
must(system.includes("aione:page-aside-context"), "Global Shell未初始化新Contextual Aside上下文");
must((config.includes('v1.9.5-sidebar-aside-lock-candidate') || config.includes('v1.9.6-miwa-ai-layer-candidate') || config.includes('v1.9.7-miwa-ai-render-hotfix') || config.includes('v1.9.8-miwa-ai-entry-bridge-hotfix') || config.includes('v1.9.9-miwa-ai-hard-entry-hotfix') || config.includes('v1.9.10-miwa-ai-self-healing-layer-hotfix') || config.includes('v1.9.11-miwa-ai-runtime-chain-verification') || config.includes('v1.9.13-model-provider-layer') || (config.includes('v1.9.16-ai-proposal-bridge') || (config.includes('v1.9.17-ai-context-router') || (config.includes('v1.9.18-1688-source-api-bridge') || (config.includes('v1.9.19-1688-oauth-bridge') || config.includes('v1.9.20-1688-permanent-token-direct')))))), "系统版本低于V1.9.5 Sidebar/Aside锁定基线");

must(lockDoc.includes("正式锁定") && lockDoc.includes("Quick Actions") && lockDoc.includes("AI正式从左右边栏独立"), "正式Sidebar/Aside锁定文档不完整");
must(deprecatedDoc.includes("一律废止") && deprecatedDoc.includes("当前唯一有效标准"), "旧规则废止索引不完整");

console.log("V1.9.5_SIDEBAR_ASIDE_LOCK_VALIDATION_OK");
