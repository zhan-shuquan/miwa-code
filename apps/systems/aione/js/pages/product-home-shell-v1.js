import { PRODUCT_HOME_CENTERS } from "../config/home-registry.js?v=20260903-product-home-current";

function productRouteState(){
  const raw=String(window.location.hash||"");
  const active=raw.startsWith("#/product-home");
  const params=raw.includes("?")?new URLSearchParams(raw.slice(raw.indexOf("?")+1)):new URLSearchParams();
  return {active,center:params.get("center")||"home"};
}

function centerHref(center){
  if(center.route==="category-home") return "#/category-home";
  return `#/product-home?center=${encodeURIComponent(center.id)}`;
}

function centerState(center){
  if(center.id==="product-center"||center.id==="design-center"||center.id==="category-center"||center.id==="brand-center") return "active";
  if(center.id==="publish-center") return "validating";
  return center.status==="active"?"active":"planned";
}

function stateLabel(state){
  if(state==="active") return "可用";
  if(state==="validating") return "联调";
  return "建设中";
}

function renderSidebar(host,activeCenter){
  const groups=[
    ["商品工作",["product-center","design-center","publish-center"]],
    ["经营管理",["cost-center","price-center","profit-center"]],
    ["商品基础",["category-center","brand-center","attribute-center","specification-center","coding-center"]],
    ["供应与运营",["sampling-center","procurement-center","inventory-center","operations-center","service-center"]],
    ["资料",["asset-center"]]
  ];
  const map=new Map(PRODUCT_HOME_CENTERS.map((center)=>[center.id,center]));
  host.innerHTML=`<div class="ph-shell"><div class="ph-shell__head"><a href="#/product-home" class="ph-shell__home ${activeCenter==="home"?"is-active":""}"><span>商品之家</span><small>Product Home</small></a></div>${groups.map(([title,ids])=>`<section class="ph-shell__group"><h3>${title}</h3>${ids.map((id)=>{const center=map.get(id);if(!center)return "";const state=centerState(center);return `<a class="ph-shell__item ${activeCenter===id?"is-active":""}" href="${centerHref(center)}"><span>${center.label}</span><em data-state="${state}">${stateLabel(state)}</em></a>`;}).join("")}</section>`).join("")}</div>`;
  host.hidden=false;
  host.dataset.productHomeShell="true";
  document.documentElement.dataset.productHomeShell="true";
}

function clearSidebar(host){
  if(host?.dataset.productHomeShell!=="true") return;
  host.innerHTML="";
  host.hidden=true;
  delete host.dataset.productHomeShell;
  delete document.documentElement.dataset.productHomeShell;
}

export function syncProductHomeShell(){
  const host=document.getElementById("sidebar-host");
  if(!host)return;
  const state=productRouteState();
  if(!state.active){clearSidebar(host);return;}
  renderSidebar(host,state.center);
}

syncProductHomeShell();
window.addEventListener("hashchange",()=>window.requestAnimationFrame(syncProductHomeShell));
window.addEventListener("popstate",()=>window.requestAnimationFrame(syncProductHomeShell));
