import { mountLevel2EmptyBase } from "../templates/level2-empty-base.js";
import { getTemplateRecipe } from "../templates/template-registry.js";
import { renderPageHeader } from "../components/page-header.js";
import { createLevel2Block } from "../components/level2-block.js";
import { renderTypeRail } from "../components/type-rail.js";
import { renderFlow } from "../components/flow-component.js";
import { renderCoreMetrics } from "../components/core-metrics.js";
import { createUniversalWorkspace } from "../components/universal-workspace.js";
import { renderObjectCards, renderObjectList } from "../components/object-presenter.js";
import { renderMiwaNineElements } from "../components/miwa-nine-elements.js";
import { bindHorizontalRails } from "../components/horizontal-rail.js";
import { getActiveSystemParameters } from "../shell/system-settings.js";
import { getFieldSchema } from "../config/field-registry.js";
import { importPreviewOpportunities } from "../data/preview-opportunities.js";
import {
  SELECTION_TYPES,
  SELECTION_STAGES,
  SELECTION_SORT_OPTIONS,
  loadSelectionItems,
  getSelectionOwners,
  getSelectionTypeCards,
  getSelectionFlowSteps,
  getSelectionMetrics,
  filterSelectionItems,
  selectionPlatformLabel,
  selectionSourceLabel,
  selectionMoney,
  selectionResultLabel,
  selectionResultTone,
  createPreviewOpportunityId,
  formatLocalDateTime
} from "../data/selection-workbench-adapter.js";

const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
const stageState = { value: "" };

const SELECTION_FIELD_MAP = new Map(getFieldSchema("selection").map((field) => [field.key, field]));
const selectionFieldLabel = (key, fallback = key) => SELECTION_FIELD_MAP.get(key)?.label || fallback;

function getObjectPolicies() {
  const params = getActiveSystemParameters?.() || {};
  return {
    createAllowed: params.permissions?.allowCreate !== false,
    importAllowed: params.permissions?.allowImport !== false && (params.io?.allowCsv !== false || params.io?.allowExcel !== false),
    exportAllowed: params.permissions?.allowExport !== false
  };
}

