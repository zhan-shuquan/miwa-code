import { mountLevel2EmptyBase } from "../templates/level2-empty-base.js";
import { getTemplateRecipe } from "../templates/template-registry.js";
import { createUniversalWorkspace } from "../components/universal-workspace.js?v=20260829-object-workspace-v1";
import { renderObjectCards, renderObjectList } from "../components/object-presenter.js?v=20260829-object-workspace-v1";
import { getActiveSystemParameters } from "../shell/system-settings.js";
import { getFieldSchema } from "../config/field-registry.js";
import { importPreviewOpportunities, removePreviewOpportunity } from "../data/preview-opportunities.js";
import {
  SELECTION_SORT_OPTIONS,
  loadSelectionItems,
  getSelectionOwners,
  filterSelectionItems,
  selectionPlatformLabel,
  selectionSourceLabel,
  selectionMoney,
  selectionResultLabel,
  selectionStatus,
  formatLocalDateTime
} from "../data/selection-workbench-adapter.js?v=20260829-object-workspace-v1";

const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
const SELECTION_FIELD_MAP = new Map(getFieldSchema("selection").map((field) => [field.key, field]));
const selectionFieldLabel = (key, fallback = key) => SELECTION_FIELD_MAP.get(key)?.label || fallback;

export function getObjectPolicies() {
  const params = getActiveSystemParameters?.() || {};
  return {
    createAllowed: params.permissions?.allowCreate !== false,
    importAllowed: params.permissions?.allowImport !== false && (params.io?.allowCsv !== false || params.io?.allowExcel !== false),
    exportAllowed: params.permissions?.allowExport !== false
  };
}

export function openSelectionRecordDetail({ id, type = "", mode = "edit" } = {}) {
  const recordId = String(id || "").trim();
  if (!recordId) return;
  if (mode === "create") {
    try {
      window.localStorage.removeItem(`aione:selection:draft:${recordId}`);
      window.localStorage.removeItem(`aione:selection:workflow:${recordId}`);
    } catch (_) {}
  }
  const routeParams = new URLSearchParams();
  routeParams.set("mode", mode);
  if (type) routeParams.set("selection_type", type);
  if (mode === "create") {
    routeParams.set("owner", "张美和");
    routeParams.set("created_at", formatLocalDateTime());
  }
  const target = new URL("./index.html", window.location.href);
  target.search = "";
  const query = routeParams.toString();
  target.hash = `/selection/opportunity/${encodeURIComponent(recordId)}${query ? `?${query}` : ""}`;
  window.location.href = target.href;
}

