import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260824-v1.9.5-sidebar-aside-lock-candidate";
import { renderWorkManualIcon } from "../components/work-manual-icon.js?v=20260829-v1";

const esc=(value)=>String(value??"").replace(/[&<>\"]/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
const manualHref=(section)=>`#/selection/overview?section=${encodeURIComponent(section)}`;

function pageTitle(page){return ({mine:"我的选品",ai:"AI的选品","product-development":"产品开发",following:"我的互动"})[page]||"选品工作台";}
function titleBar(title,manualSection,subtitle=""){
  return `<header class="selection-secondary-head">
    <div class="selection-secondary-head__title-block">
      <div class="selection-secondary-head__title"><h1>${esc(title)}</h1>${renderWorkManualIcon({href:manualHref(manualSection)})}</div>
      ${subtitle?`<p>${esc(subtitle)}</p>`:""}
    </div>
  </header>`;
}
function safeState(title,manualSection,mark,description,state="VALIDATING"){
  return `<section class="selection-secondary-card">${titleBar(title,manualSection,description)}<div class="selection-secondary-empty"><span>${esc(mark)}</span><h2>${esc(state)}</h2><p>${esc(description)}</p></div></section>`;
}

export async function initSelectionSecondaryPage(page="mine"){
  const root=document.querySelector("[data-selection-secondary-page]");
  if(!root)return false;
  document.title=`美和AIONE一体化工作平台｜${pageTitle(page)}`;

  if(page==="mine"){
    root.innerHTML=safeState(
      "我的选品",
      "my-selection",
      "选",
      "个人 Scope 将直接复用唯一正式 Selection 数据源；在权限与 owner 过滤完成前，不再通过浏览器 localStorage 创建第二套商品机会。"
    );
  } else if(page==="ai"){
    root.innerHTML=safeState("AI的选品","future","AI","当前先跑通真实 Selection 闭环；AI选品在业务规则稳定后接入统一 Selection 对象。","NOT YET IMPLEMENTED");
  } else if(page==="product-development"){
    root.innerHTML=safeState("产品开发","future","开","产品开发入口保留，但不会复制 Selection / Product 对象或另建临时数据层。","NOT YET IMPLEMENTED");
  } else if(page==="following"){
    root.innerHTML=safeState("我的互动","following","互","点赞、关注、收藏、评论与转发未来统一沉淀为对象互动；正式 Backend 接入前不制造浏览器模拟数据。","NOT YET IMPLEMENTED");
  }

  renderSemanticIcons(root);
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{
    state:"light",
    kicker:"Selection CURRENT",
    title:pageTitle(page),
    text:"当前页面遵循唯一真实数据源原则；未接入能力保持明确空状态，不以 Preview 数据代替。"
  }}));
  return true;
}
