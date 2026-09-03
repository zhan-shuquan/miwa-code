import { initMiwaWorkHomeV3 } from "./miwa-work-home-v3.js?v=20260903-work-home-v3";

const WORK_NAV = [
  ["工作概览","#/work"],
  ["我的工作","#/work-mine"],
  ["我的安排","#/work-assigned"],
  ["我的互动","#/work?view=interactions"],
  ["我的学习","#/work?view=learning"],
  ["我的建议","#/work-suggestions"],
  ["我的创新","#/work-innovations"],
  ["我的总结","#/work-summaries"],
  ["全部工作","#/work-all"],
  ["工作记录","#/work-records"]
];

function hashParts(){
  const raw=String(window.location.hash||"#/work-mine");
  const path=raw.replace(/^#\/?/,"").split("?")[0];
  const route=path.split("/")[0]||"work";
  const query=raw.includes("?")?new URLSearchParams(raw.slice(raw.indexOf("?")+1)):new URLSearchParams();
  return {route,view:query.get("view")||"",raw};
}

function isV3Route(){
  const {route,view}=hashParts();
  return route==="work-mine"||(route==="work"&&["interactions","learning"].includes(view));
}

function normalizeV3RouteForModule(){
  const {route,view}=hashParts();
  if(route==="work-mine")return "work-mine";
  if(route==="work"&&view==="interactions")return "work-interactions";
  if(route==="work"&&view==="learning")return "work-learning";
  return route;
}

async function mountV3(){
  if(!isV3Route())return false;
  const host=document.getElementById("miwa-work-home-entry");
  if(!host)return false;
  const original=window.location.hash;
  const target=normalizeV3RouteForModule();
  if(target!=="work-mine")history.replaceState(history.state,"",`#/${target}`);
  try{return await initMiwaWorkHomeV3();}
  finally{if(target!=="work-mine")history.replaceState(history.state,"",original);}
}

function activeFor(href,route,view,current){
  if(href==="#/work?view=interactions")return route==="work"&&view==="interactions";
  if(href==="#/work?view=learning")return route==="work"&&view==="learning";
  return current.split("?")[0]===href;
}

function syncExistingNav(host,route,view,current){
  const links=[...host.querySelectorAll(":scope > a.sidebar-flat-link")];
  if(links.length!==WORK_NAV.length)return false;
  const labels=links.map(link=>link.textContent.trim());
  if(labels.some((label,i)=>label!==WORK_NAV[i][0]))return false;
  links.forEach((link,i)=>{
    const href=WORK_NAV[i][1];
    if(activeFor(href,route,view,current))link.setAttribute("aria-current","page");
    else link.removeAttribute("aria-current");
  });
  return true;
}

function rewriteWorkSidebar(){
  const {route,view}=hashParts();
  if(!route.startsWith("work"))return;
  const host=document.getElementById("sidebar-navigation-tree");
  if(!host)return;
  const current=String(window.location.hash||"");
  if(syncExistingNav(host,route,view,current))return;
  const fragment=document.createDocumentFragment();
  WORK_NAV.forEach(([label,href],index)=>{
    const link=document.createElement("a");
    link.className="sidebar-flat-link";
    if(index===8)link.classList.add("has-section-gap");
    link.href=href;
    link.dataset.navRoute=href.replace(/^#\//,"");
    const indent=document.createElement("span");indent.className="sidebar-flat-link__indent";
    const text=document.createElement("span");text.textContent=label;
    link.append(indent,text);
    if(activeFor(href,route,view,current))link.setAttribute("aria-current","page");
    fragment.append(link);
  });
  host.replaceChildren(fragment);
}

let renderTimer=0;
function schedule(){
  window.clearTimeout(renderTimer);
  renderTimer=window.setTimeout(async()=>{
    rewriteWorkSidebar();
    if(!isV3Route())return;
    for(let i=0;i<20;i+=1){
      if(document.getElementById("miwa-work-home-entry")){await mountV3();break;}
      await new Promise(r=>window.setTimeout(r,60));
    }
  },80);
}

window.addEventListener("hashchange",schedule);
window.addEventListener("aione:platform-context-change",()=>window.setTimeout(rewriteWorkSidebar,20));
const observer=new MutationObserver(()=>{
  const {route}=hashParts();
  if(route.startsWith("work"))window.setTimeout(rewriteWorkSidebar,0);
});
window.addEventListener("DOMContentLoaded",()=>{
  const sidebar=document.getElementById("sidebar-host");
  if(sidebar)observer.observe(sidebar,{childList:true,subtree:true});
  schedule();
});
if(document.readyState!=="loading")schedule();
