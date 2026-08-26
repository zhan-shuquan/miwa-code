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
const book = read("js/pages/miwa-business-home-book.js");
const businessCss = read("css/pages/miwa-business-home.css");
const system = read("js/miwa-system.js");
const index = read("index.html");

assert.ok(tokens.includes("--desktop-sidebar:232px"), "Sidebar must remain fixed at platform 232px token");
assert.ok(masterCss.includes("--miwa-publication-aside-light:260px") && masterCss.includes("--miwa-publication-aside-standard:292px"), "publication aside widths missing");
assert.ok(masterCss.includes('data-page-mode="publication"'), "publication shell mode missing");
assert.ok(masterCss.includes("aspect-ratio:297/210") && masterCss.includes("@page{size:A4 landscape;margin:0}"), "A4 landscape publication geometry missing");
assert.ok(masterCss.includes("overflow-y:auto!important") && masterCss.includes("touch-action:pan-y!important"), "mobile vertical scroll protection missing");
assert.ok(masterCss.includes("#C83A32") && masterCss.includes("#176B4D"), "MIWA green/red brand tokens missing");
assert.ok(masterJs.includes("publicationToolbar") && masterJs.includes("data-publication-pdf") && masterJs.includes("window.print"), "shared PDF/print action missing");
assert.ok(book.includes("miwa-publication-book") && book.includes("miwa-publication-page"), "Business Home must consume publication master");
assert.ok(book.includes("bindPublicationActions") && book.includes("setPublicationPageMode(true)"), "Business Home publication behavior missing");
assert.ok(system.includes('document.body.dataset.pageMode = "application"'), "route transition must reset publication mode");
assert.ok(index.includes("miwa-publication-master.css?v=20260826-v1.9.31.2"), "publication master stylesheet not loaded");
for (const forbidden of ["#3d6f8e","#c1923c","#b77c2a","#8b7356","#c8a24a","#a88743"]) {
  assert.ok(!businessCss.toLowerCase().includes(forbidden), `legacy non-MIWA publication accent remains: ${forbidden}`);
}

console.log("V1.9.31.2 Content Publication Master validation passed.");