export function createSelectionPortal(portal) {
  if (!portal) return null;
  portal.innerHTML = `
    <dialog class="selection-batch-dialog" id="selection-batch-dialog" aria-labelledby="selection-batch-title">
      <div class="selection-batch-dialog__body">
        <div class="selection-batch-dialog__head">
          <div><small>批量选品</small><h2 id="selection-batch-title"><span id="selection-batch-type-label">选品方式</span>｜批量导入</h2><p>先选择直发或常规选品，再下载对应模板、填写并上传；校验通过后批量创建商品机会。</p></div>
          <button class="selection-batch-dialog__close" type="button" data-selection-batch-close aria-label="关闭">×</button>
        </div>
        <div class="selection-batch-context"><span>选品方式</span><select id="selection-batch-type-picker" aria-label="批量选品方式"><option value="">请选择</option><option value="直发选品">直发选品</option><option value="常规选品">常规选品</option></select><strong id="selection-batch-context-type">待选择</strong><small>批量选品的技术录入仍复用现有导入能力</small></div>
        <div class="selection-batch-steps" aria-label="批量导入步骤">
          <div class="selection-batch-step is-current" data-batch-step="1"><b>01 下载模板</b><span>获取当前类型Excel</span></div>
          <div class="selection-batch-step" data-batch-step="2"><b>02 上传校验</b><span>检查格式与缺失项</span></div>
          <div class="selection-batch-step" data-batch-step="3"><b>03 批量创建</b><span>生成商品机会记录</span></div>
        </div>
        <section class="selection-batch-template" aria-label="Excel模板下载">
          <div class="selection-batch-template__info"><span class="selection-batch-template__icon" aria-hidden="true">X</span><div><div class="selection-batch-template__title-line"><strong id="selection-batch-template-title">等待选择选品方式</strong><span id="selection-batch-template-status">待匹配</span></div><p id="selection-batch-template-desc">选择选品方式后自动匹配模板。</p></div></div>
          <button class="selection-batch-download-button" id="selection-batch-download" type="button" disabled>↓ 下载模板</button>
        </section>
        <section class="selection-batch-section"><h3>上传并校验</h3><label class="selection-batch-upload" id="selection-batch-drop-zone"><span class="selection-batch-upload__icon">⇧</span><strong>拖入Excel / CSV，或点击选择文件</strong><p>使用AIONE模板可减少字段错位和重复录入。</p><span class="selection-batch-file-button">选择文件</span><input id="selection-batch-file" type="file" accept=".xlsx,.csv" hidden></label><div class="selection-batch-file-status" id="selection-batch-file-status" hidden></div></section>
        <div class="selection-batch-validation" id="selection-batch-validation" hidden></div>
        <footer class="selection-batch-dialog__foot"><p>批量导入仍写入同一商品机会数据层，不产生第二套数据。</p><div><button class="selection-batch-cancel-button" type="button" data-selection-batch-close>取消</button><button class="selection-batch-action-button" id="selection-batch-action" type="button" disabled>校验Excel</button></div></footer>
      </div>
    </dialog>
    <div class="miwa-business-toast" data-selection-toast aria-live="polite"></div>`;
  return { dialog: portal.querySelector("#selection-batch-dialog"), toast: portal.querySelector("[data-selection-toast]") };
}

