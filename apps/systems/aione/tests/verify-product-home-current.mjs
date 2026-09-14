import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const home=read("js/config/home-registry.js");
const sidebar=read("js/config/sidebar-registry.js");
const shell=read("js/shell/primary-navigation.js");
const page=read("js/pages/product-home-current.js");
const index=read("index.html");

const centers=["选品中心","商品中心","利润中心","设计中心","发布中心","分类中心","品牌中心","属性中心","规格中心","编码中心","测样中心","采购中心","库存中心","订单中心","运营中心","客服中心"];
centers.forEach(label=>assert.ok(home.includes(`"${label}"`),`missing center ${label}`));
assert.ok(home.indexOf('"选品中心"')<home.indexOf('"商品中心"'),"selection must be lifecycle entry");
assert.match(home,/\["概览", "选品一览", "选品方法"\]/);
assert.match(home,/\["概览", "商品一览", "SKU一览", "SKU生成器"\]/);
assert.match(home,/\["概览", "设计一览", "AI批量出图", "图片管理", "设计模板", "模板映射"\]/);
assert.match(home,/\["概览", "发布一览", "商品发布", "分类发布", "图片发布", "商品删除", "导入任务", "发布批次", "发布任务", "错误追踪", "发布模板", "发布映射"\]/);
assert.ok(sidebar.includes('rootId !== "product-home"'),"product root tabs must not enter sidebar");
assert.ok(shell.includes("resolveSidebarContext")&&shell.includes('sidebarArchitecture="home-registry-current-20260908"'),"sidebar renderer missing");
assert.ok(!index.includes("product-home-weekly-acceptance"),"engineering acceptance UI still loaded");
assert.ok(!page.includes("本周工程成果验收"),"engineering copy remains");
assert.ok(page.includes("aioneApi(`/api/v1/selections")&&page.includes("aioneApi(`/api/v1/design-center/workbench"),"real API client integration missing");
assert.ok(!/\bfetch\s*\(/.test(page),"Product Home must not bypass AIONE API Client");

const pageTypes=["overview","data-list","object-detail","form-editor","generator-wizard","master-data","tree","mapping","ledger","rule-management","batch-job-monitor","analysis-report","asset-management","electronic-publication","error-queue"];
pageTypes.forEach(type=>assert.ok(page.includes(type),`missing Page Type ${type}`));

const stage={innerHTML:"",querySelector(){return null;},querySelectorAll(){return[];}};
const host={innerHTML:"",firstElementChild:stage,querySelector(selector){return selector==="[data-stage]"?stage:null;},querySelectorAll(){return[];}};
globalThis.location={hash:"#/product-home",hostname:"preview.example"};
globalThis.window={location:globalThis.location,dispatchEvent(){return true;},AIONEPreviewIdentity:{},AIONEPreviewPermissionContext:{}};
globalThis.document={body:{dataset:{}},getElementById(id){return id==="app-main-host"?host:null;}};
globalThis.sessionStorage={getItem(){return null;}};
globalThis.CustomEvent=class{constructor(type,options){this.type=type;this.detail=options?.detail;}};
globalThis.fetch=async url=>({ok:true,status:200,async json(){return String(url).includes("/selections")?{items:[]}:{workbench:{product:{productCode:"MH0000002",name:"冬款男袜6双套装",lifecycleStatus:"draft",productData:{}},materials:{}}};},async text(){return"";}});

const { initProductHomeCurrent }=await import("../js/pages/product-home-current.js?smoke=20260908");
for(const route of [
  "#/product-home",
  "#/product-home?center=selection-center",
  "#/product-home?center=product-center",
  "#/product-home?center=product-center&product=MH0000002",
  "#/product-home?center=design-center",
  "#/product-home?center=publish-center",
  "#/product-home?center=profit-center",
  "#/product-home?center=category-center",
  "#/product-home?center=procurement-center",
  "#/product-home?center=inventory-center"
]){
  location.hash=route;stage.innerHTML="";await initProductHomeCurrent();assert.ok(host.innerHTML||stage.innerHTML,`blank initialization: ${route}`);
}

console.log("Product Home CURRENT contract, imports, routes and initialization smoke PASS.");
