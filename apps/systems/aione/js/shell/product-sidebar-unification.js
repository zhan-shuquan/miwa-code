import { PRODUCT_HOME_CENTERS } from "../config/home-registry.js?v=20260903-product-home-current";
import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260903-product-sidebar-current";

/* 商品之家 Sidebar
 * 中心定义只读取 PRODUCT_HOME_CENTERS；本文件仅保留“之家级入口”和视觉分组。
 */
const GAP_IDS = new Set(["cost-center", "category-center", "sampling-center", "asset-center"]);

function hashValue(){ return String(window.location.hash || "").replace(/^#\/?/, ""); }
function isProductRoute(){ const value=hashValue(); return value === "product-home" || value.startsWith("product-home?") || value === "category-home" || value.startsWith("category-home?"); }
function active(route){ return hashValue() === route; }
function icon(name){ return `<span class="sidebar-icon miwa-semantic-icon" data-icon="${name}"></span>`; }
function centerItems(){
  return PRODUCT_HOME_CENTERS.map((center)=>({
    id:center.id,
    label:center.label,
    icon:center.icon || "product",
    route:center.route,
    gap:GAP_IDS.has(center.id)
  }));
}
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
function openExistingMiwaAI(){
  const candidates=[...document.querySelectorAll("button,a")];
  const target=candidates.find((el)=>/美和AI/.test(el.textContent||"")&&!el.closest("#sidebar-navigation-tree"));
  if(target){target.click();return;}
  window.location.hash="#/ai-home";
}
function render(){
  const sidebar=document.querySelector(".desktop-sidebar"); if(!sidebar)return;
  if(!isProductRoute()){clearProductSidebar(sidebar);return;}
  const host=document.getElementById("sidebar-navigation-tree"); if(!host)return;
  renderProductIdentity(sidebar);
  const quick=document.getElementById("sidebar-quick-actions"); if(quick)quick.hidden=true;
  const primary=document.getElementById("sidebar-primary-action"); if(primary)primary.hidden=true;

  const overview=`<a class="sidebar-flat-link product-sidebar-link" href="#/product-home" ${active("product-home")?'aria-current="page"':""}>${icon("product")}<span>概览</span></a>`;
  const ai=`<a class="sidebar-flat-link product-sidebar-link product-home-ai-secretary" href="#" data-product-ai-secretary>${icon("ai")}<span>AI秘书</span></a>`;
  const centers=centerItems().map((item)=>`<a class="sidebar-flat-link product-sidebar-link ${item.gap?"has-section-gap":""}" href="#/${item.route}" ${active(item.route)?'aria-current="page"':""}>${icon(item.icon)}<span>${item.label}</span></a>`).join("");

  host.innerHTML=overview+ai+centers;
  host.querySelector("[data-product-ai-secretary]")?.addEventListener("click",(event)=>{event.preventDefault();openExistingMiwaAI();});
  sidebar.querySelector("[data-product-sidebar-recent]")?.remove();
  renderSemanticIcons(sidebar);
}
window.addEventListener("hashchange",()=>window.setTimeout(render,0));
window.addEventListener("aione:category-preview-rendered",render);
window.addEventListener("aione:platform-context-change",()=>window.setTimeout(render,0));
window.addEventListener("DOMContentLoaded",render);
window.setTimeout(render,700);
