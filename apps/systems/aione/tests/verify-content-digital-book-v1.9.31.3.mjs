import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const tokens = read("css/foundation/tokens.css");
const masterCss = read("css/components/miwa-publication-master.css");
const masterJs = read("js/components/miwa-publication-master.js");
const businessBook = read("js/pages/miwa-business-home-book.js");
const businessCss = read("css/pages/miwa-business-home.css");
const asideJs = read("js/shell/aside.js");
const asideHtml = read("components/shell/aside/aside.html");
const index = read("index.html");
const system = read("js/miwa-system.js");

assert.ok(tokens.includes("--desktop-sidebar:232px"), "Sidebar platform width must remain 232px");
assert.ok(masterCss.includes("aspect-ratio:210/297"), "screen page must use A4 portrait ratio");
assert.ok(masterCss.includes("grid-template-columns:repeat(2,minmax(0,1fr))"), "desktop two-page spread missing");
assert.ok(masterCss.includes("@page{size:A4 portrait;margin:0}"), "print must use A4 portrait");
assert.ok(masterCss.includes("width:210mm!important") && masterCss.includes("height:297mm!important"), "print physical A4 size missing");
assert.ok(masterCss.includes("miwa-publication-spread::after"), "book seam visual missing");
assert.ok(masterCss.includes("#C83A32") && masterCss.includes("#176B4D"), "MIWA red/green discipline missing");
assert.ok(masterJs.includes("空间即书") && masterJs.includes("publicationChapterSummary"), "book/chapter/section/page model missing");
assert.ok(masterJs.includes("configurePublicationAside") && masterJs.includes("aione:publication:pdf"), "Aside publication actions missing");
assert.ok(masterJs.includes("validatePublicationPages") && masterJs.includes("pageOverflow"), "page overflow guard missing");
assert.ok(asideHtml.includes('id="aside-actions"'), "Aside action host missing");
assert.ok(asideJs.includes("normalizeActions") && asideJs.includes("CustomEvent(action.event)"), "Aside action renderer missing");
assert.ok(businessBook.includes("publicationSingle(cover)"), "cover must be a single page");
assert.ok(businessBook.includes("publicationSpread(overviewPage2(), overviewPage3()"), "P2/P3 spread missing");
assert.ok(businessBook.includes("publicationSpread(overviewPage4(), overviewPage5()"), "P4/P5 spread missing");
assert.ok(businessBook.includes("publicationSpread(overviewPage6(), overviewPage7()"), "P6/P7 spread missing");
assert.ok(businessBook.includes("publicationChapterSummary") && businessBook.includes("本章总结"), "odd chapter summary page missing");
assert.ok(businessBook.includes("data-business-icon-slot"), "business icon slot missing");
assert.ok(businessCss.includes("miwa-business-core-grid") && businessCss.includes("is-wide"), "odd 2+1 content layout missing");
assert.ok(businessCss.includes('data-business-action="print"'), "legacy Main print action should be hidden in publication mode");
assert.ok(index.includes("miwa-publication-master.css?v=20260826-v1.9.31.3"), "V1.9.31.3 master stylesheet cache key missing");
assert.ok(system.includes('document.getElementById("miwa-publication-mobile-tools")?.remove()'), "route cleanup for mobile publication actions missing");

console.log("V1.9.31.3 Digital Publication Book Master validation passed.");