function openSelectionRecordDetail({ id, type = "", mode = "edit" } = {}) {
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

function createSelectionPortal(portal) {
  if (!portal) return null;
  portal.innerHTML = `
    <dialog class="selection-batch-dialog" id="selection-batch-dialog" aria-labelledby="selection-batch-title">
      <div class="selection-batch-dialog__body">
        <div class="selection-batch-dialog__head">
          <div><small>批量导入商品机会</small><h2 id="selection-batch-title"><span id="selection-batch-type-label">选品类型</span>｜批量导入</h2><p>业务类型由当前入口自动确定。下载对应模板、填写后上传；校验通过后批量创建商品机会。</p></div>
          <button class="selection-batch-dialog__close" type="button" data-selection-batch-close aria-label="关闭">×</button>
        </div>
        <div class="selection-batch-context"><span>当前业务类型</span><strong id="selection-batch-context-type">待选择</strong><small>由选品类型自动带入</small></div>
        <div class="selection-batch-steps" aria-label="批量导入步骤">
          <div class="selection-batch-step is-current" data-batch-step="1"><b>01 下载模板</b><span>获取当前类型Excel</span></div>
          <div class="selection-batch-step" data-batch-step="2"><b>02 上传校验</b><span>检查格式与缺失项</span></div>
          <div class="selection-batch-step" data-batch-step="3"><b>03 批量创建</b><span>生成商品机会记录</span></div>
        </div>
        <section class="selection-batch-template" aria-label="Excel模板下载">
          <div class="selection-batch-template__info"><span class="selection-batch-template__icon" aria-hidden="true">X</span><div><div class="selection-batch-template__title-line"><strong id="selection-batch-template-title">等待业务类型</strong><span id="selection-batch-template-status">待匹配</span></div><p id="selection-batch-template-desc">选择业务类型后自动匹配模板。</p></div></div>
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

function initBatchImport(portalState, showToast, onCreated) {
  const dialog = portalState?.dialog;
  if (!dialog) return null;
  const stepItems = [...dialog.querySelectorAll("[data-batch-step]")];
  const typeLabel = dialog.querySelector("#selection-batch-type-label");
  const contextType = dialog.querySelector("#selection-batch-context-type");
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
    "直发选品": { title:"直发选品｜Excel人工填报模板", description:"用于直发选品的采购来源型批量录入；业务类型由当前入口自动带入。", path:"./assets/templates/AIONE_SOURCE_IMPORT_TEMPLATE.xlsx", filename:"AIONE_直发选品_批量导入模板.xlsx" },
    "常规选品": { title:"常规选品｜Excel人工填报模板", description:"用于常规选品的采购来源型批量录入；员工只填写当前业务闭环真正需要的数据。", path:"./assets/templates/AIONE_SOURCE_IMPORT_TEMPLATE.xlsx", filename:"AIONE_常规选品_批量导入模板.xlsx" },
    "产品开发": { title:"产品开发｜Excel人工填报模板", description:"产品开发不强制采购来源链接，模板以开发需求名称、参考资料和开发要求为核心。", path:"./assets/templates/AIONE_PRODUCT_DEV_IMPORT_TEMPLATE.xlsx", filename:"AIONE_产品开发_批量导入模板.xlsx" }
  };
  const state = { type:"", file:null, validated:false, created:false, records:[] };
  const selectedTemplate = () => state.type ? templateMap[state.type] : null;
  const setSteps = () => { let current=1;if(state.file)current=2;if(state.validated)current=3;if(state.created)current=4;stepItems.forEach((item)=>{const step=Number(item.dataset.batchStep);item.classList.toggle("is-done",step<current||state.created);item.classList.toggle("is-current",!state.created&&step===current);}); };
  const updateFileStatus = (message="", isError=false) => { fileStatus.hidden=!message;fileStatus.textContent=message;fileStatus.classList.toggle("is-error",isError); };
  const updateAction = () => { if(state.created){actionButton.disabled=false;actionButton.textContent="完成";return;}actionButton.disabled=!(state.type&&state.file);actionButton.textContent=state.validated?"确认批量创建":"校验Excel"; };
  const updateTemplate = () => { const config=selectedTemplate();if(!config)return;typeLabel.textContent=state.type;contextType.textContent=state.type;templateTitle.textContent=config.title;templateDesc.textContent=config.description;templateStatus.textContent="模板已匹配";templateStatus.classList.add("is-ready");downloadButton.disabled=false;downloadButton.textContent=`↓ 下载${state.type}模板`; };
  const resetAll = (type) => { state.type=SELECTION_TYPES.includes(type)?type:"";state.file=null;state.validated=false;state.created=false;state.records=[];if(fileInput)fileInput.value="";updateFileStatus();validationPanel.hidden=true;validationPanel.className="selection-batch-validation";validationPanel.innerHTML="";updateTemplate();updateAction();setSteps(); };
  const acceptFile = (file) => { state.validated=false;state.created=false;state.records=[];validationPanel.hidden=true;const filename=String(file?.name||"");const extension=filename.slice(filename.lastIndexOf(".")).toLowerCase();if(![".xlsx",".csv"].includes(extension)){state.file=null;if(fileInput)fileInput.value="";updateFileStatus("文件格式不支持，请上传 .xlsx 或 .csv。",true);updateAction();setSteps();return;}state.file=file;const size=file.size>=1024*1024?`${(file.size/1024/1024).toFixed(1)} MB`:`${Math.max(1,Math.round(file.size/1024))} KB`;updateFileStatus(`已选择：${filename}｜${size}`);updateAction();setSteps(); };
  async function inspectFile() {
    const file=state.file;if(!file)return{ok:false,message:"尚未选择文件。"};const filename=String(file.name||"");const extension=filename.slice(filename.lastIndexOf(".")).toLowerCase();const size=file.size>=1024*1024?`${(file.size/1024/1024).toFixed(1)} MB`:`${Math.max(1,Math.round(file.size/1024))} KB`;let records=[];
    try { if(!window.XLSX)return{ok:false,message:"Excel解析组件未加载，请刷新页面后重试。"};if(extension===".csv"){const text=await file.text();const workbook=window.XLSX.read(text,{type:"string"});records=window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{defval:""});}else{const workbook=window.XLSX.read(await file.arrayBuffer(),{type:"array"});records=window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{defval:""});} } catch(error){console.error(error);return{ok:false,message:"Excel读取失败，请确认文件未损坏且使用AIONE模板。"};}
    records=records.filter((row)=>Object.values(row).some((value)=>String(value??"").trim()));if(!records.length)return{ok:false,message:"Excel中没有可创建的商品机会数据。",filename,size,rows:"0 条"};if(state.type!=="产品开发"){const missing=records.filter((row)=>!String(row["采购来源链接"]||row["采购来源网址"]||"").trim());if(missing.length)return{ok:false,message:`检测到 ${missing.length} 条数据缺少“采购来源链接”，请补充后重新上传。`,filename,size,rows:`${records.length} 条`};}
    return{ok:true,filename,size,rows:`${records.length} 条数据`,records,note:"已完成Excel真实解析与必填校验；确认后将写入当前浏览器的AIONE预演数据层。"};
  }
  function open(type) { if(!SELECTION_TYPES.includes(type))return;resetAll(type);if(typeof dialog.showModal==="function"){if(!dialog.open)dialog.showModal();}else dialog.setAttribute("open",""); }
  dialog.querySelectorAll("[data-selection-batch-close]").forEach((button)=>button.addEventListener("click",()=>dialog.close()));
  downloadButton?.addEventListener("click",()=>{const config=selectedTemplate();if(!config)return;const anchor=document.createElement("a");anchor.href=config.path;anchor.download=config.filename;document.body.appendChild(anchor);anchor.click();anchor.remove();showToast(`${state.type}｜模板下载已开始`);});
  fileInput?.addEventListener("change",()=>{const file=fileInput.files?.[0];if(file)acceptFile(file);});
  ["dragenter","dragover"].forEach((name)=>dropZone?.addEventListener(name,(event)=>{event.preventDefault();dropZone.classList.add("is-dragging");}));
  ["dragleave","drop"].forEach((name)=>dropZone?.addEventListener(name,(event)=>{event.preventDefault();dropZone.classList.remove("is-dragging");}));
  dropZone?.addEventListener("drop",(event)=>{const file=event.dataTransfer?.files?.[0];if(file)acceptFile(file);});
  actionButton?.addEventListener("click",async()=>{if(state.created){dialog.close();return;}if(!state.type||!state.file)return;if(!state.validated){actionButton.disabled=true;actionButton.textContent="校验中…";const result=await inspectFile();if(!result.ok){validationPanel.hidden=false;validationPanel.className="selection-batch-validation is-error";validationPanel.innerHTML=`<strong>校验发现问题</strong><br>${esc(result.message)}`;actionButton.disabled=false;actionButton.textContent="重新校验";setSteps();return;}state.validated=true;state.records=result.records||[];validationPanel.hidden=false;validationPanel.className="selection-batch-validation";validationPanel.innerHTML=`<strong>预检查通过（原型环境）</strong><br>业务类型：${esc(state.type)}｜文件：${esc(result.filename)}｜大小：${esc(result.size)}<br>数据量：${esc(result.rows)}<br>${esc(result.note)}`;updateAction();setSteps();return;}try{const created=importPreviewOpportunities(state.records,state.type);state.created=true;onCreated?.();validationPanel.hidden=false;validationPanel.className="selection-batch-validation is-created";validationPanel.innerHTML=`<strong>批量创建成功｜${created.length} 个商品机会</strong><br>已写入当前浏览器的AIONE预演数据层。`;showToast(`批量创建成功：${created.length} 个商品机会已保存到预演数据。`);updateAction();setSteps();}catch(error){console.error(error);validationPanel.hidden=false;validationPanel.className="selection-batch-validation is-error";validationPanel.innerHTML="<strong>批量创建失败</strong><br>请确认使用本地HTTP方式打开AIONE。";showToast("批量创建失败，请检查浏览器本地存储权限。");}});
  return { open };
}

function listProductHtml(item) {
  const image = item?.representativeImage?.url ? `<img src="${esc(item.representativeImage.url)}" alt="" loading="lazy">` : `<span>${esc(String(item.name || "商").slice(0,1))}</span>`;
  const source = item?.sourceUrl ? `<a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(selectionSourceLabel(item))} ↗</a>` : `<em>${esc(selectionSourceLabel(item))}</em>`;
  return `<div class="miwa-selection-list-product"><span class="miwa-selection-list-thumb">${image}</span><span><strong>${esc(item.name)}</strong><small>${esc(item.id)} · ${esc(item.type)} · ${source}</small></span></div>`;
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
  let items = loadSelectionItems();
  const policy = getObjectPolicies();
  const base = await mountLevel2EmptyBase(entry, { routeId:"selection", recipeId:"standard-business", pageKind:"business", evidenceScope:"selection-workbench" });
  renderPageHeader(base.pageHeader, {
    icon:"选",
    title:"选品工作台",
    description:"先统一选品思维与任务执行，再通过商品机会进入数据、成本、定价和上架判断；测样按需辅助判断。",
    actions:[
      { key:"overview", label:"选品概览", href:"#/selection/overview" },
      { key:"create", label:"＋ 新建商品机会", primary:true, disabled:!policy.createAllowed },
      { key:"tasks", label:"选品任务", href:"#/selection/tasks" }
    ]
  });

  const typeBlock = createLevel2Block(base.main,{id:"selection-type-block",title:"选品类型",description:"查看各类型现有商品机会；需要开始新选品工作时，可直接新建或批量导入。",railTarget:"selection-type-track"});
  typeBlock.body.id="selection-type-track";
  const flowBlock = createLevel2Block(base.main,{id:"selection-flow-block",title:"选品业务流程",description:"商品机会从形成到上架判断的统一主流程；测样属于按需验证任务，不占固定主流程节点。",status:"已确认",locked:true});
  const metricBlock = createLevel2Block(base.main,{id:"selection-metrics-block",title:"核心指标",description:"用真实业务数据快速判断当前选品工作的数量、结果、进度与投入。",railTarget:"selection-metrics"});
  metricBlock.body.id="selection-metrics";

  const workspace = createUniversalWorkspace(base.main,{
    pageId:"selection",
    title:"商品机会",
    description:"同一商品机会数据统一用于卡片、列表、搜索、筛选、排序、导入、导出和分页。",
    searchPlaceholder:"搜索商品 / 机会ID / 负责人",
    filters:[
      {key:"type",label:"选品类型",allLabel:"全部选品类型",options:SELECTION_TYPES},
      {key:"status",label:"状态",allLabel:"全部状态",options:[{value:"ongoing",label:"进行中"},{value:"decided",label:"已判断"}]},
      {key:"owner",label:"负责人",allLabel:"全部负责人",options:getSelectionOwners(items)},
      {key:"time",label:"时间范围",allLabel:"全部时间",options:[{value:"today",label:"今天"},{value:"7d",label:"近7天"},{value:"month",label:"本月"}]}
    ],
    sortOptions:SELECTION_SORT_OPTIONS,
    views:["card","list"],
    defaultView:"card",
    cardColumns:[3,4,6],
    defaultCardColumns:3,
    allowImport:policy.importAllowed,
    allowExport:policy.exportAllowed,
    pageSize:12,
    onStateChange:()=>renderAll(),
    onImportRequest:()=>{
      const type=workspace.getState().filters.type||"";
      if(!type){typeBlock.section.scrollIntoView({behavior:"smooth",block:"center"});showToast("请先选择直发选品、常规选品或产品开发，再导入商品机会。");return;}
      batchImport?.open(type);
    },
    onExportRequest:()=>exportCurrent()
  });

  renderMiwaNineElements(base.nineElements,{context:"选品业务"});
  const portalState=createSelectionPortal(base.portal);
  let toastTimer=null;
  function showToast(text){const node=portalState?.toast;if(!node)return;node.textContent=text;node.classList.add("is-visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove("is-visible"),2200);}
  const batchImport=initBatchImport(portalState,showToast,()=>{items=loadSelectionItems();workspace.setFilterOptions("owner",getSelectionOwners(items),workspace.getState().filters.owner||"");renderAll();});

  function renderTypes(){renderTypeRail(typeBlock.body,getSelectionTypeCards(items,workspace.getState().filters.type||""),{maxVisible:3,actions:[{key:"create",label:"＋ 新建商品机会",disabled:()=>!getObjectPolicies().createAllowed},{key:"import",label:"⇧ 批量导入",disabled:()=>!getObjectPolicies().importAllowed}]});}
  function renderFlowBlock(){renderFlow(flowBlock.body,getSelectionFlowSteps(items,stageState.value),{activeKey:stageState.value,clickable:true});}
  function renderMetrics(){renderCoreMetrics(metricBlock.body,getSelectionMetrics(items),{maxVisible:6});}
  function allVisibleRows(){const filtered=filterSelectionItems(items,workspace.getState(),stageState.value);return workspace.sortItems(filtered);}
  function renderObjects(){
    const allRows=allVisibleRows();
    if(!allRows.length){workspace.setCount(0);if(items.length)workspace.showNoResults();else workspace.showEmpty("暂无商品机会","可使用新建商品机会或批量导入开始真实业务验证。");return;}
    workspace.hideState();
    const page=workspace.paginateItems(allRows);
    if(workspace.nodes.range){const currentCost=allRows.reduce((sum,item)=>sum+Number(item.cost||0),0);workspace.nodes.range.textContent=`当前显示 ${page.start}–${page.end} / ${page.total} 项 · 当前投入成本 ${selectionMoney(currentCost)}`;}
    const cardHost=workspace.getViewHost("card");
    renderObjectCards(cardHost,page.rows,{
      variant:"rich-media",
      objectName:"商品机会",
      title:(item)=>item.name,
      type:(item)=>item.type,
      state:(item)=>item.stageName||"商品机会",
      image:(item)=>item.representativeImage?.url||"",
      metaFields:[
        {label:selectionFieldLabel("id","机会ID"),value:(item)=>item.id},
        {label:selectionFieldLabel("source","采购来源"),value:(item)=>selectionSourceLabel(item)},
        {label:selectionFieldLabel("elements","美和9要素"),value:(item)=>item.elements||"待确认"}
      ],
      goal:()=>"完成该商品机会的选品判断，确认是否值得继续推进。",
      fields:[
        {label:selectionFieldLabel("owner","选品负责人"),value:(item)=>item.owner},
        {label:selectionFieldLabel("stageName","当前事项"),value:(item)=>item.stageName},
        {label:selectionFieldLabel("platforms","销售平台"),value:(item)=>selectionPlatformLabel(item)},
        {label:selectionFieldLabel("time","选品时间"),value:(item)=>item.time},
        {label:selectionFieldLabel("cost","投入成本"),value:(item)=>selectionMoney(item.cost)},
        {label:selectionFieldLabel("info","信息状态"),value:(item)=>item.info||"待确认"}
      ],
      result:(item)=>({label:selectionResultLabel(item),tone:selectionResultTone(item),reason:item.rule||"待补充判断依据"}),
      actions:[
        {key:"edit",label:"编辑"},
        {key:"elements",label:"查看9要素"},
        {key:"source",label:"采购来源 ↗",href:(item)=>item.sourceUrl||"",external:true,visible:(item)=>Boolean(item.sourceUrl)}
      ]
    });
    const table=workspace.getTableNodes("list");
    renderObjectList(table.head,table.body,page.rows,{
      fields:[
        {label:"商品信息摘要",renderHtml:listProductHtml,className:"miwa-selection-list-primary"},
        {label:selectionFieldLabel("owner","负责人"),value:(item)=>item.owner},
        {label:selectionFieldLabel("stageName","当前事项"),value:(item)=>item.stageName},
        {label:selectionFieldLabel("platforms","平台"),value:(item)=>selectionPlatformLabel(item)},
        {label:selectionFieldLabel("time","时间"),value:(item)=>item.time},
        {label:selectionFieldLabel("cost","投入成本"),value:(item)=>selectionMoney(item.cost)},
        {label:selectionFieldLabel("info","信息"),value:(item)=>item.info||"待确认"},
        {label:selectionFieldLabel("result","结果"),value:(item)=>selectionResultLabel(item)}
      ],
      actions:[{key:"edit",label:"编辑"},{key:"elements",label:"9要素"}]
    });
  }
  function renderAll(){renderTypes();renderFlowBlock();renderMetrics();renderObjects();bindHorizontalRails(base.root);}
  function exportCurrent(){
    if(!getObjectPolicies().exportAllowed){showToast("导出已由系统参数关闭");return;}
    const rows=allVisibleRows();const quote=(value)=>`"${String(value??"").replaceAll('"','""')}"`;const fields=[[selectionFieldLabel("name","商品名称"),"name"],[selectionFieldLabel("id","商品机会ID"),"id"],[selectionFieldLabel("type","选品类型"),"type"],[selectionFieldLabel("owner","负责人"),"owner"],[selectionFieldLabel("stageName","当前事项"),"stageName"],[selectionFieldLabel("platforms","平台"),"platform"],[selectionFieldLabel("time","时间"),"time"],[selectionFieldLabel("cost","投入成本"),"cost"],[selectionFieldLabel("info","信息"),"info"],[selectionFieldLabel("result","结果"),"result"]];const lines=[fields.map(([label])=>quote(label)).join(",")];rows.forEach((item)=>{const row={...item,platform:selectionPlatformLabel(item)};lines.push(fields.map(([,key])=>quote(row[key])).join(","));});const blob=new Blob(["\uFEFF"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`选品商品机会_${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);showToast("已按当前筛选与排序结果导出CSV");
  }
  function createOpportunity(type=""){
    if(!getObjectPolicies().createAllowed){showToast("新建已由系统参数权限关闭");return;}
    const selected=type||workspace.getState().filters.type||"";
    if(!selected){typeBlock.section.scrollIntoView({behavior:"smooth",block:"center"});showToast("请先选择直发选品、常规选品或产品开发，再新建商品机会。");return;}
    openSelectionRecordDetail({id:createPreviewOpportunityId(items),type:selected,mode:"create"});
  }

  base.root.addEventListener("click",(event)=>{
    const pageAction=event.target.closest("[data-page-action]");
    if(pageAction?.dataset.pageAction==="create"&&!pageAction.disabled){createOpportunity();return;}
    const typeSelect=event.target.closest("[data-type-rail-select]");
    if(typeSelect){const type=typeSelect.dataset.typeRailSelect||"";workspace.setFilter(workspace.getState().filters.type===type?"":type,"type");return;}
    const typeAction=event.target.closest("[data-type-rail-action]");
    if(typeAction){const type=typeAction.dataset.typeRailKey||"";if(typeAction.dataset.typeRailAction==="create"){createOpportunity(type);return;}if(typeAction.dataset.typeRailAction==="import"){if(!getObjectPolicies().importAllowed){showToast("导入已由系统参数关闭");return;}batchImport?.open(type);return;}}
    const flow=event.target.closest("[data-flow-key]");
    if(flow){const key=flow.dataset.flowKey||"";stageState.value=stageState.value===key?"":key;renderAll();return;}
    const action=event.target.closest("[data-object-action]");
    if(!action)return;const item=items.find((row)=>String(row.id)===String(action.dataset.objectId));if(!item)return;
    if(action.dataset.objectAction==="edit"){openSelectionRecordDetail({id:item.id,type:item.type,mode:"edit"});return;}
    if(action.dataset.objectAction==="elements"){base.nineElements?.scrollIntoView({behavior:"smooth",block:"center"});return;}
  });

  window.addEventListener("aione:global-settings-updated",()=>{items=loadSelectionItems();workspace.nodes.importButton.disabled=!getObjectPolicies().importAllowed;workspace.nodes.exportButton.disabled=!getObjectPolicies().exportAllowed;renderAll();});
  const shellMainHost=document.getElementById("selection-main-host");
  if(shellMainHost){
    if(shellMainHost._aioneSidebarQuickActionHandler)shellMainHost.removeEventListener("aione:sidebar-quick-action",shellMainHost._aioneSidebarQuickActionHandler);
    const quickActionHandler=(event)=>{
      const action=event?.detail?.action||"";
      if(action==="selection-create"){createOpportunity();return;}
      if(action==="selection-import"){
        const type=workspace.getState().filters.type||"";
        if(!type){typeBlock.section.scrollIntoView({behavior:"smooth",block:"center"});showToast("请先选择直发选品、常规选品或产品开发，再批量导入。");return;}
        batchImport?.open(type);
      }
    };
    shellMainHost._aioneSidebarQuickActionHandler=quickActionHandler;
    shellMainHost.addEventListener("aione:sidebar-quick-action",quickActionHandler);
  }
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"standard",kicker:"当前工作台",title:"选品工作台",text:"聚焦当前选品业务的状态、关联与需要注意的信息。",items:[{label:"当前对象",value:"商品机会",detail:"从机会形成到推进判断使用同一业务对象。"},{label:"责任边界",value:"选品负责人",detail:"正式判断与经营结果仍由对应负责人承担。"}]}}));
  renderAll();
  focusRequestedWorkbenchArea(workspace.section);
  return true;
}
