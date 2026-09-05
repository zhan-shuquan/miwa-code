import { PRODUCT_HOME_CENTERS } from "../config/home-registry.js?v=20260905-product-sidebar-closure";
import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260903-product-sidebar-current";

/* ========================================
   商品之家 Sidebar CURRENT｜2026-09-05

   Product Truth
   - Sidebar 第二层只负责“中心”导航。
   - 不承载 AI、回收站、章节、View 或对象级入口。
   - 美和AI使用Header全局入口。
   - 回收站使用AIONE全局统一回收站。
   - 商品之家当前按4组承载16个专业中心。
   - 资料中心作为商品之家资料入口保留在中心导航末尾，独立于4个业务分组。
======================================== */

const GROUPS = Object.freeze([
  { id:"product-management", label:"商品管理", centers:["product-center","design-center","publish-center"] },
  { id:"profit-analysis", label:"利润分析", centers:["cost-center","price-center","profit-center"] },
  { id:"base-data", label:"基础资料", centers:["category-center","brand-center","attribute-center","specification-center","coding-center"] },
  { id:"operations-management", label:"运营管理", centers:["sampling-center","procurement-center","inventory-center","operations-center","service-center"] }
]);

const HOME_TOOL_IDS = new Set(["asset-center"]);
const ACCORDION_KEY = "aione.product.sidebar.groups.v2";

