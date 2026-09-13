import { aioneApi } from "../services/aione-api-client.js";

const DEFAULTS = Object.freeze({
  modelScale:100, modelOffsetX:0, modelOffsetY:0,
  tagScale:100, tagOffsetX:0, tagOffsetY:0,
  productScale:100, productOffsetX:0, productOffsetY:0,
  primaryScale:100, primaryOffsetX:0, primaryOffsetY:0,
  secondaryOffsetX:0, secondaryOffsetY:0
});

let adjustments = { ...DEFAULTS };
let initialized = false;

function root(){ return document.querySelector("[data-design-center-root]"); }
function clamp(value,min,max){ return Math.min(max,Math.max(min,Number(value)||0)); }
function currentProductRef(){ return new URLSearchParams(location.search).get("product") || "MH0000002"; }

function normalize(value={}){
  return {
    modelScale:clamp(value.modelScale ?? 100,60,160), modelOffsetX:clamp(value.modelOffsetX ?? 0,-30,30), modelOffsetY:clamp(value.modelOffsetY ?? 0,-30,30),
    tagScale:clamp(value.tagScale ?? 100,60,150), tagOffsetX:clamp(value.tagOffsetX ?? 0,-30,30), tagOffsetY:clamp(value.tagOffsetY ?? 0,-30,30),
    productScale:clamp(value.productScale ?? 100,60,160), productOffsetX:clamp(value.productOffsetX ?? 0,-30,30), productOffsetY:clamp(value.productOffsetY ?? 0,-30,30),
    primaryScale:clamp(value.primaryScale ?? 100,60,160), primaryOffsetX:clamp(value.primaryOffsetX ?? 0,-30,30), primaryOffsetY:clamp(value.primaryOffsetY ?? 0,-30,30),
    secondaryOffsetX:clamp(value.secondaryOffsetX ?? 0,-30,30), secondaryOffsetY:clamp(value.secondaryOffsetY ?? 0,-30,30)
  };
}

function setTransform(selector, scale, x, y){
  const node=root()?.querySelector(selector);
  if(!node) return;
  node.style.transformOrigin="center center";
  node.style.transform=`translate(${x}%, ${y}%) scale(${scale/100})`;
}

function apply(){
  setTransform(".hero-preview__model",adjustments.modelScale,adjustments.modelOffsetX,adjustments.modelOffsetY);
  setTransform(".hero-preview__tag",adjustments.tagScale,adjustments.tagOffsetX,adjustments.tagOffsetY);
  setTransform(".hero-preview__product",adjustments.productScale,adjustments.productOffsetX,adjustments.productOffsetY);
  setTransform(".hero-preview__primary",adjustments.primaryScale,adjustments.primaryOffsetX,adjustments.primaryOffsetY);
  setTransform(".hero-preview__secondary",100,adjustments.secondaryOffsetX,adjustments.secondaryOffsetY);
}

function syncControls(){
  for(const [key,value] of Object.entries(adjustments)){
    const input=root()?.querySelector(`[data-layout-field="${key}"]`);
    const output=root()?.querySelector(`[data-layout-value="${key}"]`);
    if(input) input.value=String(value);
    if(output) output.textContent=String(value);
  }
  apply();
}

function readControls(){
  const next={};
  for(const key of Object.keys(DEFAULTS)){
    const input=root()?.querySelector(`[data-layout-field="${key}"]`);
    next[key]=input ? Number(input.value) : adjustments[key];
  }
  adjustments=normalize(next);
  return adjustments;
}

function showMessage(message,isError=false){
  const node=root()?.querySelector('[data-ui="message"]');
  if(!node) return;
  node.hidden=false;
  node.textContent=message;
  node.classList.toggle("is-error",Boolean(isError));
}

function installFetchInjection(){
  if(window.__AIONE_LAYOUT_FETCH_INJECTION__) return;
  window.__AIONE_LAYOUT_FETCH_INJECTION__=true;
  const previous=window.fetch.bind(window);
  window.fetch=async function(input,init={}){
    const url=typeof input==="string"?input:(input instanceof URL?input.toString():input?.url||"");
    const method=String(init?.method || input?.method || "GET").toUpperCase();
    if(method==="PATCH" && /\/api\/v1\/products\/[^/]+\/design\/hero-spec/.test(url) && init?.body){
      try{
        const body=JSON.parse(init.body);
        body.layoutAdjustments={...adjustments};
        init={...init,body:JSON.stringify(body)};
      }catch(_){ }
    }
    if(method==="POST" && /\/api\/v1\/products\/[^/]+\/design\/tasks/.test(url) && init?.body){
      try{
        const body=JSON.parse(init.body);
        body.instructionSnapshot=body.instructionSnapshot&&typeof body.instructionSnapshot==="object"?body.instructionSnapshot:{};
        body.instructionSnapshot.heroSpec=body.instructionSnapshot.heroSpec&&typeof body.instructionSnapshot.heroSpec==="object"?body.instructionSnapshot.heroSpec:{};
        body.instructionSnapshot.heroSpec.layoutAdjustments={...adjustments};
        init={...init,body:JSON.stringify(body)};
      }catch(_){ }
    }
    return previous(input,init);
  };
}

async function loadSaved(){
  try{
    const payload=await aioneApi(`/api/v1/design-center/workbench?product=${encodeURIComponent(currentProductRef())}`);
    adjustments=normalize(payload?.workbench?.heroSpec?.layout_adjustments || DEFAULTS);
  }catch(_){ adjustments={...DEFAULTS}; }
  syncControls();
}

async function saveAsMensSocksTemplate(){
  try{
    const payload=await aioneApi(`/api/v1/design-center/workbench?product=${encodeURIComponent(currentProductRef())}`);
    const wb=payload.workbench||{};
    const result=await aioneApi("/api/v1/design-center/layout-templates",{
      method:"POST",
      body:JSON.stringify({
        templateCode:"MENS-SOCKS-HERO-LAYOUT-V1",
        name:"男袜主图布局 V1",
        version:"1.0",
        pageType:"hero",
        categoryScope:wb.product?.categoryCode || "mens-socks",
        sourceHeroSpecId:wb.heroSpec?.id || null,
        layoutAdjustments:{...adjustments},
        metadata:{sourceProductCode:wb.product?.productCode || currentProductRef(),purpose:"reusable-category-hero-layout"}
      })
    });
    showMessage(`已保存为可复用模板：${result.template?.name || "男袜主图布局 V1"}。`);
  }catch(error){ showMessage(error.message || "保存布局模板失败。",true); }
}

function reset(){ adjustments={...DEFAULTS}; syncControls(); showMessage("主图微调已恢复默认值。保存主图设置后才会写入当前商品。 "); }

function bind(){
  const r=root(); if(!r) return;
  r.addEventListener("input",(event)=>{
    if(!event.target.matches("[data-layout-field]")) return;
    adjustments=normalize({...adjustments,[event.target.dataset.layoutField]:Number(event.target.value)});
    const output=r.querySelector(`[data-layout-value="${event.target.dataset.layoutField}"]`);
    if(output) output.textContent=String(adjustments[event.target.dataset.layoutField]);
    apply();
  });
  r.querySelector('[data-action="reset-layout-adjustments"]')?.addEventListener("click",reset);
  r.querySelector('[data-action="save-layout-template"]')?.addEventListener("click",saveAsMensSocksTemplate);
}

export async function initDesignCenterLayoutAdjustments(){
  if(initialized) return;
  initialized=true;
  installFetchInjection();
  bind();
  await loadSaved();
}
