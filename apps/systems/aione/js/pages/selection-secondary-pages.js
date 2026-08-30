import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260824-v1.9.5-sidebar-aside-lock-candidate";
import { renderWorkManualIcon } from "../components/work-manual-icon.js?v=20260829-v1";
import { createUniversalWorkspace } from "../components/universal-workspace.js";
import { renderObjectList } from "../components/object-presenter.js";
import {
  SELECTION_SORT_OPTIONS,
  createPreviewOpportunityId,
  filterSelectionItems,
  getSelectionOwners,
  loadSelectionItems,
  selectionMoney,
  selectionPlatformLabel,
  selectionResultLabel,
  selectionSourceLabel
} from "../data/selection-workbench-adapter.js?v=20260829-object-workspace-v1";
import {
  createSelectionPortal,
  getObjectPolicies,
  initBatchImport,
  openSelectionRecordDetail
} from "./selection-workbench.js?v=20260829-selection-v3";

const USER_SELECTION_TYPES=Object.freeze(["直发选品","常规选品"]);
const esc=(value)=>String(value??"").replace(/[&<>\"]/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
const manualHref=(section)=>`#/selection/overview?section=${encodeURIComponent(section)}`;

function pageTitle(page){return ({mine:"我的选品",ai:"AI的选品","product-development":"商品企划",following:"我的互动"})[page]||"选品工作台";}
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
function productHtml(item){
  const image=item?.representativeImage?.url?`<img src="${esc(item.representativeImage.url)}" alt="" loading="lazy">`:`<span>${esc(String(item.name||"商").slice(0,1))}</span>`;
  const source=item?.sourceUrl?`<a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(selectionSourceLabel(item))} ↗</a>`:`<em>${esc(selectionSourceLabel(item))}</em>`;
  return `<div class="miwa-selection-list-product"><span class="miwa-selection-list-thumb">${image}</span><span><strong>${esc(item.name)}</strong><small>${esc(item.id)} · ${esc(item.type)} · ${source}</small></span></div>`;
}

function renderMine(root){
  const actions=[
    actionTile("direct","efficiency","直发","选品"),
    actionTile("standard","standard","常规","选品"),
    actionTile("batch","apps","批量","选品",true)
  ].join("");
  root.innerHTML=`<section class="selection-secondary-card selection-secondary-card--mine">${titleBar("我的选品","my-selection",actions,"公司所有成员均可根据自己的时间安排自主选品。")}
    <div data-selection-mine-workspace></div>
    <div data-selection-mine-portal></div>
  </section>`;
  renderSemanticIcons(root);

  let items=loadSelectionItems().filter((item)=>USER_SELECTION_TYPES.includes(item.type));
  const workspace=createUniversalWorkspace(root.querySelector("[data-selection-mine-workspace]"),{
    pageId:"selection-mine-object-v4",
    title:"我的选品",
    description:"与商品机会一览共用同一对象数据与标准组件，只改变当前个人选品视图范围。",
    searchPlaceholder:"搜索商品 / 机会ID / 负责人",
    filters:[
      {key:"type",label:"选品方式",allLabel:"全部选品方式",options:USER_SELECTION_TYPES},
      {key:"owner",label:"负责人",allLabel:"全部负责人",options:getSelectionOwners(items)},
      {key:"time",label:"时间范围",allLabel:"全部时间",options:[{value:"today",label:"今天"},{value:"7d",label:"近7天"},{value:"month",label:"本月"}]}
    ],
    sortOptions:SELECTION_SORT_OPTIONS,
    views:["list"],
    defaultView:"list",
    allowImport:false,
    allowExport:false,
    pageSize:12,
    onStateChange:()=>renderObjects()
  });

  function visibleRows(){return workspace.sortItems(filterSelectionItems(items,workspace.getState(),""));}
  function renderObjects(){
    const rows=visibleRows();
    if(!rows.length){
      workspace.setCount(0);
      if(items.length)workspace.showNoResults();
      else workspace.showEmpty("暂无我的选品","开始直发选品或常规选品后，记录会进入这里。");
      return;
    }
    workspace.hideState();
    const page=workspace.paginateItems(rows);
    const table=workspace.getTableNodes("list");
    renderObjectList(table.head,table.body,page.rows,{
      fields:[
        {label:"商品机会",renderHtml:productHtml,className:"miwa-selection-list-primary"},
        {label:"负责人",value:(item)=>item.owner||"待确认"},
        {label:"当前事项",value:(item)=>item.stageName||"待确认"},
        {label:"销售平台",value:(item)=>selectionPlatformLabel(item)},
        {label:"时间",value:(item)=>item.time||"—"},
        {label:"投入成本",value:(item)=>selectionMoney(item.cost)},
        {label:"结果",value:(item)=>selectionResultLabel(item)}
      ],
      actions:[{key:"edit",label:"查看对象"}]
    });
  }

  const portalState=createSelectionPortal(root.querySelector("[data-selection-mine-portal]"));
  const showToast=(message)=>{
    const toast=portalState?.toast;
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add("is-show");
    window.setTimeout(()=>toast.classList.remove("is-show"),2200);
  };
  const batch=initBatchImport(portalState,showToast,()=>{
    items=loadSelectionItems().filter((item)=>USER_SELECTION_TYPES.includes(item.type));
    workspace.setFilterOptions("owner",getSelectionOwners(items),workspace.getState().filters.owner||"");
    renderObjects();
  });
  const policy=getObjectPolicies();

  root.addEventListener("click",(event)=>{
    const objectAction=event.target.closest("[data-object-action]");
    if(objectAction){
      const item=items.find((row)=>String(row.id)===String(objectAction.dataset.objectId));
      if(item&&objectAction.dataset.objectAction==="edit")openSelectionRecordDetail({id:item.id,type:item.type,mode:"edit"});
      return;
    }
    const start=event.target.closest("[data-selection-start]");
    if(!start)return;
    const action=start.dataset.selectionStart;
    if(action==="direct"||action==="standard"){
      if(!policy.createAllowed)return;
      openSelectionRecordDetail({id:createPreviewOpportunityId(loadSelectionItems()),type:action==="direct"?"直发选品":"常规选品",mode:"create"});
      return;
    }
    if(action==="batch"&&policy.importAllowed)batch?.open("");
  });

  renderObjects();
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"light",kicker:"当前页面",title:"我的选品",text:"开始新的选品工作，或继续推进已经发起的选品；对象能力与商品机会一览保持一致。"}}));
}

export async function initSelectionSecondaryPage(page="mine"){
  const root=document.querySelector("[data-selection-secondary-page]");
  if(!root)return false;
  document.title=`美和AIONE一体化工作平台｜${pageTitle(page)}`;
  if(page==="mine")renderMine(root);
  else if(page==="ai")root.innerHTML=emptyPage("AI的选品","future","AI","该功能已预留，将根据后续业务验证结果逐步完善。");
  else if(page==="product-development")root.innerHTML=emptyPage("商品企划","future","企","商品企划是独立于选品类型的商品创造与开发流程；正式流程将在业务验证后逐步接入。");
  else if(page==="following")root.innerHTML=`<section class="selection-secondary-card">${titleBar("我的互动","following","","集中查看你点赞、关注、收藏、评论、转发或被@的商品机会；正式对象互动接口接入后统一沉淀。")}${mountFollowingPlaceholder()}</section>`;
  renderSemanticIcons(root);
  return true;
}

function mountFollowingPlaceholder(){
  return `<div class="selection-secondary-empty"><span>互</span><h2>我的互动视图</h2><p>点赞、关注、收藏、评论、转发与@统一沉淀为对象互动；正式Backend接入后，这里按当前用户聚合对应对象。</p></div>`;
}