function hashValue(){ return String(window.location.hash || "").replace(/^#\/?/, ""); }
function isProductRoute(){ const value=hashValue(); return value === "product-home" || value.startsWith("product-home?") || value === "category-home" || value.startsWith("category-home?"); }
function active(route){ return hashValue() === route; }
function icon(name){ return `<span class="sidebar-icon miwa-semantic-icon" data-icon="${name}"></span>`; }
function centerMap(){ return new Map(PRODUCT_HOME_CENTERS.map((center)=>[center.id,center])); }

function currentCenterId(){
  const raw=hashValue();
  if(raw === "category-home" || raw.startsWith("category-home?")) return "category-center";
  const query=raw.split("?")[1] || "";
  return new URLSearchParams(query).get("center") || null;
}

function clearProductSidebar(sidebar){
  if(!sidebar)return;
  delete sidebar.dataset.productSidebarContext;
}

function renderProductIdentity(sidebar){
  const contextHead=sidebar.querySelector(".sidebar-context-head");
  const title=sidebar.querySelector("#sidebar-context-title");
  const kicker=sidebar.querySelector("#sidebar-context-kicker");
  const contextIcon=sidebar.querySelector("#sidebar-context-icon");
  sidebar.dataset.productSidebarContext="true";
  if(contextHead) contextHead.hidden=false;
  if(title){title.textContent="商品之家";title.hidden=false;}
  if(kicker) kicker.hidden=true;
  if(contextIcon){contextIcon.hidden=false;contextIcon.dataset.icon="product";contextIcon.dataset.iconReady="false";}
}

function readAccordionState(){
  try{return JSON.parse(localStorage.getItem(ACCORDION_KEY)||"{}");}catch{return{};}
}
function writeAccordionState(state){localStorage.setItem(ACCORDION_KEY,JSON.stringify(state));}
function initialOpen(group){
  const state=readAccordionState();
  if(Object.prototype.hasOwnProperty.call(state,group.id)) return Boolean(state[group.id]);
  return group.centers.includes(currentCenterId());
}

function centerLink(center, extraClass=""){
  if(!center)return "";
  return `<a class="sidebar-flat-link product-sidebar-link ${extraClass}" href="#/${center.route}" ${active(center.route)?'aria-current="page"':""}>${icon(center.icon||"product")}<span>${center.label}</span></a>`;
}

function renderGroup(group,map){
  const open=initialOpen(group);
  const children=group.centers.map((id)=>centerLink(map.get(id))).join("");
  return `<section class="product-sidebar-group ${open?"is-open":""}" data-product-group="${group.id}">
    <button class="product-sidebar-group__toggle" type="button" aria-expanded="${open?"true":"false"}" data-product-group-toggle="${group.id}">
      <span>${group.label}</span><span class="product-sidebar-group__chevron">⌄</span>
    </button>
    <div class="product-sidebar-group__items">${children}</div>
  </section>`;
}

function syncProductHomePage(){
  const root=hashValue();
  document.documentElement.dataset.productHomeRoute=isProductRoute()?"true":"false";
  document.documentElement.dataset.productHomeOverview=root==="product-home"?"true":"false";
  if(root==="product-home"){
    const header=document.querySelector("#app-main-host .miwa-page-header, #app-main-host [data-page-header]");
    header?.querySelectorAll("button,a").forEach((node)=>{
      const label=(node.textContent||"").trim();
      if(label==="商品概览"||label==="+ 商品概览"||label==="＋ 商品概览"||label.includes("新建商品")) node.hidden=true;
    });
  }
}

function buildProductHomeTools(){
  const asset=PRODUCT_HOME_CENTERS.find((center)=>center.id==="asset-center");
  const bar=document.createElement("nav");
  bar.id="aione-product-home-tools";
  bar.className="aione-product-home-tools";
  bar.setAttribute("aria-label","商品之家功能");
  bar.innerHTML=`
    <a class="aione-product-home-tools__item ${active("product-home")?"is-active":""}" href="#/product-home">${icon("product")}<span>概览</span></a>
    ${asset?`<a class="aione-product-home-tools__item ${active(asset.route)?"is-active":""}" href="#/${asset.route}">${icon(asset.icon||"file")}<span>资料中心</span></a>`:""}`;
  renderSemanticIcons(bar);
  return bar;
}

function ensureProductHomeTools(){
  const main=document.getElementById("app-main-host");
  const existing=document.getElementById("aione-product-home-tools");
  if(!isProductRoute()){existing?.remove();return;}
  if(!main)return;
  const next=buildProductHomeTools();
  if(existing) existing.replaceWith(next); else main.prepend(next);
  syncProductHomePage();
}

function bindGroupToggles(host){
  host.querySelectorAll("[data-product-group-toggle]").forEach((button)=>{
    button.addEventListener("click",()=>{
      const id=button.dataset.productGroupToggle;
      const group=host.querySelector(`[data-product-group="${id}"]`);
      if(!group)return;
      const open=!group.classList.contains("is-open");
      group.classList.toggle("is-open",open);
      button.setAttribute("aria-expanded",String(open));
      const state=readAccordionState();state[id]=open;writeAccordionState(state);
    });
  });
}

function render(){
  const sidebar=document.querySelector(".desktop-sidebar");
  if(!sidebar)return;
  if(!isProductRoute()){
    clearProductSidebar(sidebar);
    document.getElementById("aione-product-home-tools")?.remove();
    return;
  }

  const host=document.getElementById("sidebar-navigation-tree");
  if(!host)return;

  renderProductIdentity(sidebar);
  const quick=document.getElementById("sidebar-quick-actions");
  if(quick)quick.hidden=true;
  const primary=document.getElementById("sidebar-primary-action");
  if(primary)primary.hidden=true;

  const map=centerMap();
  const groups=GROUPS.map((group)=>renderGroup(group,map)).join("");
  const asset=map.get("asset-center");
  const assetEntry=asset
    ? `<div class="product-sidebar-divider"></div>${centerLink(asset,"product-sidebar-asset")}`
    : "";

  /* Sidebar到中心为止：不再插入AI秘书或之家私有回收站。 */
  host.innerHTML=groups+assetEntry;

  bindGroupToggles(host);
  renderSemanticIcons(sidebar);
  ensureProductHomeTools();
}

let mainSyncQueued=false;
function scheduleMainSync(){
  if(mainSyncQueued)return;
  mainSyncQueued=true;
  requestAnimationFrame(()=>{
    mainSyncQueued=false;
    if(isProductRoute())ensureProductHomeTools();
  });
}

window.addEventListener("hashchange",()=>window.setTimeout(render,0));
window.addEventListener("aione:category-preview-rendered",render);
window.addEventListener("aione:platform-context-change",()=>window.setTimeout(render,0));
window.addEventListener("DOMContentLoaded",()=>{
  render();
  const main=document.getElementById("app-main-host");
  if(main)new MutationObserver(scheduleMainSync).observe(main,{childList:true,subtree:false});
});
if(document.readyState!=="loading"){
  render();
  const main=document.getElementById("app-main-host");
  if(main)new MutationObserver(scheduleMainSync).observe(main,{childList:true,subtree:false});
}
window.setTimeout(render,700);
