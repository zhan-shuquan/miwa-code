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
const baseDefinitions = read("js/config/business-page-definitions.js");
const fields = read("js/config/field-registry.js");
const help = read("js/data/help-center-articles.js");

const contextOrder = ["work", "calendar", "talent-home", "ai-home", "customer-home", "supplier-home", "category-home", "product-home", "store-home", "analysis", "knowledge-home"];
let previous = desktop.indexOf('data-context-stage="person"');
for (const route of contextOrder) {
  const position = desktop.indexOf(`data-header-route="${route}"`);
  must(position > previous, `H1 order error or missing: ${route}`);
  previous = position;
}

must(desktop.includes('class="miwa-context-actions"'), "Work and calendar are not fixed as context actions");
must(desktop.includes('id="desktop-core-home-rail"'), "H1 core home rail missing");
must(desktop.includes('id="desktop-core-home-prev"') && desktop.includes('id="desktop-core-home-next"'), "H1 rail controls missing");
must(desktop.includes('data-header-route="store-home"') && desktop.includes(">\u5e97\u94fa\u4e4b\u5bb6<"), "Store Home missing from H1");
must(mobile.includes('data-header-route="store-home"') && mobile.includes(">\u5e97\u94fa\u4e4b\u5bb6<"), "Store Home missing from mobile core homes");

for (const forbidden of ["\u5171\u4eab\u4e4b\u5bb6", "\u5e94\u7528\u4e4b\u5bb6", "\u5168\u90e8\u8d44\u6e90"]) {
  must(!desktop.includes(`>${forbidden}<`), `Header still exposes old label: ${forbidden}`);
  must(!mobile.includes(`>${forbidden}<`), `Mobile header still exposes old label: ${forbidden}`);
}
must(!desktop.includes('>\u5171\u4eab\u8d44\u6e90<'), "Internal shared-resource name is exposed in desktop Header");
must(!mobile.includes('>\u5171\u4eab\u8d44\u6e90<'), "Internal shared-resource name is exposed in mobile Header");

must(desktop.includes('id="desktop-quick-access-rail"'), "H2 quick access viewport missing");
must(desktop.includes('id="desktop-quick-access-prev"') && desktop.includes('id="desktop-quick-access-next"'), "H2 rail controls missing");
must(desktop.includes('class="miwa-quick-more-entry"') && desktop.includes('href="#/shared-home"') && desktop.includes(">\u66f4\u591a<"), "H2 simple More entry missing");
must(mobile.includes('href="#/shared-home"') && mobile.includes(">\u66f4\u591a<"), "Mobile H2 simple More entry missing");

must(config.includes('sharedResources: {'), "Internal shared resource registry missing");
must(config.includes('quickGroupOrder: ["core", "stores", "logistics", "office", "procurement", "mail"]'), "Quick-entry automatic group order missing");
must(config.includes('headerHidden: true') && config.includes('headerHidden: false'), "headerHidden field missing");
must(header.includes('entry?.quickAccess === true && entry.headerHidden !== true && entry.hidden !== true'), "Header hide filter missing");
must(header.includes('divider.className = "miwa-common-entry-divider"'), "Automatic group divider missing");
must(header.includes('function bindHeaderRails()') && header.includes('track.scrollBy({ left: direction * amount, behavior: "smooth" })'), "Header rail behavior missing");
must(header.includes('hasDirectHeaderEntry ? currentRoute : (definition.parent || currentRoute)'), "Direct quick entry active-state priority missing");

must(desktop.includes('>\u91cd\u8981\u65e5\u7a0b<') && desktop.includes('>\u91cd\u8981\u901a\u77e5<'), "H4 important schedule/notice labels missing");
must(header.includes('type.textContent = "\u91cd\u8981\u901a\u77e5"'), "Runtime notice label not aligned with H4");

must(routes.includes('"store-home": route("store-home", "\u5e97\u94fa\u4e4b\u5bb6"') && !routes.includes('"store-home": route("store-home", "\u5e97\u94fa\u4e4b\u5bb6", "platform", { status: "active", page: "./pages/business-home/template.html", parent: "shared-home"'), "Store Home is still nested under shared-home");
must(routes.includes('"shared-home": route("shared-home", "\u5feb\u6377\u5165\u53e3"'), "Internal shared-home route is not presented as Quick Access");
must(baseDefinitions.includes('title: "\u5e97\u94fa\u4e4b\u5bb6"'), "Store Home page title not updated");
must(definitions.includes('title:"\u5feb\u6377\u5165\u53e3"'), "Quick Access page definition missing");
must(fields.includes('f("shared-home","headerHidden","Header\u9690\u85cf"'), "Header hide field schema missing");
must(help.includes('version: "V1.2"'), "Help Center navigation knowledge not upgraded to V1.2");
must(help.includes('\u5e97\u94fa\u4e4b\u5bb6') && help.includes('\u5feb\u6377\u5165\u53e3') && help.includes('\u5de6\u53f3\u6ed1\u52a8'), "Help knowledge missing V1.9.4 lock principles");

must(!desktop.includes('class="miwa-spirit-row"\uff1a'), "Malformed spirit-row markup detected");

console.log("V1.9.4 Smart Header lock candidate validation passed.");
