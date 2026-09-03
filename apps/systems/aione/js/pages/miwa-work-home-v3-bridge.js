import { initMiwaWorkHomeV3 } from "./miwa-work-home-v3.js?v=20260903-work-home-v3";
import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260824-v1.9.5-sidebar-aside-lock-candidate";

const WORK_NAV = [
  ["工作之家","#/work","work"],
  ["我的工作","#/work-mine","work"],
  ["我的安排","#/work-assigned","calendar"],
  ["我的协同","#/work-collaboration","people"],
  ["我的互动","#/work-interactions","shared"],
  ["我的学习","#/work-learning","knowledge"],
  ["我的建议","#/work-suggestions","standard"],
  ["我的创新","#/work-innovations","innovation"],
  ["我的总结","#/work-summaries","evidence"],
  ["全部工作","#/work-all","database"]
];

const WORK_ASIDE_TITLES = Object.freeze({
  "work-assigned":"我的安排",
  "work-interactions":"我的互动"
});

function hashParts(){
  const raw=String(window.location.hash||"#/work-mine");
  const path=raw.replace(/^#\/?/,"").split("?")[0];
  const route=path.split("/")[0]||"work";
  return {route,raw};
}

function isV3Route(){
  const {route}=hashParts();
  return ["work-mine","work-interactions","work-learning"].includes(route);
}

function ensureBridgeStyles(){
  if(document.getElementById("aione-work-home-bridge-style"))return;
  const style=document.createElement("style");
  style.id="aione-work-home-bridge-style";
  style.textContent=`
    .sidebar-flat-link .aione-work-nav-icon{width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;color:#5f6368;flex:0 0 18px;margin-right:9px}
    .sidebar-flat-link .aione-work-nav-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .sidebar-flat-link[aria-current="page"] .aione-work-nav-icon{color:#176b4d}
    .aione-work-home-tools{display:flex;align-items:center;gap:6px;min-height:48px;padding:0 10px 0 12px;margin:0 0 12px;border-bottom:1px solid #e5e7eb;background:#fff}
    .aione-work-home-tools__item{height:34px;padding:0 11px;border:0;border-radius:8px;background:transparent;color:#3c4043;font:600 13px/1 system-ui,-apple-system,"Segoe UI",sans-serif;display:inline-flex;align-items:center;gap:7px;cursor:pointer}
    .aione-work-home-tools__item:hover{background:#f1f3f4}
    .aione-work-home-tools__item.is-active{background:#edf5f1;color:#176b4d}
    .aione-work-home-tools__icon{width:17px;height:17px;display:inline-flex;align-items:center;justify-content:center}
    .aione-work-home-tools__icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .aione-work-home-tools__spacer{flex:1}
    .aione-work-home-tools__ai{border:1px solid #dadce0;background:#fff;color:#176b4d}
    .aione-work-home-tools__ai:hover{background:#f8fbf9}
  `;
  document.head.append(style);
}

function normalizeWorkActionLabels(host){
  if(!host)return;
  host.querySelectorAll("button").forEach((button)=>{
    if(button.textContent.includes("发起设计"))button.textContent="＋ 新建设计";
    if(button.textContent.includes("发起测样"))button.textContent="＋ 新建测样";
    if(button.textContent.includes("发起采购"))button.textContent="＋ 新建采购";
    if(button.textContent.includes("发起上架"))button.textContent="＋ 新建上架";
    if(button.textContent.includes("发起运营"))button.textContent="＋ 新建运营";
    if(button.textContent.includes("发起客服"))button.textContent="＋ 新建客服";
    if(button.textContent.includes("发起其他工作"))button.textContent="＋ 新建其他工作";
  });
}

function ensureAIWorkView(host){
  if(!host||hashParts().route!=="work-mine")return;
  const typebar=host.querySelector("[data-wh3-types]");
  const content=host.querySelector("[data-wh3-content]");
  if(!typebar||!content)return;
  if(typebar.querySelector('[data-work-type="ai"]'))return;
  const ai=document.createElement("button");
  ai.type="button";
  ai.dataset.workType="ai";
  ai.textContent="AI工作";
  const other=typebar.querySelector('[data-work-type="other"]');
  if(other)typebar.insertBefore(ai,other); else typebar.append(ai);
  ai.addEventListener("click",()=>{
    typebar.querySelectorAll("button").forEach(b=>b.classList.toggle("is-active",b===ai));
    content.innerHTML=`<div class="wh3-toolbar"><button class="wh3-btn primary" data-ai-work-new>＋ 新建AI工作</button><input class="wh3-search" placeholder="搜索AI工作 / 自动化任务"><button class="wh3-btn">筛选</button><button class="wh3-btn">排序</button></div><div class="wh3-note"><b>AI工作</b><span>集中查看由AI、规则和自动化执行的工作。需要人工介入时，再进入对应人的工作或协同流程。</span></div><div class="wh3-empty"><strong>当前没有AI工作</strong>后续接入自动化任务、AI执行记录和异常接管工作。</div>`;
    content.querySelector("[data-ai-work-new]")?.addEventListener("click",()=>alert("新建AI工作入口已保留，后续按实际自动化场景逐项接入。"));
  });
}

function enhanceWorkMine(){
  const host=document.getElementById("miwa-work-home-entry");
  if(!host)return;
  normalizeWorkActionLabels(host);
  ensureAIWorkView(host);
}

function openExistingMiwaAI(){
  const candidates=[...document.querySelectorAll("button,a")];
  const target=candidates.find(el=>/美和AI/.test(el.textContent||"")&&!el.closest(".aione-work-home-tools"));
  if(target){target.click();return;}
  window.location.hash="#/ai-home";
}

function ensureWorkHomeTools(){
  const {route}=hashParts();
  const main=document.getElementById("app-main-host");
  if(!main)return;
  const existing=document.getElementById("aione-work-home-tools");
  if(route!=="work"){existing?.remove();return;}
  if(existing)return;
  const bar=document.createElement("nav");
  bar.id="aione-work-home-tools";
  bar.className="aione-work-home-tools";
  bar.setAttribute("aria-label","工作之家功能");
  bar.innerHTML=`
    <button class="aione-work-home-tools__item is-active" type="button" data-work-home-action="overview"><span class="aione-work-home-tools__icon" data-icon="work"></span><span>概览</span></button>
    <button class="aione-work-home-tools__item" type="button" data-work-home-action="manual"><span class="aione-work-home-tools__icon" data-icon="knowledge"></span><span>工作手册</span></button>
    <button class="aione-work-home-tools__item" type="button" data-work-home-action="homes"><span class="aione-work-home-tools__icon" data-icon="apps"></span><span>全部之家</span></button>
    <span class="aione-work-home-tools__spacer"></span>
    <button class="aione-work-home-tools__item aione-work-home-tools__ai" type="button" data-work-home-action="ai"><span class="aione-work-home-tools__icon" data-icon="ai"></span><span>工作之家AI秘书</span></button>`;
  main.prepend(bar);
  renderSemanticIcons(bar);
  bar.querySelector('[data-work-home-action="overview"]')?.addEventListener("click",()=>{window.location.hash="#/work";});
  bar.querySelector('[data-work-home-action="manual"]')?.addEventListener("click",()=>{window.location.hash="#/work?section=work-overview";});
  bar.querySelector('[data-work-home-action="homes"]')?.addEventListener("click",()=>{window.location.hash="#/business-home";});
  bar.querySelector('[data-work-home-action="ai"]')?.addEventListener("click",openExistingMiwaAI);
}

function normalizeAsideContext(){
  const {route}=hashParts();
  const expected=WORK_ASIDE_TITLES[route];
  if(!expected)return;
  const aside=document.getElementById("aside-host")||document.querySelector("aside");
  if(!aside)return;
  const candidates=[...aside.querySelectorAll("h1,h2,h3,h4,strong,b,div,span,p")];
  const wrongTitles=route==="work-assigned"?["我安排的","选品工作台"]:["选品工作台","我安排的"];
  for(const node of candidates){const text=node.textContent?.trim();if(wrongTitles.includes(text))node.textContent=expected;}
}

let mounting=false;
async function mountV3(){
  if(!isV3Route()||mounting)return false;
  const host=document.getElementById("miwa-work-home-entry");
  if(!host)return false;
  mounting=true;
  try{const result=await initMiwaWorkHomeV3();enhanceWorkMine();normalizeAsideContext();return result;}finally{mounting=false;}
}

function activeFor(href,current){return current.split("?")[0]===href;}
function syncExistingNav(host,current){
  const links=[...host.querySelectorAll(":scope > a.sidebar-flat-link")];
  if(links.length!==WORK_NAV.length)return false;
  const labels=links.map(link=>link.textContent.trim());
  if(labels.some((label,i)=>label!==WORK_NAV[i][0]))return false;
  links.forEach((link,i)=>{const href=WORK_NAV[i][1];if(activeFor(href,current))link.setAttribute("aria-current","page");else link.removeAttribute("aria-current");});
  renderSemanticIcons(host);
  return true;
}

function rewriteWorkSidebar(){
  const {route}=hashParts();
  if(!route.startsWith("work"))return;
  const host=document.getElementById("sidebar-navigation-tree");
  if(!host)return;
  const current=String(window.location.hash||"");
  if(syncExistingNav(host,current))return;
  const fragment=document.createDocumentFragment();
  WORK_NAV.forEach(([label,href,icon],index)=>{
    const link=document.createElement("a");
    link.className="sidebar-flat-link";
    if(index===9)link.classList.add("has-section-gap");
    link.href=href;
    link.dataset.navRoute=href.replace(/^#\//,"");
    const iconHost=document.createElement("span");iconHost.className="aione-work-nav-icon";iconHost.dataset.icon=icon;
    const text=document.createElement("span");text.textContent=label;
    link.append(iconHost,text);
    if(activeFor(href,current))link.setAttribute("aria-current","page");
    fragment.append(link);
  });
  host.replaceChildren(fragment);
  renderSemanticIcons(host);
}

let renderTimer=0;
function schedule(){
  window.clearTimeout(renderTimer);
  renderTimer=window.setTimeout(async()=>{
    ensureBridgeStyles();
    rewriteWorkSidebar();
    ensureWorkHomeTools();
    normalizeAsideContext();
    if(!isV3Route())return;
    for(let i=0;i<30;i+=1){if(document.getElementById("miwa-work-home-entry")){await mountV3();break;}await new Promise(r=>window.setTimeout(r,50));}
    window.setTimeout(normalizeAsideContext,120);
    window.setTimeout(normalizeAsideContext,420);
  },40);
}

window.addEventListener("hashchange",schedule);
window.addEventListener("aione:platform-context-change",()=>window.setTimeout(()=>{rewriteWorkSidebar();ensureWorkHomeTools();normalizeAsideContext();},20));
const sidebarObserver=new MutationObserver(()=>{const {route}=hashParts();if(route.startsWith("work"))window.setTimeout(rewriteWorkSidebar,0);});
const mainObserver=new MutationObserver(()=>{
  const {route}=hashParts();
  if(route==="work")window.setTimeout(ensureWorkHomeTools,0);
  if(!isV3Route()||mounting)return;
  const host=document.getElementById("miwa-work-home-entry");
  if(!host)return;
  if(!host.querySelector(".wh3"))window.setTimeout(()=>mountV3(),10);else window.setTimeout(enhanceWorkMine,0);
});
const asideObserver=new MutationObserver(()=>{const {route}=hashParts();if(route.startsWith("work"))window.setTimeout(normalizeAsideContext,0);});
window.addEventListener("DOMContentLoaded",()=>{
  const sidebar=document.getElementById("sidebar-host");if(sidebar)sidebarObserver.observe(sidebar,{childList:true,subtree:true});
  const main=document.getElementById("app-main-host");if(main)mainObserver.observe(main,{childList:true,subtree:true});
  const aside=document.getElementById("aside-host");if(aside)asideObserver.observe(aside,{childList:true,subtree:true});
  schedule();
});
if(document.readyState!=="loading")schedule();
