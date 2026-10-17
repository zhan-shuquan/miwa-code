import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root=path.resolve(import.meta.dirname,"..");
const paths=[
 "js/components/erp-data-grid.js",
 "js/pages/product-erp-secondary-lists.js",
 "js/pages/product-manual-entry.js",
 "js/pages/product-home-current.js",
 "js/config/home-registry.js",
 "js/config/sidebar-registry.js",
 "backend/src/routes/product-manual-entry.js"
];
for(const rel of paths){
 const filepath=path.join(root,rel);
 assert.ok(fs.existsSync(filepath),"missing "+rel);
 const check=spawnSync(process.execPath,["--check",filepath],{encoding:"utf8"});
 assert.equal(check.status,0,rel+" JavaScript syntax failure: "+check.stderr);
}
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const nav=read("js/config/sidebar-registry.js");
const entry=read("js/pages/product-manual-entry.js");
const secondary=read("js/pages/product-erp-secondary-lists.js");
const grid=read("js/components/erp-data-grid.js");
for(const name of ["商品列表","SKU列表","图片列表","上架链接"])assert.ok(nav.includes(name),"missing nav "+name);
for(const term of ["showProducts","showSkuList","renderErpGrid"])assert.ok(entry.includes(term),"missing list implementation "+term);
for(const term of ["showProductImages","showProductLinks","publication?.links","/image-index?limit=200"])assert.ok(secondary.includes(term),"missing safe list "+term);
assert.ok(entry.includes("productAttributes()"),"Product Attributes tab must be present");
assert.ok(entry.includes("independentSkuPricing"),"SKU independent pricing must preserve overrides");
assert.ok(entry.includes("estimatedProfit:Math.round"),"list profit must use the cost engine");
assert.ok(read("backend/src/routes/product-manual-entry.js").includes('router.get("/image-index"'),"image list index API missing");
assert.ok(read("backend/src/routes/product-manual-entry.js").includes('router.get("/store-catalog"'),"store catalog read-only API missing");
assert.ok(secondary.includes('api+"/store-catalog"'),"shop columns must use canonical store catalog");
for(const term of ["data-eg-sort","data-eg-resize","data-eg-columns","data-eg-pagesize","data-eg-fit"])assert.ok(grid.includes(term),"missing grid function "+term);
console.log("AIONE ERP V1 source/syntax contract OK (not runtime acceptance)");
