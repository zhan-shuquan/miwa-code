import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const routes = read("js/config/route-registry.js");
const sidebar = read("js/config/sidebar-registry.js");
const primary = read("js/shell/primary-navigation.js");
const system = read("js/miwa-system.js");
const recipes = read("js/templates/template-registry.js");
const content = read("js/data/miwa-company-content.js");
const page = read("js/pages/miwa-company-home.js");
const css = read("css/pages/miwa-company-home.css");
const index = read("index.html");

must(routes.includes('company: route("company", "美和之家"') && routes.includes('./pages/company-home/template.html'), "美和之家未切换到公司数字出版页");
for (const route of ["company-positioning","company-spirit","company-management-architecture","company-business-map","company-core-assets","company-website"]) {
  must(routes.includes(`"${route}": route(`), `缺少美和之家Route: ${route}`);
}
for (const label of ["集团介绍","理念与文化","经营与战略","事业与全球","组织与治理","品牌与价值","发展与动态","企业资料","外部连接"]) {
  must(content.includes(`"${label}"`), `美和之家目录缺失: ${label}`);
}
must(sidebar.includes('if (rootId === "company") return MIWA_COMPANY_NAVIGATION'), "Sidebar未对美和之家使用两级树形目录定义");
must(primary.includes("hasTreeItems") && primary.includes("createAccordionItem"), "内容型Sidebar未启用树形渲染");
must(recipes.includes('"corporate-publication"'), "企业数字出版Recipe缺失");
must(system.includes("initMiwaCompanyHome") && system.includes('routeId.startsWith("company-")'), "美和之家运行时路由未接入");
for (const text of ["美和集团","理念与文化","美和原创AI经营架构","事业版图","发展路线","发展历程"]) {
  must(page.includes(text), `美和概览缺少章节: ${text}`);
}
must(page.includes("miwa-company-logo-preview.png"), "白底公司Logo未接入美和之家");
must(page.includes('data-company-action="print"') && css.includes("@page") && css.includes("@media print"), "A4 PDF出版模式缺失");
must(page.includes("集团核心资料") && page.includes("生成PDF资料包（预留）"), "企业资料入口或PDF资料包预留缺失");
must(index.includes("miwa-company-home.css"), "美和之家页面样式未接入index");

console.log("V1.9.23 MIWA company home publication validation passed.");
