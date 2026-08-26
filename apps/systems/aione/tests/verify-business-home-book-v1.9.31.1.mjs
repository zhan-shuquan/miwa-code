import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const system = read("js/miwa-system.js");
const book = read("js/pages/miwa-business-home-book.js");
const css = read("css/pages/miwa-business-home.css");
const index = read("index.html");

assert.ok(system.includes("miwa-business-home-book.js"), "Business Home must use strategic book wrapper");
assert.ok(book.includes("publicationCover"), "cover page missing");
assert.ok(book.includes("miwa-business-core-grid"), "core business content missing");
assert.ok(book.includes("miwa-business-stage-grid"), "business stage content missing");
assert.ok(book.includes("miwa-business-capability-grid"), "shared capability spread missing");
assert.ok(book.includes('routeId !== "business-home"') && book.includes("initLegacyBusinessHome"), "non-overview business routes must keep legacy behavior");
assert.ok(css.includes("miwa-business-core-grid"), "Business Home book content CSS missing");
assert.ok(index.includes("miwa-publication-master.css?v=20260826-v1.9.31.3"), "print master must use V1.9.31.3 portrait publication CSS");
assert.ok(index.includes("v1.9.31.3-digital-book"), "digital book cache version must be updated");
assert.ok(book.includes("publicationChapterSummary"), "chapter summary page missing");
assert.ok(index.includes("v1.9.31.3-digital-book"), "cache version must be updated");

console.log("V1.9.31.1 compatibility check passed under V1.9.31.3 digital book master.");
