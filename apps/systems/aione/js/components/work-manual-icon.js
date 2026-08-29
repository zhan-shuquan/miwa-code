/* ========================================
   MIWA Icon Library 001｜工作手册 V1
   全局统一资产：页面只调用组件，不复制图标文件。
======================================== */
const esc=(value)=>String(value??"").replace(/[&<>\"]/g,(char)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
const WORK_MANUAL_ICON_URL=new URL("../../assets/icons/miwa/001-work-manual-v1.png",import.meta.url).href;

export function renderWorkManualIcon({href="#/selection/overview",label="工作手册"}={}){
  return `<a class="miwa-work-manual-icon" href="${esc(href)}" title="${esc(label)}" aria-label="${esc(label)}"><img src="${WORK_MANUAL_ICON_URL}" alt="" aria-hidden="true"></a>`;
}
