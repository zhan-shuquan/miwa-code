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
 "backend/src/routes/product-manual-entry.js",
 "backend/src/services/product-manual-entry-service.js"
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
for(const term of ["showProductImages","showProductLinks","publication?.links","/image-index?limit=100&offset="])assert.ok(secondary.includes(term),"missing safe list "+term);
assert.ok(entry.includes("productAttributes()"),"Product Attributes tab must be present");
assert.ok(entry.includes("independentSkuPricing"),"SKU independent pricing must preserve overrides");
assert.ok(entry.includes("estimatedProfit:Math.round"),"list profit must use the cost engine");
assert.ok(read("backend/src/routes/product-manual-entry.js").includes('router.get("/image-index"'),"image list index API missing");
assert.ok(read("backend/src/routes/product-manual-entry.js").includes('router.get("/store-catalog"'),"store catalog read-only API missing");
assert.ok(secondary.includes('api+"/store-catalog"'),"shop columns must use canonical store catalog");
assert.ok(secondary.includes("await loadLinks()"),"shop-link server pagination required");
assert.ok(secondary.includes("await loadImages()"),"image server pagination required");
assert.ok(entry.includes('BASE+"/categories"'),"category tree must query complete database category directory");
assert.ok(entry.includes("hasMore=(response.items||[]).length>100"),"product server pagination required");
assert.ok(entry.includes("onRender:attachProductImages"),"product thumbnails must survive grid rerenders");
assert.ok(entry.includes('BASE+"/skus?q="'),"SKU list must query canonical SKU rows");
assert.ok(read("backend/src/routes/product-manual-entry.js").includes('router.get("/skus"'),"SKU endpoint must exist");
assert.ok(read("backend/src/services/product-manual-entry-service.js").includes('export async function listManualSkus'),"SKU query service missing");
assert.ok(read("backend/src/services/product-manual-entry-service.js").includes('s."+shape.skuDataCol+"::text ILIKE $2'),"SKU search must cover persisted specification values");
assert.ok(entry.includes('hasMore=result.hasMore===true'),"SKU pagination continuation required");

assert.ok(secondary.includes("hasMore=(response.items||[]).length>100"),"store link page continuation required");
assert.ok(read("backend/src/routes/product-manual-entry.js").includes("hasMore=batch.length>limit"),"image index must return authoritative page continuation");
assert.ok(read("backend/src/routes/product-manual-entry.js").includes('router.get("/categories"'),"category directory API missing");
assert.ok(read("backend/src/services/product-manual-entry-service.js").includes("category=\"\""),"product service category filter missing");
assert.ok(secondary.includes("onRender:attachImageHandlers"),"image handlers must survive pagination and sorting");
assert.ok(secondary.includes("onRender:attachLinkImages"),"listing image thumbs must survive pagination and sorting");
assert.ok(secondary.includes("r.groups.detail.length>19"),"detail image cap indicator missing");
for(const term of ["data-eg-sort","data-eg-resize","data-eg-columns","data-eg-pagesize","data-eg-fit","onRender?."])assert.ok(grid.includes(term),"missing grid function "+term);
console.log("AIONE ERP V1 source/syntax contract OK (not runtime acceptance)");
