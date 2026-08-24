import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const desktop = read("components/shell/header/desktop-header.html");
const mobile = read("components/shell/header/mobile-info.html");
const config = read("js/config/system-config.js");
const header = read("js/shell/header.js");
const routes = read("js/config/route-registry.js");
const definitions = read("js/config/business-page-definitions-extra.js");
const fields = read("js/config/field-registry.js");
const help = read("js/data/help-center-articles.js");

const contextOrder = ["work", "calendar", "talent-home", "ai-home", "customer-home", "supplier-home", "category-home", "product-home", "analysis", "knowledge-home"];
let previous = desktop.indexOf('data-context-stage="person"');
for (const route of contextOrder) {
  const position = desktop.indexOf(`data-header-route="${route}"`);
  must(position > previous, `H1顺序错误或缺少：${route}`);
  previous = position;
}

for (const forbidden of ["共享之家", "店铺之家", "应用之家"]) {
  must(!desktop.includes(`>${forbidden}<`), `Header仍出现旧可见名称：${forbidden}`);
  must(!mobile.includes(`>${forbidden}<`), `Mobile Header仍出现旧可见名称：${forbidden}`);
}
must(!desktop.includes('data-header-route="shared-home"') || desktop.indexOf('data-header-route="shared-home"') > desktop.indexOf('miwa-common-entry-row'), "共享资源仍占H1一级导航");
must(desktop.includes('id="desktop-quick-resource-entries"'), "H2统一快捷资源容器缺失");
must(mobile.includes('id="mobile-quick-resource-entries"'), "Mobile H2统一快捷资源容器缺失");
must(desktop.includes("全部资源") && desktop.includes('href="#/shared-home"'), "H2缺少全部资源入口");
must(config.includes('quickGroupOrder: ["core", "stores", "logistics", "office", "procurement", "mail"]'), "快捷资源自动分组顺序缺失");
must(config.includes('headerHidden: true') && config.includes('headerHidden: false'), "headerHidden字段未进入资源配置");
must(config.includes('name: "ERP"') && config.includes('productForm: "应用"') && config.includes('origin: "内部"'), "ERP未按内部应用登记");
must(config.includes('name: "HR"') && config.includes('headerHidden: true'), "HR隐藏候选未登记");
must(header.includes('entry?.quickAccess === true && entry.headerHidden !== true && entry.hidden !== true'), "Header隐藏过滤逻辑缺失");
must(header.includes('divider.className = "miwa-common-entry-divider"'), "H2未自动插入分隔符");
must(routes.includes('"supplier-home": route("supplier-home", "供应商之家"'), "供应商之家路由缺失");
must(routes.includes('"shared-home": route("shared-home", "共享资源"'), "共享资源页面未完成更名");
must(definitions.includes('title:"供应商之家"'), "供应商之家页面定义缺失");
must(definitions.includes('title:"共享资源"'), "共享资源页面定义缺失");
must(fields.includes('"supplier-home": Object.freeze(['), "供应商字段Schema缺失");
must(fields.includes('f("shared-home","headerHidden","Header隐藏"'), "共享资源Header隐藏字段缺失");
must(help.includes('version: "V1.1"'), "帮助中心导航知识未升级V1.1");
must(help.includes('人才之家 → AI之家') && help.includes('客户之家 → 供应商之家'), "帮助知识未记录核心相邻关系");

console.log("V1.9.3 Header core homes + shared resources validation passed.");
