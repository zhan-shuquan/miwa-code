import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MIWA_BUSINESS_NAVIGATION, MIWA_BUSINESSES, MIWA_BUSINESS_PAGES } from "../js/data/miwa-business-home-content.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

assert.equal(MIWA_BUSINESS_NAVIGATION[0].route, "business-home");
assert.ok(MIWA_BUSINESS_NAVIGATION.some((x) => x.id === "business-portfolio" && x.children.length >= 8), "集团事业必须是两级树形目录");
assert.equal(MIWA_BUSINESSES.length, 8);
assert.ok(MIWA_BUSINESSES.find((x) => x.id === "crossborder")?.spaceId === "crossborder");
assert.ok(MIWA_BUSINESSES.find((x) => x.id === "wholesale")?.spaceId === "wholesale");
const agency = MIWA_BUSINESSES.find((x) => x.id === "procurement-agency");
assert.ok(agency && agency.category === "restart" && !agency.systemReady, "采购代理应为既有基础待重新开发，不得冒充已开发系统");
assert.ok(agency.flow.includes("客户需求") && agency.flow.includes("到货与验货") && agency.flow.includes("售后与复购"), "采购代理必须保留真实业务闭环骨架");
assert.equal(MIWA_BUSINESS_PAGES["business-procurement-agency"].kind, "business-detail");

const routes = read("js/config/route-registry.js");
const sidebar = read("js/config/sidebar-registry.js");
const system = read("js/miwa-system.js");
const page = read("js/pages/miwa-business-home.js");
const css = read("css/pages/miwa-business-home.css");
const ai = read("js/ai/ai-secretary-client.js");
const aiRouter = read("js/ai/ai-context-router.js");
const quick = read("js/ai/ai-quick-intents.js");
const index = read("index.html");

for (const routeId of ["business-portfolio","business-crossborder","business-wholesale","business-procurement-agency","business-management","business-development","business-connections"]) {
  assert.ok(routes.includes(`"${routeId}"`), `route missing: ${routeId}`);
}
assert.ok(sidebar.includes("MIWA_BUSINESS_NAVIGATION") && sidebar.includes('rootId === "business-home"'), "事业之家Sidebar必须使用独立两级目录");
assert.ok(system.includes("initMiwaBusinessHome") && system.includes('routeId.startsWith("business-")'), "事业之家所有子路由必须走独立内容页模块");
assert.ok(page.includes("事业独立经营") && page.includes("集团能力共享") && page.includes("当前AIONE只负责介绍这项事业"), "事业之家核心边界缺失");
assert.ok(page.includes("data-business-enter") && page.includes("spaceId"), "已配置事业必须能进入真实业务空间");
assert.ok(css.includes("@media print"), "内容型页面必须保留出版能力");
assert.ok(ai.includes("buildBusinessHomeContext") && ai.includes("aione_miwa_business_home_content"), "美和AI必须读取事业之家正式上下文");
assert.ok(aiRouter.includes("MIWA_BUSINESS_BY_ROUTE") && aiRouter.includes("isBusinessHomeContext"), "事业之家AI上下文不得被上一次事业选择污染");
assert.ok(quick.includes("BUSINESS = Object.freeze") && quick.includes("总结当前事业") && quick.includes("查共享能力"), "事业之家需要专属AI快捷能力");
assert.ok(index.includes("v1.9.31.3-digital-book"), "浏览器缓存版本必须更新");

console.log("V1.9.31 Business Home validation passed.");
