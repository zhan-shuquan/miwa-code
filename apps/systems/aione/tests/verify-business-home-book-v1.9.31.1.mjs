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
assert.ok(book.includes("miwa-business-book-cover"), "cover page missing");
assert.ok(book.includes("miwa-business-book-businesses--3"), "core business book spread missing");
assert.ok(book.includes("miwa-business-book-businesses--5"), "incubating business book spread missing");
assert.ok(book.includes("miwa-business-book-capabilities"), "shared capability spread missing");
assert.ok(book.includes('routeId !== "business-home"') && book.includes("initLegacyBusinessHome"), "non-overview business routes must keep legacy behavior");
assert.ok(css.includes("aspect-ratio:297/210"), "screen publication canvas must use A4 landscape ratio");
assert.ok(css.includes("@page{size:A4 landscape;margin:0}"), "print must use full A4 landscape page");
assert.ok(css.includes("print-color-adjust:exact"), "print colors must be preserved");
assert.ok(css.includes("miwa-business-book-footer"), "publication footer missing");
assert.ok(index.includes("v1.9.31-business-home-book-v1.9.31.1"), "cache version must be updated");

console.log("V1.9.31.1 Business Home strategic book validation passed.");