export function initBatchImport(portalState, showToast, onCreated) {
  const dialog = portalState?.dialog;
  if (!dialog) return null;
  const stepItems = [...dialog.querySelectorAll("[data-batch-step]")];
  const typeLabel = dialog.querySelector("#selection-batch-type-label");
  const contextType = dialog.querySelector("#selection-batch-context-type");
  const typePicker = dialog.querySelector("#selection-batch-type-picker");
  const templateTitle = dialog.querySelector("#selection-batch-template-title");
  const templateDesc = dialog.querySelector("#selection-batch-template-desc");
  const templateStatus = dialog.querySelector("#selection-batch-template-status");
  const downloadButton = dialog.querySelector("#selection-batch-download");
  const fileInput = dialog.querySelector("#selection-batch-file");
  const dropZone = dialog.querySelector("#selection-batch-drop-zone");
  const fileStatus = dialog.querySelector("#selection-batch-file-status");
  const validationPanel = dialog.querySelector("#selection-batch-validation");
  const actionButton = dialog.querySelector("#selection-batch-action");
  const templateMap = {
    "直发选品": { title:"直发选品｜Excel人工填报模板", description:"用于直发选品的采购来源型批量录入；选品方式由当前入口自动带入。", path:"./assets/templates/AIONE_SOURCE_IMPORT_TEMPLATE.xlsx", filename:"AIONE_直发选品_批量导入模板.xlsx" },
    "常规选品": { title:"常规选品｜Excel人工填报模板", description:"用于常规选品的采购来源型批量录入；员工只填写当前业务闭环真正需要的数据。", path:"./assets/templates/AIONE_SOURCE_IMPORT_TEMPLATE.xlsx", filename:"AIONE_常规选品_批量导入模板.xlsx" }
  };
  const state = { type:"", file:null, validated:false, created:false, records:[] };
  const selectedTemplate = () => state.type ? templateMap[state.type] : null;
  const setSteps = () => { let current=1;if(state.file)current=2;if(state.validated)current=3;if(state.created)current=4;stepItems.forEach((item)=>{const step=Number(item.dataset.batchStep);item.classList.toggle("is-done",step<current||state.created);item.classList.toggle("is-current",!state.created&&step===current);}); };
  const updateFileStatus = (message="", isError=false) => { fileStatus.hidden=!message;fileStatus.textContent=message;fileStatus.classList.toggle("is-error",isError); };
  const updateAction = () => { if(state.created){actionButton.disabled=false;actionButton.textContent="完成";return;}actionButton.disabled=!(state.type&&state.file);actionButton.textContent=state.validated?"确认批量创建":"校验Excel"; };
  const updateTemplate = () => { const config=selectedTemplate();typePicker.value=state.type||"";contextType.textContent=state.type||"待选择";if(!config){typeLabel.textContent="选品方式";templateTitle.textContent="等待选择选品方式";templateDesc.textContent="请选择直发选品或常规选品后匹配模板。";templateStatus.textContent="待匹配";templateStatus.classList.remove("is-ready");downloadButton.disabled=true;downloadButton.textContent="↓ 下载模板";return;}typeLabel.textContent=state.type;templateTitle.textContent=config.title;templateDesc.textContent=config.description;templateStatus.textContent="模板已匹配";templateStatus.classList.add("is-ready");downloadButton.disabled=false;downloadButton.textContent=`↓ 下载${state.type}模板`; };
  const resetAll = (type) => { state.type=["直发选品","常规选品"].includes(type)?type:"";state.file=null;state.validated=false;state.created=false;state.records=[];if(fileInput)fileInput.value="";updateFileStatus();validationPanel.hidden=true;validationPanel.className="selection-batch-validation";validationPanel.innerHTML="";updateTemplate();updateAction();setSteps(); };
  const acceptFile = (file) => { state.validated=false;state.created=false;state.records=[];validationPanel.hidden=true;const filename=String(file?.name||"");const extension=filename.slice(filename.lastIndexOf(".")).toLowerCase();if(![".xlsx",".csv"].includes(extension)){state.file=null;if(fileInput)fileInput.value="";updateFileStatus("文件格式不支持，请上传 .xlsx 或 .csv。",true);updateAction();setSteps();return;}state.file=file;const size=file.size>=1024*1024?`${(file.size/1024/1024).toFixed(1)} MB`:`${Math.max(1,Math.round(file.size/1024))} KB`;updateFileStatus(`已选择：${filename}｜${size}`);updateAction();setSteps(); };
  async function inspectFile() {
    const file=state.file;if(!file)return{ok:false,message:"尚未选择文件。"};const filename=String(file.name||"");const extension=filename.slice(filename.lastIndexOf(".")).toLowerCase();const size=file.size>=1024*1024?`${(file.size/1024/1024).toFixed(1)} MB`:`${Math.max(1,Math.round(file.size/1024))} KB`;let records=[];
    try { if(!window.XLSX)return{ok:false,message:"Excel解析组件未加载，请刷新页面后重试。"};if(extension===".csv"){const text=await file.text();const workbook=window.XLSX.read(text,{type:"string"});records=window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{defval:""});}else{const workbook=window.XLSX.read(await file.arrayBuffer(),{type:"array"});records=window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{defval:""});} } catch(error){console.error(error);return{ok:false,message:"Excel读取失败，请确认文件未损坏且使用AIONE模板。"};}
    records=records.filter((row)=>Object.values(row).some((value)=>String(value??"").trim()));if(!records.length)return{ok:false,message:"Excel中没有可创建的商品机会数据。",filename,size,rows:"0 条"};if(state.type){const missing=records.filter((row)=>!String(row["采购来源链接"]||row["采购来源网址"]||"").trim());if(missing.length)return{ok:false,message:`检测到 ${missing.length} 条数据缺少“采购来源链接”，请补充后重新上传。`,filename,size,rows:`${records.length} 条`};}
    return{ok:true,filename,size,rows:`${records.length} 条数据`,records,note:"已完成Excel真实解析与必填校验；确认后将写入当前浏览器的AIONE预演数据层。"};
  }
  function open(type="") { if(type && !["直发选品","常规选品"].includes(type))return;resetAll(type);if(typeof dialog.showModal==="function"){if(!dialog.open)dialog.showModal();}else dialog.setAttribute("open",""); }
  dialog.querySelectorAll("[data-selection-batch-close]").forEach((button)=>button.addEventListener("click",()=>dialog.close()));
  typePicker?.addEventListener("change",()=>{state.type=typePicker.value||"";state.validated=false;state.created=false;state.records=[];validationPanel.hidden=true;updateTemplate();updateAction();setSteps();});
  downloadButton?.addEventListener("click",()=>{const config=selectedTemplate();if(!config)return;const anchor=document.createElement("a");anchor.href=config.path;anchor.download=config.filename;document.body.appendChild(anchor);anchor.click();anchor.remove();showToast(`${state.type}｜模板下载已开始`);});
  fileInput?.addEventListener("change",()=>{const file=fileInput.files?.[0];if(file)acceptFile(file);});
  ["dragenter","dragover"].forEach((name)=>dropZone?.addEventListener(name,(event)=>{event.preventDefault();dropZone.classList.add("is-dragging");}));
  ["dragleave","drop"].forEach((name)=>dropZone?.addEventListener(name,(event)=>{event.preventDefault();dropZone.classList.remove("is-dragging");}));
  dropZone?.addEventListener("drop",(event)=>{const file=event.dataTransfer?.files?.[0];if(file)acceptFile(file);});
  actionButton?.addEventListener("click",async()=>{if(state.created){dialog.close();return;}if(!state.type||!state.file)return;if(!state.validated){actionButton.disabled=true;actionButton.textContent="校验中…";const result=await inspectFile();if(!result.ok){validationPanel.hidden=false;validationPanel.className="selection-batch-validation is-error";validationPanel.innerHTML=`<strong>校验发现问题</strong><br>${esc(result.message)}`;actionButton.disabled=false;actionButton.textContent="重新校验";setSteps();return;}state.validated=true;state.records=result.records||[];validationPanel.hidden=false;validationPanel.className="selection-batch-validation";validationPanel.innerHTML=`<strong>预检查通过（原型环境）</strong><br>选品方式：${esc(state.type)}｜文件：${esc(result.filename)}｜大小：${esc(result.size)}<br>数据量：${esc(result.rows)}<br>${esc(result.note)}`;updateAction();setSteps();return;}try{const created=importPreviewOpportunities(state.records,state.type);state.created=true;onCreated?.();validationPanel.hidden=false;validationPanel.className="selection-batch-validation is-created";validationPanel.innerHTML=`<strong>批量创建成功｜${created.length} 个商品机会</strong><br>已写入当前浏览器的AIONE预演数据层。`;showToast(`批量创建成功：${created.length} 个商品机会已保存到预演数据。`);updateAction();setSteps();}catch(error){console.error(error);validationPanel.hidden=false;validationPanel.className="selection-batch-validation is-error";validationPanel.innerHTML="<strong>批量创建失败</strong><br>请确认使用本地HTTP方式打开AIONE。";showToast("批量创建失败，请检查浏览器本地存储权限。");}});
  return { open };
}

