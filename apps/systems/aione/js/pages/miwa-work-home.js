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
function dateText(value){ if(!value)return "—"; const d=new Date(value); return Number.isNaN(d.getTime())?String(value):d.toLocaleString("zh-CN",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}); }
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
    <button class="miwa-work-open" type="button" data-work-open="${esc(item.id)}">打开</button>
  </article>`;
}
function aside(items){
  const aiCount=items.filter(x=>sourceLabel(x)==="美和AI").length;
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"standard",kicker:"当前上下文",title:"工作之家",text:"统一承接已确认工作事项；工作状态、执行证据和结果在同一工作事实中持续沉淀。",items:[{label:"当前可见",value:`${items.length}项`},{label:"美和AI创建",value:`${aiCount}项`},{label:"数据原则",value:"一份工作事实，多处调用"}]}}));
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
function evidenceTypeLabel(value){ return ({completion:"完成证据",review:"确认记录",ai_review:"美和AI复盘",execution_note:"执行记录",link:"证据链接",file:"文件证据"})[value] || value || "执行记录"; }
function safeHref(value){ try{ const url=new URL(String(value||""), window.location.href); return ["http:","https:"].includes(url.protocol)?url.href:""; }catch(_){ return ""; } }
function publishWorkContext(detail=null){
  window.AIONEWorkExecutionContext = detail ? {
    generatedAt:new Date().toISOString(),
    workItem:detail.workItem,
    evidence:detail.evidence || [],
    results:detail.results || [],
    permissions:detail.permissions || {}
  } : null;
  window.dispatchEvent(new CustomEvent("aione:work-detail-context-change", { detail:window.AIONEWorkExecutionContext }));
}
function evidenceHtml(items=[]){
  if(!items.length)return `<div class="miwa-work-detail-empty">还没有执行证据。开始执行后，可持续记录说明、链接、文件位置和关键结果。</div>`;
  return items.map((item)=>`<article class="miwa-work-evidence"><div><strong>${esc(evidenceTypeLabel(item.evidenceType))}</strong><span>${esc(dateText(item.happenedAt||item.createdAt))}</span></div><p>${esc(item.summary||"—")}</p>${safeHref(item.evidenceUri)?`<a href="${esc(safeHref(item.evidenceUri))}" target="_blank" rel="noopener">打开证据 ↗</a>`:""}</article>`).join("");
}
function resultsHtml(items=[]){
  if(!items.length)return `<div class="miwa-work-detail-empty">尚未形成结果事实。</div>`;
  return items.map((item)=>`<article class="miwa-work-result"><div><strong>${esc(item.resultType||"工作结果")}</strong><span>${esc(item.status||"observed")}</span></div><p>${esc(item.textValue||item.numericValue||"—")}</p></article>`).join("");
}
function detailHtml(detail){
  const item=detail.workItem||{}, permissions=detail.permissions||{};
  const context=item.metadata?.sourcePage || item.workbenchCode || item.relatedObjectId || "工作之家";
  return `<div class="miwa-work-detail-head">
      <div><span>WORK EXECUTION</span><h2>${esc(item.title||"工作事项")}</h2><p>${esc(item.description||item.goalSummary||"暂无补充说明")}</p></div>
      <button type="button" class="miwa-work-detail-close" data-work-detail-close aria-label="关闭">×</button>
    </div>
    <div class="miwa-work-detail-meta">
      <span>状态 <b>${esc(statusLabel(item.status))}</b></span><span>优先级 <b>${esc(priorityLabel(item.priority))}</b></span><span>负责人 <b>${esc(ownerLabel(item))}</b></span><span>来源 <b>${esc(sourceLabel(item))}</b></span><span>上下文 <b>${esc(context)}</b></span>
    </div>
    <div class="miwa-work-detail-timeline"><span class="${["in_progress","waiting","completed"].includes(item.status)?"is-done":"is-current"}">待处理</span><span class="${["waiting","completed"].includes(item.status)?"is-done":item.status==="in_progress"?"is-current":""}">进行中</span><span class="${item.status==="completed"?"is-done":item.status==="waiting"?"is-current":""}">结果确认</span><span class="${item.status==="completed"?"is-current":""}">完成</span></div>
    <div class="miwa-work-detail-grid">
      <section><h3>执行证据</h3><div class="miwa-work-evidence-list">${evidenceHtml(detail.evidence)}</div></section>
      <section><h3>结果事实</h3><div class="miwa-work-result-list">${resultsHtml(detail.results)}</div>${item.resultSummary?`<div class="miwa-work-result-summary"><b>当前结果</b><p>${esc(item.resultSummary)}</p></div>`:""}</section>
    </div>
    <div class="miwa-work-detail-actions">
      ${permissions.canStart?`<button class="primary" type="button" data-work-action="start">开始执行</button>`:""}
      ${permissions.canAddEvidence?`<button type="button" data-work-toggle="evidence">添加执行记录</button>`:""}
      ${permissions.canSubmitCompletion?`<button type="button" data-work-toggle="complete">提交完成</button>`:""}
      ${permissions.canApproveCompletion?`<button class="primary" type="button" data-work-toggle="approve">确认完成</button>`:""}
      ${permissions.canAIReview?`<button type="button" data-work-action="ai-review">让美和AI复盘</button>`:""}
    </div>
    <form class="miwa-work-detail-form" data-work-evidence-form hidden>
      <label>执行说明<textarea name="summary" rows="3" placeholder="记录做了什么、发生了什么、下一步是什么"></textarea></label>
      <label>证据链接 / 文件地址（可选）<input name="evidenceUri" placeholder="Google Drive、AIONE页面或其他可追溯地址"></label>
      <div><button type="button" data-work-form-cancel="evidence">取消</button><button class="primary" type="submit">保存执行记录</button></div>
    </form>
    <form class="miwa-work-detail-form" data-work-complete-form hidden>
      <label>执行结果<textarea name="resultSummary" rows="4" required placeholder="明确说明完成了什么、结果是否达到目标、还有什么遗留问题"></textarea></label>
      <label>完成证据说明（可选）<textarea name="evidenceSummary" rows="2" placeholder="说明关键证据"></textarea></label>
      <label>证据链接 / 文件地址（可选）<input name="evidenceUri" placeholder="Google Drive、AIONE页面或其他可追溯地址"></label>
      <div><button type="button" data-work-form-cancel="complete">取消</button><button class="primary" type="submit">提交结果</button></div>
    </form>
    <form class="miwa-work-detail-form" data-work-approve-form hidden>
      <label>确认意见<textarea name="reviewSummary" rows="3">确认执行结果，工作完成。</textarea></label>
      <div><button type="button" data-work-form-cancel="approve">取消</button><button class="primary" type="submit">确认完成</button></div>
    </form>`;
}

export async function initMiwaWorkHome(){
  const host=document.getElementById("miwa-work-home-entry"); if(!host)return false;
  publishWorkContext(null);
  host.innerHTML=`<section class="miwa-work-home">
    <header class="miwa-work-hero"><div class="miwa-work-hero__mark">工</div><div><div class="miwa-work-hero__eyebrow">MIWA GROUP WORK</div><h1>工作之家</h1><p>统一接收、查看、执行和复盘当前登录人的工作事项。工作状态、执行证据、结果事实和美和AI复盘围绕同一工作ID持续沉淀。</p></div></header>
    <div class="miwa-work-kpis" data-work-kpis></div>
    <div class="miwa-work-toolbar"><input class="miwa-work-search" data-work-search placeholder="搜索工作名称、来源、业务上下文…"><select class="miwa-work-filter" data-work-filter><option value="all">全部工作</option><option value="mine">我的工作</option><option value="created">我创建的</option><option value="ai">美和AI创建</option></select><button class="miwa-work-refresh" type="button" data-work-refresh>刷新</button></div>
    <section class="miwa-work-panel"><div class="miwa-work-panel__head"><div><h2 data-work-section-title>工作事项</h2><p>只显示当前用户有关系的正式工作事项；点击“打开”进入执行、证据和结果闭环。</p></div><span class="miwa-work-count" data-work-count></span></div><div data-work-error></div><div class="miwa-work-list" data-work-list><div class="miwa-work-loading">正在读取工作事项…</div></div></section>
    <dialog class="miwa-work-detail" data-work-detail><div class="miwa-work-detail-body" data-work-detail-body></div></dialog>
  </section>`;
  let allItems=[]; let mode="database"; let activeDetail=null;
  const list=host.querySelector("[data-work-list]"), kpis=host.querySelector("[data-work-kpis]"), count=host.querySelector("[data-work-count]"), search=host.querySelector("[data-work-search]"), filter=host.querySelector("[data-work-filter]"), errorHost=host.querySelector("[data-work-error]"), sectionTitle=host.querySelector("[data-work-section-title]"), dialog=host.querySelector("[data-work-detail]"), detailBody=host.querySelector("[data-work-detail-body]");
  const titles={work:"全部工作", "work-mine":"我的工作", "work-pending":"待处理", "work-active":"进行中", "work-waiting":"待确认", "work-completed":"已完成"};
  if(sectionTitle)sectionTitle.textContent=titles[routeId()]||"工作事项";
  function render(){
    const m=metrics(allItems); kpis.innerHTML=[["我的工作",m.mine],["待处理",m.pending],["进行中",m.active],["待确认",m.waiting],["已完成",m.completed],["AI创建",m.ai]].map(([label,value])=>`<div class="miwa-work-kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("");
    const rows=allItems.filter(routeMatches).filter(x=>searchMatches(x,search.value.trim())).filter(x=>filterMatches(x,filter.value));
    count.textContent=`${rows.length} 项`;
    list.innerHTML=rows.length?rows.map(itemHtml).join(""):`<div class="miwa-work-empty">当前条件下暂无工作事项。</div>`;
    window.MIWAHeader?.configure?.({workCount:m.mine}); aside(allItems);
    errorHost.innerHTML=mode==="local"?`<div class="miwa-work-error">正式数据库暂时未连接，当前显示本地预览工作记录；执行闭环只在正式AIONE Backend连接后可用。</div>`:"";
  }
  async function refresh(){ list.innerHTML=`<div class="miwa-work-loading">正在读取工作事项…</div>`; const loaded=await loadItems(); allItems=loaded.items; mode=loaded.mode; render(); }
  async function loadDetail(id){
    if(mode!=="database") throw new Error("正式执行闭环需要连接AIONE Backend。");
    const detail=await aioneApi(`/api/v1/work-home/${encodeURIComponent(id)}/execution`);
    activeDetail=detail; publishWorkContext(detail); detailBody.innerHTML=detailHtml(detail); bindDetailActions();
    if(!dialog.open)dialog.showModal();
  }
  async function reloadActiveDetail(){ if(activeDetail?.workItem?.id) await loadDetail(activeDetail.workItem.id); await refresh(); }
  function closeDetail(){ dialog.close(); activeDetail=null; publishWorkContext(null); }
  function setForm(name,visible){ const form=detailBody.querySelector(`[data-work-${name}-form]`); if(form)form.hidden=!visible; }
  function workError(error){ alert(error?.message || "工作执行失败，请稍后重试。"); }
  async function startWork(){ try{ await aioneApi(`/api/v1/work-home/${encodeURIComponent(activeDetail.workItem.id)}/start`,{method:"POST",body:"{}"}); await reloadActiveDetail(); }catch(error){workError(error);} }
  async function addEvidence(form){
    const data=new FormData(form); const summary=String(data.get("summary")||"").trim(); const evidenceUri=String(data.get("evidenceUri")||"").trim();
    try{ await aioneApi(`/api/v1/work-home/${encodeURIComponent(activeDetail.workItem.id)}/evidence`,{method:"POST",body:JSON.stringify({summary,evidenceUri,evidenceType:evidenceUri?"link":"execution_note"})}); form.reset(); await reloadActiveDetail(); }catch(error){workError(error);} }
  async function completeWork(form){
    const data=new FormData(form); const resultSummary=String(data.get("resultSummary")||"").trim(); const evidenceSummary=String(data.get("evidenceSummary")||"").trim(); const evidenceUri=String(data.get("evidenceUri")||"").trim();
    try{ const result=await aioneApi(`/api/v1/work-home/${encodeURIComponent(activeDetail.workItem.id)}/complete`,{method:"POST",body:JSON.stringify({resultSummary,evidenceSummary,evidenceUri})}); form.reset(); await reloadActiveDetail(); if(result.completionState==="waiting")alert("执行结果已提交，等待工作创建者确认。\n美和AI已经可以读取本次结果和证据进行复盘。"); }catch(error){workError(error);} }
  async function approveWork(form){
    const data=new FormData(form); const reviewSummary=String(data.get("reviewSummary")||"").trim();
    try{ await aioneApi(`/api/v1/work-home/${encodeURIComponent(activeDetail.workItem.id)}/approve`,{method:"POST",body:JSON.stringify({reviewSummary})}); await reloadActiveDetail(); }catch(error){workError(error);} }
  function aiReview(){
    publishWorkContext(activeDetail); window.MIWAAI?.open?.("work-home-review");
    const prompt="复盘当前工作结果。请基于工作目标、原始Proposal来源、执行证据和结果事实判断：1）是否真正完成目标；2）有哪些遗留问题；3）是否应沉淀为规则、知识、Skill或自动化；4）是否需要创建下一轮工作。事实不足的地方标记待确认，不要编造。";
    window.setTimeout(()=>window.AIONEAISecretary?.sendCommand?.(prompt,{capabilityCode:"work.execution_review",capabilityLabel:"复盘工作结果"}),120);
  }
  function bindDetailActions(){
    detailBody.querySelector("[data-work-detail-close]")?.addEventListener("click",closeDetail);
    detailBody.querySelector('[data-work-action="start"]')?.addEventListener("click",startWork);
    detailBody.querySelector('[data-work-action="ai-review"]')?.addEventListener("click",aiReview);
    detailBody.querySelectorAll("[data-work-toggle]").forEach((button)=>button.addEventListener("click",()=>setForm(button.dataset.workToggle,true)));
    detailBody.querySelectorAll("[data-work-form-cancel]").forEach((button)=>button.addEventListener("click",()=>setForm(button.dataset.workFormCancel,false)));
    detailBody.querySelector("[data-work-evidence-form]")?.addEventListener("submit",(event)=>{event.preventDefault();addEvidence(event.currentTarget);});
    detailBody.querySelector("[data-work-complete-form]")?.addEventListener("submit",(event)=>{event.preventDefault();completeWork(event.currentTarget);});
    detailBody.querySelector("[data-work-approve-form]")?.addEventListener("submit",(event)=>{event.preventDefault();approveWork(event.currentTarget);});
  }
  search.addEventListener("input",render); filter.addEventListener("change",render); host.querySelector("[data-work-refresh]")?.addEventListener("click",refresh);
  list.addEventListener("click",(event)=>{ const button=event.target.closest("[data-work-open]"); if(!button)return; loadDetail(button.dataset.workOpen).catch(workError); });
  dialog.addEventListener("close",()=>{ activeDetail=null; publishWorkContext(null); });
  dialog.addEventListener("click",(event)=>{ if(event.target===dialog)closeDetail(); });
  await refresh(); return true;
}
