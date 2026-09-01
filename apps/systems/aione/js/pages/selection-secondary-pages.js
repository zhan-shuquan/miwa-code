import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260824-v1.9.5-sidebar-aside-lock-candidate";
import { renderWorkManualIcon } from "../components/work-manual-icon.js?v=20260829-v1";
import {
  createPreviewOpportunityId,
  loadSelectionItems
} from "../data/selection-workbench-adapter.js?v=20260829-object-workspace-v1";
import * as selectionWorkbench from "./selection-workbench.js?v=20260829-selection-v3";

const {
  getObjectPolicies,
  openSelectionRecordDetail
}=selectionWorkbench;
const USER_SELECTION_TYPES=Object.freeze(["直发选品","常规选品"]);
const esc=(value)=>String(value??"").replace(/[&<>\"]/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
const manualHref=(section)=>`#/selection/overview?section=${encodeURIComponent(section)}`;

function pageTitle(page){return ({mine:"我的选品",ai:"AI的选品","product-development":"产品开发",following:"我的互动"})[page]||"选品工作台";}
function titleBar(title,manualSection,actions="",subtitle=""){
  return `<header class="selection-secondary-head">
    <div class="selection-secondary-head__title-block">
      <div class="selection-secondary-head__title"><h1>${esc(title)}</h1>${renderWorkManualIcon({href:manualHref(manualSection)})}</div>
      ${subtitle?`<p>${esc(subtitle)}</p>`:""}
    </div>
    ${actions?`<div class="selection-secondary-head__actions">${actions}</div><div class="selection-secondary-head__balance" aria-hidden="true"></div>`:""}
  </header>`;
}
function actionTile(key,icon,top,bottom,outline=false){
  return `<button class="selection-start-action${outline?" is-outline":""}" type="button" data-selection-start="${esc(key)}"><span class="selection-start-action__icon miwa-semantic-icon" data-icon="${esc(icon)}" aria-hidden="true"></span><span>${esc(top)}</span><strong>${esc(bottom)}</strong></button>`;
}
function emptyPage(title,manualSection,mark,description){
  return `<section class="selection-secondary-card">${titleBar(title,manualSection,"",description)}<div class="selection-secondary-empty"><span>${esc(mark)}</span><h2>开发中</h2><p>${esc(description)}</p></div></section>`;
}

function renderMine(root){
  const actions=[
    actionTile("direct","efficiency","直发","选品"),
    actionTile("standard","standard","常规","选品"),
    actionTile("batch","apps","批量","选品",true)
  ].join("");
  root.innerHTML=`<section class="selection-secondary-card selection-secondary-card--mine">${titleBar("我的选品","my-selection",actions,"公司所有成员均可根据自己的时间安排自主选品。")}<div data-selection-mine-workspace></div></section>`;
  renderSemanticIcons(root);

  const workspaceHost=root.querySelector("[data-selection-mine-workspace]");
  const mountSelectionObjectWorkspace=selectionWorkbench.mountSelectionObjectWorkspace;
  if(typeof mountSelectionObjectWorkspace!=="function"){
    workspaceHost.innerHTML=`<div class="selection-secondary-empty"><span>选</span><h2>我的选品工作区正在收口</h2><p>当前 main 已完成选品工作台 V2 收口，旧对象工作区接口已停止导出。请从商品机会一览继续工作；新的个人 Scope 将按统一对象工作区重新接入。</p></div>`;
    console.warn("[AIONE] mountSelectionObjectWorkspace is unavailable; secondary selection page entered safe fallback instead of blocking application bootstrap.");
    window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"light",kicker:"当前页面",title:"我的选品",text:"个人选品 Scope 正在按统一对象工作区重新接入；当前不影响其他 AIONE 页面使用。"}}));
    return;
  }

  const browser=mountSelectionObjectWorkspace(workspaceHost,{
    itemsProvider:()=>loadSelectionItems().filter((item)=>USER_SELECTION_TYPES.includes(item.type)),
    pageId:"selection-mine-object-v3",
    title:"我的选品",
    description:"与商品机会一览共用同一对象字段、列表/卡片和互动能力，只改变当前个人选品视图范围。",
    totalLabel:"选品总数",
    hideHeader:true
  });
  const policy=getObjectPolicies();
  root.addEventListener("click",(event)=>{
    const start=event.target.closest("[data-selection-start]");
    if(!start)return;
    const action=start.dataset.selectionStart;
    if(action==="direct"||action==="standard"){
      if(!policy.createAllowed)return;
      const items=loadSelectionItems();
      openSelectionRecordDetail({id:createPreviewOpportunityId(items),type:action==="direct"?"直发选品":"常规选品",mode:"create"});
      return;
    }
    if(action==="batch"&&policy.importAllowed)browser?.openBatch("");
  });
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"light",kicker:"当前页面",title:"我的选品",text:"开始新的选品工作，或继续推进已经发起的选品；对象能力与商品机会一览保持一致。"}}));
}

export async function initSelectionSecondaryPage(page="mine"){
  const root=document.querySelector("[data-selection-secondary-page]");
  if(!root)return false;
  document.title=`美和AIONE一体化工作平台｜${pageTitle(page)}`;
  if(page==="mine")renderMine(root);
  else if(page==="ai")root.innerHTML=emptyPage("AI的选品","future","AI","该功能已预留，将根据后续业务验证结果逐步完善。");
  else if(page==="product-development")root.innerHTML=emptyPage("产品开发","future","开","该功能已预留，将根据后续业务验证结果逐步完善。");
  else if(page==="following")root.innerHTML=`<section class="selection-secondary-card">${titleBar("我的互动","following","","集中查看你点赞、关注、收藏、评论或转发过的商品机会；正式对象互动接口接入后统一沉淀。")}${mountFollowingPlaceholder()}</section>`;
  renderSemanticIcons(root);
  return true;
}

function mountFollowingPlaceholder(){
  return `<div class="selection-secondary-empty"><span>互</span><h2>我的互动视图</h2><p>点赞、关注、收藏、评论与转发统一沉淀为对象互动；正式Backend接入后，这里按当前用户聚合对应对象。</p></div>`;
}