function selectionNoImageHtml() {
  return `<span class="miwa-selection-no-image" aria-label="暂无商品图片"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2"></rect><circle cx="9" cy="10" r="1.5"></circle><path d="M5.5 17l4.2-4.2 3.2 3 2.2-2.2 3.4 3.4"></path></svg></span>`;
}
function listProductHtml(item) {
  const id = esc(item?.id || "");
  const image = item?.representativeImage?.url ? `<img src="${esc(item.representativeImage.url)}" alt="${esc(item.name || "商品图片")}" loading="lazy">` : selectionNoImageHtml();
  const source = item?.sourceUrl ? `<a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(selectionSourceLabel(item))} ↗</a>` : `<em>${esc(selectionSourceLabel(item))}</em>`;
  return `<div class="miwa-selection-list-product">
    <button type="button" class="miwa-selection-list-thumb" data-object-action="edit" data-object-id="${id}" aria-label="打开${esc(item.name || "商品")}">${image}</button>
    <span><button type="button" class="miwa-selection-product-name" data-object-action="edit" data-object-id="${id}">${esc(item.name)}</button><small>${esc(item.id)} · ${esc(item.type)} · ${source}</small></span>
  </div>`;
}


const SELECTION_STATUS_OPTIONS=Object.freeze([
  {value:"ongoing",label:"进行中"},
  {value:"pending",label:"待判断"},
  {value:"passed",label:"已通过"},
  {value:"rejected",label:"已淘汰"}
]);
const SELECTION_GROUP_OPTIONS=Object.freeze([
  {value:"type",label:"选品方式",field:"type"},
  {value:"stage",label:"当前阶段",getter:(item)=>item.stageName||"待确认"},
  {value:"owner",label:"负责人",field:"owner"},
  {value:"result",label:"结果",getter:(item)=>selectionResultLabel(item)}
]);
function selectionStatusLabel(item){return ({ongoing:"进行中",pending:"待判断",passed:"已通过",rejected:"已淘汰"})[selectionStatus(item)]||"进行中";}
function selectionInteractionHtml(item){
  const id=esc(item?.id||"");
  return `<div class="miwa-object-interactions" aria-label="对象互动">
    <button type="button" data-selection-object-action="like" data-object-id="${id}" title="点赞">👍 <span>点赞</span></button>
    <button type="button" data-selection-object-action="follow" data-object-id="${id}" title="关注">☆ <span>关注</span></button>
    <button type="button" data-selection-object-action="favorite" data-object-id="${id}" title="收藏">♡ <span>收藏</span></button>
    <button type="button" data-selection-object-action="comment" data-object-id="${id}" title="评论">💬 <span>评论</span></button>
    <button type="button" data-selection-object-action="share" data-object-id="${id}" title="转发">↗ <span>转发</span></button>
  </div>`;
}
function selectionStats(items=[]){
  const rows=Array.isArray(items)?items:[];
  const count=(status)=>rows.filter((item)=>selectionStatus(item)===status).length;
  return {all:rows.length,ongoing:count("ongoing"),pending:count("pending"),passed:count("passed"),rejected:count("rejected"),money:rows.reduce((sum,item)=>sum+Number(item.cost||0),0)};
}
function selectionStatsHtml(items,totalLabel="商品机会总数",activeStatus=""){
  const stats=selectionStats(items);
  const chips=[["",totalLabel,stats.all],["ongoing","进行中",stats.ongoing],["pending","待判断",stats.pending],["passed","已通过",stats.passed],["rejected","已淘汰",stats.rejected]];
  return `${chips.map(([key,label,value])=>`<button type="button" class="selection-stat-chip${String(activeStatus||"")===key?" is-active":""}" data-selection-workspace-stat="${esc(key)}"><span>${esc(label)}</span><strong>${value}</strong></button>`).join("")}<span class="selection-stat-chip selection-stat-chip--money"><span>选品费用</span><strong>${esc(selectionMoney(stats.money))}</strong></span>`;
}
function selectionListFields(){
  return [
    {label:"商品",renderHtml:listProductHtml,className:"miwa-selection-list-primary"},
    {label:selectionFieldLabel("owner","负责人"),value:(item)=>item.owner},
    {label:selectionFieldLabel("stageName","当前事项"),value:(item)=>item.stageName},
    {label:selectionFieldLabel("platforms","销售平台"),value:(item)=>selectionPlatformLabel(item)},
    {label:selectionFieldLabel("time","时间"),value:(item)=>item.time},
    {label:selectionFieldLabel("result","结果"),value:(item)=>selectionResultLabel(item)}
  ];
}
function selectionCardFields(){
  return [
    {label:selectionFieldLabel("owner","负责人"),value:(item)=>item.owner},
    {label:selectionFieldLabel("stageName","当前事项"),value:(item)=>item.stageName},
    {label:selectionFieldLabel("platforms","销售平台"),value:(item)=>selectionPlatformLabel(item)},
    {label:selectionFieldLabel("time","时间"),value:(item)=>item.time},
    {label:selectionFieldLabel("result","结果"),value:(item)=>selectionResultLabel(item)}
  ];
}
function selectionActionMenuHtml(item){
  const id=esc(item?.id||"");
  return `<details class="miwa-object-action-menu"><summary aria-label="对象操作" title="对象操作">⋯</summary><div class="miwa-object-action-menu__panel" role="menu">
    <button type="button" role="menuitem" data-object-action="edit" data-object-id="${id}">编辑</button>
    <span class="miwa-object-action-menu__separator" aria-hidden="true"></span>
    <button type="button" role="menuitem" data-object-action="like" data-object-id="${id}">点赞</button>
    <button type="button" role="menuitem" data-object-action="follow" data-object-id="${id}">关注</button>
    <button type="button" role="menuitem" data-object-action="favorite" data-object-id="${id}">收藏</button>
    <button type="button" role="menuitem" data-object-action="comment" data-object-id="${id}">评论</button>
    <button type="button" role="menuitem" data-object-action="share" data-object-id="${id}">转发</button>
    <span class="miwa-object-action-menu__separator" aria-hidden="true"></span>
    <button type="button" role="menuitem" class="is-danger" data-object-action="delete" data-object-id="${id}">删除</button>
  </div></details>`;
}
function selectionObjectActions(){return [{key:"menu",label:"操作",renderHtml:selectionActionMenuHtml}];}
function downloadSelectionCsv(items=[]){
  const headers=["机会ID","商品名称","选品方式","负责人","当前事项","销售平台","时间","结果","选品费用"];
  const rows=items.map((item)=>[item.id,item.name,item.type,item.owner,item.stageName,selectionPlatformLabel(item),item.time,selectionResultLabel(item),Number(item.cost||0)]);
  const cell=(value)=>`"${String(value??"").replaceAll('"','""')}"`;
  const csv="\uFEFF"+[headers,...rows].map((row)=>row.map(cell).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const link=document.createElement("a");link.href=url;link.download=`AIONE_商品机会_${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}

function compactSelectionWorkspaceToolbar(workspace){
  const toolbar=workspace?.section?.querySelector(".miwa-universal-workspace__toolbar");
  if(!toolbar || toolbar.dataset.selectionCompactReady==="true") return ()=>{};
  toolbar.dataset.selectionCompactReady="true";
  const filterGroup=toolbar.querySelector("[data-workspace-filter-group]");
  const group=toolbar.querySelector("[data-workspace-group]");
  const sort=toolbar.querySelector("[data-workspace-sort]");
  const view=toolbar.querySelector("[data-workspace-view-switch]");
  const columns=toolbar.querySelector("[data-card-column-switch]");
  const importButton=toolbar.querySelector("[data-workspace-import]");
  const importFile=toolbar.querySelector("[data-workspace-import-file]");
  const exportButton=toolbar.querySelector("[data-workspace-export]");
  const resetButton=toolbar.querySelector("[data-workspace-reset]");
  const filterMenu=document.createElement("details");filterMenu.className="selection-workspace-menu selection-workspace-filter-menu";filterMenu.innerHTML='<summary>筛选 <span data-selection-filter-count hidden></span></summary><div class="selection-workspace-menu__panel"></div>';
  const filterPanel=filterMenu.querySelector(".selection-workspace-menu__panel");if(filterGroup)filterPanel.append(filterGroup);
  const moreMenu=document.createElement("details");moreMenu.className="selection-workspace-menu selection-workspace-more-menu";moreMenu.innerHTML='<summary>更多</summary><div class="selection-workspace-menu__panel"></div>';
  const morePanel=moreMenu.querySelector(".selection-workspace-menu__panel");[importButton,importFile,exportButton,columns,resetButton].filter(Boolean).forEach((node)=>morePanel.append(node));
  const search=toolbar.querySelector(".miwa-object-search");
  toolbar.replaceChildren(...[search,filterMenu,group,sort,view,moreMenu].filter(Boolean));
  return (state)=>{
    const count=Object.values(state?.filters||{}).filter(Boolean).length;const badge=filterMenu.querySelector("[data-selection-filter-count]");if(badge){badge.hidden=!count;badge.textContent=String(count);}
  };
}

export function mountSelectionObjectWorkspace(parent,{itemsProvider=loadSelectionItems,pageId="selection-object-workspace",title="商品机会一览",description="同一商品机会对象通过列表、卡片和详情视图展示。",totalLabel="商品机会总数",hideHeader=false}={}){
  if(!parent)return null;
  const policy=getObjectPolicies();
  let allItems=Array.isArray(itemsProvider?.())?itemsProvider():[];
  let visibleRows=[];
  const portal=document.createElement("div");portal.className="miwa-level2-portal";parent.appendChild(portal);
  const portalState=createSelectionPortal(portal);
  let toastTimer=null;
  const showToast=(text)=>{const node=portalState?.toast;if(!node)return;node.textContent=text;node.classList.add("is-visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove("is-visible"),2400);};
  const refreshItems=()=>{allItems=Array.isArray(itemsProvider?.())?itemsProvider():[];workspace?.setFilterOptions("owner",getSelectionOwners(allItems),workspace?.getState().filters.owner||"");renderObjects();};
  const batchImport=initBatchImport(portalState,showToast,refreshItems);
  let workspace=null;
  workspace=createUniversalWorkspace(parent,{
    pageId,title,description,
    searchPlaceholder:"搜索商品 / 机会ID / 负责人 / 来源",
    filters:[
      {key:"type",label:"选品方式",allLabel:"全部选品方式",options:["直发选品","常规选品"]},
      {key:"status",label:"状态",allLabel:"全部状态",options:SELECTION_STATUS_OPTIONS},
      {key:"owner",label:"负责人",allLabel:"全部负责人",options:getSelectionOwners(allItems)},
      {key:"time",label:"时间范围",allLabel:"全部时间",options:[{value:"today",label:"今天"},{value:"7d",label:"近7天"},{value:"month",label:"本月"}]}
    ],
    groupOptions:SELECTION_GROUP_OPTIONS,
    sortOptions:SELECTION_SORT_OPTIONS,
    views:["card","list"],
    defaultView:"list",
    cardColumns:[3,4],
    defaultCardColumns:3,
    allowImport:policy.importAllowed,
    allowExport:policy.exportAllowed,
    pageSize:12,
    onImportRequest:()=>batchImport?.open(""),
    onExportRequest:()=>downloadSelectionCsv(visibleRows),
    onStateChange:()=>renderObjects()
  });
  const syncCompactToolbar=compactSelectionWorkspaceToolbar(workspace);
  if(hideHeader)workspace.section.querySelector(".miwa-level2-block__head")?.classList.add("is-visually-removed");
  const statBar=document.createElement("div");statBar.className="selection-selection-stats selection-selection-stats--workspace";
  const head=workspace.section.querySelector(".miwa-level2-block__head");
  (head||workspace.section.firstElementChild)?.insertAdjacentElement("afterend",statBar);

  function filteredRows(){
    const state=workspace.getState();
    const status=state.filters.status||"";
    const baseState={...state,filters:{...state.filters,status:""}};
    const rows=filterSelectionItems(allItems,baseState,"").filter((item)=>!status||selectionStatus(item)===status);
    return workspace.sortItems(rows);
  }
  function renderStats(){
    const active=workspace.getState().filters.status||"";
    statBar.innerHTML=selectionStatsHtml(allItems,totalLabel,active);
  }
  function renderObjects(){
    visibleRows=filteredRows();renderStats();syncCompactToolbar(workspace.getState());
    if(!visibleRows.length){workspace.setCount(0);if(allItems.length)workspace.showNoResults();else workspace.showEmpty("暂无商品机会","商品机会对象接入真实数据后将在这里统一展示。");return;}
    workspace.hideState();
    const page=workspace.paginateItems(visibleRows);
    const groups=workspace.getState().group?workspace.groupItems(page.rows):null;
    const view=workspace.getState().view;
    if(view==="list"){
      const table=workspace.getTableNodes("list");
      renderObjectList(table.head,table.body,page.rows,{fields:selectionListFields(),groups,actions:selectionObjectActions()});
    }else{
      const host=workspace.getViewHost("card");
      renderObjectCards(host,page.rows,{groups,title:(item)=>item.name,type:(item)=>item.type,state:(item)=>selectionStatusLabel(item),image:(item)=>item?.representativeImage?.url||"",emptyVisualHtml:()=>selectionNoImageHtml(),fields:selectionCardFields(),actions:selectionObjectActions()});
    }
  }
  workspace.section.addEventListener("click",(event)=>{
    const stat=event.target.closest("[data-selection-workspace-stat]");
    if(stat){workspace.setFilter(stat.dataset.selectionWorkspaceStat||"","status");return;}
    const interaction=event.target.closest("[data-selection-object-action]");
    if(interaction){showToast(`${({like:"点赞",follow:"关注",favorite:"收藏",comment:"评论",share:"转发"})[interaction.dataset.selectionObjectAction]||"对象互动"}已预留统一对象能力；正式接口接入前不写入假数据。`);return;}
    const action=event.target.closest("[data-object-action]");
    if(!action)return;
    const item=allItems.find((row)=>String(row.id)===String(action.dataset.objectId));if(!item)return;
    action.closest("details")?.removeAttribute("open");
    if(["like","follow","favorite","comment","share"].includes(action.dataset.objectAction)){showToast(`${({like:"点赞",follow:"关注",favorite:"收藏",comment:"评论",share:"转发"})[action.dataset.objectAction]}已预留统一对象能力；正式接口接入前不写入假数据。`);return;}
    if(action.dataset.objectAction==="delete"){if(window.confirm(`确认删除商品机会「${item.name}」吗？`)){removePreviewOpportunity(item.id);refreshItems();showToast("商品机会已删除。")};return;}
    if(action.dataset.objectAction==="edit")openSelectionRecordDetail({id:item.id,type:item.type,mode:"edit"});
  });
  window.addEventListener("aione:global-settings-updated",refreshItems);
  renderObjects();
  return {workspace,refresh:refreshItems,getVisibleRows:()=>[...visibleRows],openBatch:(type="")=>batchImport?.open(type)};
}

function focusRequestedWorkbenchArea(target) {
  const params = new URLSearchParams(window.location.search);
  if (params.get("focus") !== "opportunity-overview" || !target) return;
  requestAnimationFrame(() => {
    const desktopHeader = document.getElementById("desktop-header-host");
    const mobileTop = document.getElementById("mobile-topbar-host");
    const mobileInfo = document.getElementById("mobile-info-host");
    const desktopHeight = desktopHeader && getComputedStyle(desktopHeader).display !== "none" ? desktopHeader.getBoundingClientRect().height : 0;
    const mobileHeight = (mobileTop && getComputedStyle(mobileTop).display !== "none" ? mobileTop.getBoundingClientRect().height : 0) + (mobileInfo && getComputedStyle(mobileInfo).display !== "none" ? mobileInfo.getBoundingClientRect().height : 0);
    const top = target.getBoundingClientRect().top + window.scrollY - Math.max(desktopHeight, mobileHeight) - 14;
    window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    const clean = new URL(window.location.href); clean.searchParams.delete("focus"); history.replaceState(null, "", `${clean.pathname}${clean.search}${clean.hash}`);
  });
}

export async function initSelectionWorkbench() {
  const entry = document.getElementById("miwa-selection-template-entry");
  if (!entry) return false;
  if (!getTemplateRecipe("standard-business")) throw new Error("标准业务母版Recipe未注册");

  const base = await mountLevel2EmptyBase(entry, {
    routeId:"selection",
    recipeId:"standard-business",
    pageKind:"business",
    evidenceScope:"selection-workbench"
  });

  // 商品机会一览与“我的选品”共用同一对象工作区，只改变数据视图范围。
  const browser=mountSelectionObjectWorkspace(base.main,{
    itemsProvider:loadSelectionItems,
    pageId:"selection-opportunity-list-reopt-v1",
    title:"商品机会一览",
    description:"公司共享的商品机会对象工作区。搜索、筛选、分组、排序、列表/卡片、重置、编辑与对象互动统一复用。",
    totalLabel:"商品机会总数"
  });

  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{
    state:"light",
    kicker:"当前工作台",
    title:"全部选品",
    text:"这里集中查看公司共享的商品机会对象；点击商品图片或名称进入对象详情。"
  }}));

  focusRequestedWorkbenchArea(browser?.workspace?.section);
  return true;
}
