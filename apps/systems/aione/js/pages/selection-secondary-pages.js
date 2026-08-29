import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260824-v1.9.5-sidebar-aside-lock-candidate";
import { renderWorkManualIcon } from "../components/work-manual-icon.js?v=20260829-v1";
import {
  SELECTION_STAGES,
  loadSelectionItems,
  createPreviewOpportunityId
} from "../data/selection-workbench-adapter.js";
import {
  createSelectionPortal,
  getObjectPolicies,
  initBatchImport,
  openSelectionRecordDetail
} from "./selection-workbench.js?v=20260829-selection-v2";

const USER_SELECTION_TYPES=Object.freeze(["直发选品","常规选品"]);
const esc=(value)=>String(value??"").replace(/[&<>\"]/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
const manualHref=(section)=>`#/selection/overview?section=${encodeURIComponent(section)}`;
function itemStatus(item){
  if(item?.result==="上架")return "passed";
  if(item?.result==="不上架"||item?.result==="已作废")return "rejected";
  if(item?.result==="待形成"&&item?.stage==="decision")return "pending";
  return "ongoing";
}
function statusLabel(key){return ({ongoing:"进行中",pending:"待判断",passed:"已通过",rejected:"已淘汰"})[key]||"进行中";}
function pageTitle(page){return ({mine:"我的选品",ai:"AI选品","product-development":"产品开发",following:"我的关注"})[page]||"选品工作台";}
function titleBar(title,manualSection,actions=""){
  return `<header class="selection-secondary-head"><div class="selection-secondary-head__title"><h1>${esc(title)}</h1>${renderWorkManualIcon({href:manualHref(manualSection)})}</div>${actions?`<div class="selection-secondary-head__actions">${actions}</div><div class="selection-secondary-head__balance" aria-hidden="true"></div>`:""}</header>`;
}
function actionTile(key,icon,top,bottom,outline=false){
  return `<button class="selection-start-action${outline?" is-outline":""}" type="button" data-selection-start="${esc(key)}"><span class="selection-start-action__icon miwa-semantic-icon" data-icon="${esc(icon)}" aria-hidden="true"></span><span>${esc(top)}</span><strong>${esc(bottom)}</strong></button>`;
}
function emptyPage(title,manualSection,mark,description){
  return `<section class="selection-secondary-card">${titleBar(title,manualSection)}<div class="selection-secondary-empty"><span>${esc(mark)}</span><h2>${esc(title==="AI选品"||title==="产品开发"?"开发中":title)}</h2><p>${esc(description)}</p></div></section>`;
}
function renderMine(root){
  let items=loadSelectionItems().filter((item)=>USER_SELECTION_TYPES.includes(item.type));
  let state={query:"",type:"",stage:"",status:"all"};
  const policy=getObjectPolicies();
  const actions=[
    actionTile("direct","efficiency","直发","选品"),
    actionTile("standard","standard","常规","选品"),
    actionTile("batch","apps","批量","选品",true)
  ].join("");
  root.innerHTML=`<section class="selection-secondary-card selection-secondary-card--mine">${titleBar("我的选品","my-selection",actions)}<div class="selection-selection-stats" data-selection-stats></div><div class="selection-mine-toolbar"><label class="selection-mine-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="搜索选品..." data-mine-search></label><select data-mine-type aria-label="选品方式"><option value="">全部选品方式</option><option value="直发选品">直发选品</option><option value="常规选品">常规选品</option></select><select data-mine-stage aria-label="当前阶段"><option value="">全部阶段</option>${SELECTION_STAGES.map((stage)=>`<option value="${esc(stage.key)}">${esc(stage.label)}</option>`).join("")}</select><select data-mine-status aria-label="状态"><option value="all">全部状态</option><option value="ongoing">进行中</option><option value="pending">待判断</option><option value="passed">已通过</option><option value="rejected">已淘汰</option></select></div><div class="selection-mine-table-wrap"><table class="selection-mine-table"><thead><tr><th>选品对象</th><th>选品方式</th><th>当前阶段</th><th>状态</th><th>更新时间</th><th>操作</th></tr></thead><tbody data-mine-body></tbody></table></div><div class="miwa-level2-portal" data-selection-secondary-portal></div></section>`;
  renderSemanticIcons(root);
  const stats=root.querySelector("[data-selection-stats]");
  const body=root.querySelector("[data-mine-body]");
  const search=root.querySelector("[data-mine-search]");
  const type=root.querySelector("[data-mine-type]");
  const stage=root.querySelector("[data-mine-stage]");
  const status=root.querySelector("[data-mine-status]");
  const portalState=createSelectionPortal(root.querySelector("[data-selection-secondary-portal]"));
  let toastTimer=null;
  const showToast=(text)=>{const node=portalState?.toast;if(!node)return;node.textContent=text;node.classList.add("is-visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove("is-visible"),2200);};
  const batchImport=initBatchImport(portalState,showToast,()=>{items=loadSelectionItems().filter((item)=>USER_SELECTION_TYPES.includes(item.type));render();});
  function counts(){return {all:items.length,ongoing:items.filter((item)=>item.result==="待形成").length,pending:items.filter((item)=>itemStatus(item)==="pending").length,passed:items.filter((item)=>itemStatus(item)==="passed").length,rejected:items.filter((item)=>itemStatus(item)==="rejected").length};}
  function filtered(){const q=state.query.trim().toLowerCase();return items.filter((item)=>{if(state.type&&item.type!==state.type)return false;if(state.stage&&item.stage!==state.stage)return false;if(state.status!=="all"&&itemStatus(item)!==state.status)return false;if(q&&!`${item.name||""} ${item.id||""} ${item.owner||""}`.toLowerCase().includes(q))return false;return true;});}
  function renderStats(){const c=counts();stats.innerHTML=[["all","选品总数",c.all],["ongoing","进行中",c.ongoing],["pending","待判断",c.pending],["passed","已通过",c.passed],["rejected","已淘汰",c.rejected]].map(([key,label,value])=>`<button type="button" class="selection-stat-chip${state.status===key?" is-active":""}" data-mine-stat="${key}"><span>${label}</span><strong>${value}</strong></button>`).join("");}
  function renderRows(){const rows=filtered();body.innerHTML=rows.length?rows.map((item)=>`<tr><td><div class="selection-object-identity"><span class="selection-object-thumb">${item.representativeImage?.url?`<img src="${esc(item.representativeImage.url)}" alt="">`:esc(String(item.name||"选").slice(0,1))}</span><span><strong>${esc(item.name||"未命名")}</strong><small>${esc(item.id||"")}</small></span></div></td><td>${esc(item.type||"—")}</td><td><span class="selection-stage-tag">${esc(item.stageName||"待确认")}</span></td><td>${esc(statusLabel(itemStatus(item)))}</td><td>${esc(item.time||"—")}</td><td><button type="button" class="selection-continue-button" data-continue-selection="${esc(item.id)}">继续选品</button></td></tr>`).join(""):`<tr><td colspan="6"><div class="selection-inline-empty">当前筛选条件下暂无选品记录。</div></td></tr>`;}
  function render(){renderStats();renderRows();}
  search.addEventListener("input",()=>{state.query=search.value;renderRows();});
  type.addEventListener("change",()=>{state.type=type.value;renderRows();});
  stage.addEventListener("change",()=>{state.stage=stage.value;renderRows();});
  status.addEventListener("change",()=>{state.status=status.value;render();});
  root.addEventListener("click",(event)=>{
    const start=event.target.closest("[data-selection-start]");
    if(start){const action=start.dataset.selectionStart;if(action==="direct"||action==="standard"){if(!policy.createAllowed){showToast("新建已由系统参数权限关闭");return;}const typeName=action==="direct"?"直发选品":"常规选品";openSelectionRecordDetail({id:createPreviewOpportunityId(items),type:typeName,mode:"create"});return;}if(action==="batch"){if(!policy.importAllowed){showToast("批量选品已由系统参数权限关闭");return;}batchImport?.open("");return;}}
    const stat=event.target.closest("[data-mine-stat]");if(stat){state.status=stat.dataset.mineStat||"all";status.value=state.status;render();return;}
    const cont=event.target.closest("[data-continue-selection]");if(cont){const item=items.find((row)=>String(row.id)===String(cont.dataset.continueSelection));if(item)openSelectionRecordDetail({id:item.id,type:item.type,mode:"edit"});}
  });
  render();
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"light",kicker:"当前页面",title:"我的选品",text:"开始新的选品工作，或继续推进已经发起的选品。"}}));
}

export async function initSelectionSecondaryPage(page="mine"){
  const root=document.querySelector("[data-selection-secondary-page]");
  if(!root)return false;
  document.title=`美和AIONE一体化工作平台｜${pageTitle(page)}`;
  if(page==="mine")renderMine(root);
  else if(page==="ai")root.innerHTML=emptyPage("AI选品","future","AI","该功能已预留，将根据后续业务验证结果逐步完善。");
  else if(page==="product-development")root.innerHTML=emptyPage("产品开发","future","开","该功能已预留，将根据后续业务验证结果逐步完善。");
  else if(page==="following")root.innerHTML=emptyPage("我的关注","following","关","点赞与关注将围绕商品机会对象统一沉淀；正式对象能力接入后在这里集中查看。");
  renderSemanticIcons(root);
  return true;
}
