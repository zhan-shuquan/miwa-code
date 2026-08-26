import { aioneApi } from "../services/aione-api-client.js";
import { getCollaborationData } from "../data/collaboration-store.js";

const STATUS_LABELS = Object.freeze({
  pending:"待处理", in_progress:"进行中", active:"进行中", blocked:"阻断", waiting:"待确认", completed:"已完成", done:"已完成"
});
const PRIORITY_LABELS = Object.freeze({ low:"低", normal:"普通", high:"重要", important:"重要", urgent:"紧急" });
const ROUTE_FILTER = Object.freeze({
  "work-mine": { relation:"mine" },
  "work-pending": { status:"pending" },
  "work-active": { status:"in_progress" },
  "work-waiting": { status:"waiting" },
  "work-completed": { status:"completed" }
});

function esc(value="") { return String(value ?? "").replace(/[&<>"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
function routeId(){ return String(window.location.hash || "#/work").replace(/^#\/?/,"").split(/[/?]/)[0] || "work"; }
function dateText(value){ if(!value)return "—"; const d=new Date(value); return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString("zh-CN",{month:"2-digit",day:"2-digit"}); }
function identity(){ return window.AIONEPreviewIdentity || {}; }
function statusLabel(value){ return STATUS_LABELS[String(value||"").toLowerCase()] || value || "待确认"; }
function priorityLabel(value){ return PRIORITY_LABELS[String(value||"").toLowerCase()] || value || "普通"; }
function sourceLabel(item){ if(item.sourceSystem === "aione-ai-secretary" || item.metadata?.aiProposalId) return "美和AI"; if(item.sourceSystem === "aione-web") return "AIONE"; return item.sourceSystem || "AIONE"; }
function ownerLabel(item){ const me=identity(); if(String(item.ownerPersonId||"")===String(me.subjectId||""))return me.displayName||"当前用户"; return item.ownerName||item.ownerPersonId||"待确认"; }
function sourceHref(item){ const value=item.metadata?.sourceHash || ""; return String(value).startsWith("#/") ? value : ""; }
function normalizeRemote(item, personId){
  const ownerId=String(item.ownerPersonId||""); const creatorId=String(item.createdByPersonId||"");
  return {
    ...item,
    relation: ownerId===String(personId)?"mine":creatorId===String(personId)?"created":"shared",
    status: String(item.status||"pending"),
    priority: String(item.priority||"normal"),
    sourceSystem: item.sourceSystem || "aione",
    metadata: item.metadata && typeof item.metadata === "object" ? item.metadata : {},
    createdAt:item.createdAt||"", updatedAt:item.updatedAt||item.createdAt||""
  };
}
function normalizeLocal(task, personId){
  return {
    id:task.id,title:task.title,description:task.description||"",status:task.status==="done"?"completed":task.status==="active"?"in_progress":"pending",
    priority:task.priority||"normal",ownerPersonId:task.assigneeId||personId,createdByPersonId:task.creatorId||personId,workbenchCode:task.workbench||"",relatedObjectId:task.businessObjectId||"",
    sourceSystem:task.source||"local-preview",createdAt:task.createdAt||"",updatedAt:task.completedAt||task.createdAt||"",dueAt:task.dueDate||"",metadata:{sourceHash:task.route||""},
    relation:String(task.assigneeId||personId)===String(personId)?"mine":String(task.creatorId||"")===String(personId)?"created":"shared"
  };
}
function metrics(items){ return {
  mine:items.filter(x=>x.relation==="mine" && x.status!=="completed").length,
  pending:items.filter(x=>x.status==="pending").length,
  active:items.filter(x=>["in_progress","active"].includes(x.status)).length,
  waiting:items.filter(x=>x.status==="waiting").length,
  completed:items.filter(x=>x.status==="completed").length,
  ai:items.filter(x=>sourceLabel(x)==="美和AI").length
}; }
function routeMatches(item){ const filter=ROUTE_FILTER[routeId()]; if(!filter)return true; if(filter.relation)return item.relation===filter.relation; if(filter.status==="in_progress")return ["in_progress","active"].includes(item.status); return item.status===filter.status; }
function searchMatches(item, query){ if(!query)return true; const blob=[item.title,item.description,item.workbenchCode,item.relatedObjectType,item.relatedObjectId,item.metadata?.sourcePage,sourceLabel(item)].join(" ").toLowerCase(); return blob.includes(query.toLowerCase()); }
function filterMatches(item, value){ if(!value || value==="all")return true; if(value==="mine")return item.relation==="mine"; if(value==="created")return item.relation==="created" || (item.relation==="mine" && String(item.createdByPersonId||"")===String(identity().subjectId||"")); if(value==="ai")return sourceLabel(item)==="美和AI"; return true; }
function itemHtml(item){
  const status=statusLabel(item.status), source=sourceLabel(item), href=sourceHref(item), context=item.metadata?.sourcePage || item.workbenchCode || item.relatedObjectId || "工作之家";
  const statusClass=item.status==="completed"?" is-done":item.status==="blocked"?" is-alert":"";
  const sourceNode=href?`<a class="miwa-work-source-link" href="${esc(href)}">${esc(context)}</a>`:esc(context);
  return `<article class="miwa-work-item" data-work-item-id="${esc(item.id)}">
    <div class="miwa-work-item__title"><strong>${esc(item.title||"未命名工作")}</strong><small>上下文：${sourceNode}${item.metadata?.aiProposalId?` ｜ Proposal ${esc(item.metadata.aiProposalId)}`:""}</small></div>
    <span class="miwa-work-pill">${esc(ownerLabel(item))}</span>
    <span class="miwa-work-pill${source==="美和AI"?" is-ai":""}">${esc(source)}</span>
    <span class="miwa-work-pill${statusClass}">${esc(status)}</span>
    <span class="miwa-work-pill">${esc(priorityLabel(item.priority))}</span>
    <span class="miwa-work-date">截止 ${esc(dateText(item.dueAt))}</span>
  </article>`;
}
function aside(items){
  const aiCount=items.filter(x=>sourceLabel(x)==="美和AI").length;
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"standard",kicker:"当前上下文",title:"工作之家",text:"统一承接已确认工作事项；美和AI Proposal只有在人类确认后才进入这里。",items:[{label:"当前可见",value:`${items.length}项`},{label:"美和AI创建",value:`${aiCount}项`},{label:"数据原则",value:"一份工作事实，多处调用"}]}}));
}
async function loadItems(){
  const personId=identity().subjectId||"";
  try{
    const result=await aioneApi("/api/v1/work-home?limit=200");
    return {items:(result.items||[]).map(x=>normalizeRemote(x,result.personId||personId)), mode:"database"};
  }catch(error){
    const local=getCollaborationData();
    return {items:(local.tasks||[]).map(x=>normalizeLocal(x,personId)), mode:"local", error};
  }
}
export async function initMiwaWorkHome(){
  const host=document.getElementById("miwa-work-home-entry"); if(!host)return false;
  host.innerHTML=`<section class="miwa-work-home">
    <header class="miwa-work-hero"><div class="miwa-work-hero__mark">工</div><div><div class="miwa-work-hero__eyebrow">MIWA GROUP WORK</div><h1>工作之家</h1><p>统一接收、查看和跟踪当前登录人的工作事项。业务工作台、美和AI、人工布置都进入同一工作事实；未确认的AI Proposal不会自动进入工作之家。</p></div></header>
    <div class="miwa-work-kpis" data-work-kpis></div>
    <div class="miwa-work-toolbar"><input class="miwa-work-search" data-work-search placeholder="搜索工作名称、来源、业务上下文…"><select class="miwa-work-filter" data-work-filter><option value="all">全部工作</option><option value="mine">我的工作</option><option value="created">我创建的</option><option value="ai">美和AI创建</option></select><button class="miwa-work-refresh" type="button" data-work-refresh>刷新</button></div>
    <section class="miwa-work-panel"><div class="miwa-work-panel__head"><div><h2 data-work-section-title>工作事项</h2><p>只显示当前用户有关系的正式工作事项；来源和上下文可追溯。</p></div><span class="miwa-work-count" data-work-count></span></div><div data-work-error></div><div class="miwa-work-list" data-work-list><div class="miwa-work-loading">正在读取工作事项…</div></div></section>
  </section>`;
  let allItems=[]; let mode="database";
  const list=host.querySelector("[data-work-list]"), kpis=host.querySelector("[data-work-kpis]"), count=host.querySelector("[data-work-count]"), search=host.querySelector("[data-work-search]"), filter=host.querySelector("[data-work-filter]"), errorHost=host.querySelector("[data-work-error]"), sectionTitle=host.querySelector("[data-work-section-title]");
  const titles={work:"全部工作", "work-mine":"我的工作", "work-pending":"待处理", "work-active":"进行中", "work-waiting":"待确认", "work-completed":"已完成"};
  if(sectionTitle)sectionTitle.textContent=titles[routeId()]||"工作事项";
  function render(){
    const m=metrics(allItems); kpis.innerHTML=[["我的工作",m.mine],["待处理",m.pending],["进行中",m.active],["待确认",m.waiting],["已完成",m.completed],["AI创建",m.ai]].map(([label,value])=>`<div class="miwa-work-kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("");
    const rows=allItems.filter(routeMatches).filter(x=>searchMatches(x,search.value.trim())).filter(x=>filterMatches(x,filter.value));
    count.textContent=`${rows.length} 项`;
    list.innerHTML=rows.length?rows.map(itemHtml).join(""):`<div class="miwa-work-empty">当前条件下暂无工作事项。</div>`;
    window.MIWAHeader?.configure?.({workCount:m.mine}); aside(allItems);
    errorHost.innerHTML=mode==="local"?`<div class="miwa-work-error">正式数据库暂时未连接，当前显示本地预览工作记录；生产环境应由AIONE Backend提供正式工作数据。</div>`:"";
  }
  async function refresh(){ list.innerHTML=`<div class="miwa-work-loading">正在读取工作事项…</div>`; const loaded=await loadItems(); allItems=loaded.items; mode=loaded.mode; render(); }
  search.addEventListener("input",render); filter.addEventListener("change",render); host.querySelector("[data-work-refresh]")?.addEventListener("click",refresh);
  await refresh(); return true;
}
