import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260903-product-sidebar-current";

/* 商品之家 CURRENT｜2026-09-03
 * 选品已回归工作之家，不再作为独立中心。
 * 商品之家保留完整专业中心，用于正式事实、规则、结果与深度管理。
 */
const ITEMS = Object.freeze([
  { label:"概览", icon:"product", route:"product-home" },
  { label:"商品中心", icon:"product", route:"product-home?center=product-center" },
  { label:"设计中心", icon:"file", route:"product-home?center=design-center" },
  { label:"发布中心", icon:"publishing", route:"product-home?center=publish-center" },
  { label:"成本中心", icon:"expense", route:"product-home?center=cost-center", gap:true },
  { label:"价格中心", icon:"income", route:"product-home?center=price-center" },
  { label:"利润中心", icon:"analysis", route:"product-home?center=profit-center" },
  { label:"分类中心", icon:"category", route:"category-home", gap:true },
  { label:"品牌中心", icon:"brand", route:"product-home?center=brand-center" },
  { label:"属性中心", icon:"settings", route:"product-home?center=attribute-center" },
  { label:"规格中心", icon:"apps", route:"product-home?center=specification-center" },
  { label:"编码中心", icon:"database", route:"product-home?center=coding-center" },
  { label:"测样中心", icon:"standard", route:"product-home?center=sampling-center", gap:true },
  { label:"采购中心", icon:"store", route:"product-home?center=procurement-center" },
  { label:"库存中心", icon:"database", route:"product-home?center=inventory-center" },
  { label:"运营中心", icon:"analysis", route:"product-home?center=operations-center" },
  { label:"客服中心", icon:"customer", route:"product-home?center=service-center" },
  { label:"资料中心", icon:"file", route:"product-home?center=asset-center", gap:true }
]);

function hashValue(){ return String(window.location.hash || "").replace(/^#\/?/, ""); }
function isProductRoute(){ const value=hashValue(); return value === "product-home" || value.startsWith("product-home?") || value === "category-home" || value.startsWith("category-home?"); }
function active(route){ return hashValue() === route; }
function icon(name){ return `<span class="sidebar-icon miwa-semantic-icon" data-icon="${name}"></span>`; }
function clearProductSidebar(sidebar){ if(!sidebar)return; delete sidebar.dataset.productSidebarContext; sidebar.querySelector("[data-product-sidebar-recent]")?.remove(); }
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
function render(){
  const sidebar=document.querySelector(".desktop-sidebar"); if(!sidebar)return;
  if(!isProductRoute()){clearProductSidebar(sidebar);return;}
  const host=document.getElementById("sidebar-navigation-tree"); if(!host)return;
  renderProductIdentity(sidebar);
  const quick=document.getElementById("sidebar-quick-actions"); if(quick)quick.hidden=true;
  const primary=document.getElementById("sidebar-primary-action"); if(primary)primary.hidden=true;
  host.innerHTML=ITEMS.map(item=>`<a class="sidebar-flat-link product-sidebar-link ${item.gap?"has-section-gap":""}" href="#/${item.route}" ${active(item.route)?'aria-current="page"':""}>${icon(item.icon)}<span>${item.label}</span></a>`).join("");
  sidebar.querySelector("[data-product-sidebar-recent]")?.remove();
  renderSemanticIcons(sidebar);
}
window.addEventListener("hashchange",()=>window.setTimeout(render,0));
window.addEventListener("aione:category-preview-rendered",render);
window.addEventListener("aione:platform-context-change",()=>window.setTimeout(render,0));
window.addEventListener("DOMContentLoaded",render);
window.setTimeout(render,700);
