import { getRouteId } from "../config/route-registry.js";
import { getBusinessPageDefinition } from "../config/business-page-definitions.js";
import { mountLevel2EmptyBase } from "../templates/level2-empty-base.js";
import { getTemplateRecipe } from "../templates/template-registry.js";
import { renderPageHeader } from "../components/page-header.js";
import { createLevel2Block } from "../components/level2-block.js";
import { renderCoreMetrics } from "../components/core-metrics.js";
import { renderFlow } from "../components/flow-component.js";
import { renderTypeRail } from "../components/type-rail.js";
import { createUniversalWorkspace } from "../components/universal-workspace.js";
import { renderObjectCards, renderObjectList } from "../components/object-presenter.js";
import { renderMiwaNineElements } from "../components/miwa-nine-elements.js";
import { bindHorizontalRails } from "../components/horizontal-rail.js";
import { loadBusinessObjects, createBusinessObject, importBusinessObjects } from "../data/business-object-store.js";
import { createNotification } from "../data/notification-store.js";
import { getActiveSystemParameters } from "../shell/system-settings.js";
import { getBusinessDataAdapter } from "../data/business-data-adapters.js";
import { coerceFieldValue, formatFieldValue, getHtmlInputType, validateObjectByFields } from "../fields/field-standard.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

function money(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? `¥${Math.round(number).toLocaleString("ja-JP")}` : "待确认";
}
function getDictionaryTypes(definition) {
  const params = getActiveSystemParameters?.() || {};
  const configured = params.dictionaries?.[definition.typeDictionaryKey];
  if (Array.isArray(configured) && configured.length) return configured;
  return Object.keys(definition.typeDescriptions || {});
}
function normalizedTypeCards(definition, objects) {
  return getDictionaryTypes(definition).map((label, index) => ({ label, description:definition.typeDescriptions?.[label] || "按真实业务持续完善说明。", count:objects.filter((item)=>item.type===label).length, priority:index<3 }));
}
function metricValue(metric, objects) {
  let rows = objects;
  if (metric.type) rows = rows.filter((item)=>item.type===metric.type);
  if (metric.state) rows = rows.filter((item)=>item.state===metric.state);
  if (metric.source === "objects") return rows.length;
  if (metric.sum) { const total = rows.reduce((sum,item)=>sum+(Number(item[metric.sum])||0),0); return metric.format === "money" ? money(total) : total; }
  if (metric.value !== undefined) return metric.value;
  return rows.length || "待验证";
}
function fieldValue(field, object) {
  return formatFieldValue(field, object[field.key]);
}
function objectMatches(object, state) {
  if (state.filter && object.type !== state.filter) return false;
  const q = state.query.trim().toLowerCase();
  return !q || Object.values(object).join(" ").toLowerCase().includes(q);
}
function parseCsv(text) {
  const rows = String(text || "").split(/\r?\n/).filter(Boolean).map((line) => {
    const result=[]; let cell=""; let quoted=false;
    for(let i=0;i<line.length;i+=1){const ch=line[i];if(ch==='"'&&line[i+1]==='"'){cell+='"';i+=1;}else if(ch==='"')quoted=!quoted;else if(ch===","&&!quoted){result.push(cell);cell="";}else cell+=ch;}result.push(cell);return result;
  });
  if(!rows.length)return[];const headers=rows.shift().map((x)=>x.trim());return rows.map((row)=>Object.fromEntries(headers.map((header,index)=>[header,row[index]??""])));
}
function mapImportedRows(rows, definition) {
  const aliases = new Map();
  definition.fields.forEach((field) => {
    [field.label, field.key, field.fieldCode, ...(field.importAliases || [])].filter(Boolean).forEach((alias) => aliases.set(String(alias).trim(), field));
  });
  return rows.map((row) => {
    const result = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      const field = aliases.get(String(key).trim());
      if (field) result[field.key] = coerceFieldValue(field, value);
    });
    return result;
  }).filter((row) => Object.keys(row).length);
}
function downloadCsv(filename, rows, fields) {
  const quote=(value)=>`"${String(value??"").replaceAll('"','""')}"`;const lines=[fields.map((f)=>quote(f.label)).join(",")];rows.forEach((row)=>lines.push(fields.map((f)=>quote(row[f.key])).join(",")));const blob=new Blob(["\uFEFF"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
}
function printCustomerA4(object={}) {
  const popup=window.open("","_blank","noopener,noreferrer");if(!popup)return false;const fields=[["客户名称",object.name],["客户类型",object.type],["国家/地区",object.region],["负责人",object.owner],["当前状态",object.state],["最近联系",object.lastContact],["累计交易",money(object.amount)],["当前商机",object.opportunity],["下一步",object.nextAction],["收件人",object.recipient],["邮编",object.postalCode],["地址",object.address],["联系电话",object.phone]];
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(object.name||"客户档案")}</title><style>@page{size:A4;margin:16mm}body{font-family:Arial,"Microsoft YaHei",sans-serif;color:#153B31;margin:0}h1{font-size:24px;margin:0 0 4px;color:#0D4937}.sub{font-size:11px;color:#6E8078;margin-bottom:18px}.grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #D8E5DE;border-radius:10px;overflow:hidden}.row{padding:10px 12px;border-right:1px solid #D8E5DE;border-bottom:1px solid #D8E5DE;min-height:52px}.row:nth-child(2n){border-right:0}.row span{display:block;color:#6E8078;font-size:10px}.row strong{display:block;margin-top:5px;font-size:13px}.foot{margin-top:16px;font-size:9px;color:#889991}</style></head><body><h1>${esc(object.name||"客户档案")}</h1><div class="sub">美和AIONE一体化工作平台｜标准A4客户档案</div><div class="grid">${fields.map(([label,value])=>`<div class="row"><span>${esc(label)}</span><strong>${esc(value||"—")}</strong></div>`).join("")}</div><div class="foot">对象ID：${esc(object.id||"—")}｜生成时间：${esc(new Date().toLocaleString("zh-CN"))}</div><script>window.onload=()=>window.print()<\/script></body></html>`);popup.document.close();return true;
}
function exportCustomerLabel(object={}) { downloadCsv(`${object.name||"客户"}_面单资料.csv`,[object],[{key:"name",label:"客户名称"},{key:"recipient",label:"收件人"},{key:"postalCode",label:"邮编"},{key:"address",label:"地址"},{key:"phone",label:"联系电话"}]); }
function fieldsByKeys(definition,keys,fallbackLimit=8){if(Array.isArray(keys)&&keys.length){const map=new Map(definition.fields.map((field)=>[field.key,field]));return keys.map((key)=>map.get(key)).filter(Boolean);}return definition.fields.slice(0,fallbackLimit);}
function objectVisual(object,definition){const image=object.image||object.imageUrl||object.logo||object.iconUrl||"";if(image)return `<img src="${esc(image)}" alt="">`;return esc(String(object.name||object.title||definition.objectName||"美").trim().slice(0,2));}
function generatedSortOptions(definition){const fields=definition.fields||[];const primary=fields.find((field)=>field.primary)||fields.find((field)=>["name","title"].includes(field.key));const options=[{value:"default",label:"默认排序"},{value:"updated-desc",label:"最近更新",field:"updatedAt",direction:"desc",type:"date"}];if(primary)options.push({value:"name-asc",label:`${primary.label} A-Z`,field:primary.key,direction:"asc"});if(fields.some((field)=>field.key==="state"))options.push({value:"state-asc",label:"状态",field:"state",direction:"asc"});if(fields.some((field)=>field.key==="owner"))options.push({value:"owner-asc",label:"负责人",field:"owner",direction:"asc"});const amount=fields.find((field)=>["number","money","integer","percent"].includes(field.dataType));if(amount)options.push({value:`${amount.key}-desc`,label:`${amount.label} 高→低`,field:amount.key,direction:"desc",type:"number"});return options;}

function createBusinessPortal(portal, definition, types) {
  if(!portal)return null;
  portal.innerHTML=`<dialog class="miwa-business-create-dialog" data-business-create-dialog><form method="dialog" class="miwa-business-create-dialog__body" data-business-create-form><header><div><small>统一人工入口</small><h2>${esc(definition.createLabel||`新建${definition.objectName}`)}</h2><p>人工和AI秘书使用同一对象、字段、流程与事件机制。</p></div><button type="button" data-create-dialog-close aria-label="关闭">×</button></header><div class="miwa-business-create-grid" data-business-create-fields></div><div class="miwa-business-create-note">保存成功后形成标准业务事件；通知、任务和后端规则从统一服务层调用。</div><footer><button type="button" class="ghost" data-create-dialog-close>取消</button><button type="submit" class="primary">保存</button></footer></form></dialog><div class="miwa-business-toast" data-business-toast aria-live="polite"></div>`;
  return {dialog:portal.querySelector("[data-business-create-dialog]"),form:portal.querySelector("[data-business-create-form]"),fields:portal.querySelector("[data-business-create-fields]"),toast:portal.querySelector("[data-business-toast]"),types};
}

export async function initBusinessPage() {
  const routeId=getRouteId();const definition=getBusinessPageDefinition(routeId);const entry=document.getElementById("miwa-business-template-entry");if(!definition||!entry)return false;
  if(!getTemplateRecipe("standard-business"))throw new Error("标准业务母版Recipe未注册");
  const params=getActiveSystemParameters?.()||{};const businessParams=params.business||{};const ioParams=params.io||{};const dataAdapter=getBusinessDataAdapter(routeId);let objects=dataAdapter?.load?dataAdapter.load(definition):loadBusinessObjects(routeId,definition.seedObjects||[]);let toastTimer=null;
  const types=getDictionaryTypes(definition);
  const base=await mountLevel2EmptyBase(entry,{routeId,recipeId:"standard-business",pageKind:"business"});
  const headActions=[];
  if(businessParams.overviewActionEnabled!==false)headActions.push({key:"overview",label:definition.overviewLabel||`${definition.objectName}概览`});
  if(businessParams.createActionEnabled!==false)headActions.push({key:"create",label:`＋ ${definition.createLabel||`新建${definition.objectName}`}`,primary:true,disabled:params.permissions?.allowCreate===false});
  (definition.headActions||[]).forEach((action)=>headActions.push({key:`extra:${action.key}`,label:action.label}));
  renderPageHeader(base.pageHeader,{icon:definition.icon||"业",title:definition.title,description:definition.description,actions:headActions});

  const typeCards=normalizedTypeCards(definition,objects);
  const typeBlock=typeCards.length?createLevel2Block(base.main,{id:`${routeId}-type-block`,title:definition.typeTitle||`${definition.objectName}类型`,description:"优先显示当前最重要的3类；更多类型横向滑动，不改变页面基础高度。",railTarget:`${routeId}-type-track`}):null;
  if(typeBlock){typeBlock.body.id=`${routeId}-type-track`;typeBlock.body.className="miwa-horizontal-rail";}
  const flowSteps=definition.flow?.steps||[];
  const flowBlock=flowSteps.length?createLevel2Block(base.main,{id:`${routeId}-flow-block`,title:definition.flowTitle||`${definition.objectName}管理流程`,description:"只引用已经确认的管理/业务流程；流程变化修改统一业务定义，不在单页另画。",status:definition.flow?.label||"待确认",locked:definition.flow?.status==="locked"}):null;
  const metricBlock=createLevel2Block(base.main,{id:`${routeId}-metrics-block`,title:"核心指标",description:"只展示日常最重要、最常用的指标；一屏最多6项，更多横向滑动。",railTarget:`${routeId}-metrics`});metricBlock.body.id=`${routeId}-metrics`;

  const exportAllowed=definition.allowExport!==false&&params.permissions?.allowExport!==false;const importAllowed=definition.allowImport!==false&&!dataAdapter?.disableImport&&params.permissions?.allowImport!==false&&(ioParams.allowCsv!==false||ioParams.allowExcel!==false);const accepts=[];if(ioParams.allowExcel!==false)accepts.push(".xlsx");if(ioParams.allowCsv!==false)accepts.push(".csv");
  const workspace=createUniversalWorkspace(base.main,{pageId:routeId,title:definition.objectPlural,description:`统一${definition.objectName}对象：搜索、筛选、排序、导入、导出和标准视图共用同一份数据。`,searchPlaceholder:`搜索${definition.objectName}`,filterAllLabel:`全部${definition.objectName}类型`,filterOptions:types,sortOptions:definition.sortOptions||generatedSortOptions(definition),views:definition.views||["card","list"],defaultView:"card",cardColumns:[3,4,6],defaultCardColumns:3,allowImport:importAllowed,allowExport:exportAllowed,importAccept:accepts.join(","),onStateChange:()=>renderObjects(),onImportRequest:(fileInput)=>fileInput?.click(),onExportRequest:()=>{downloadCsv(`${definition.title}_${new Date().toISOString().slice(0,10)}.csv`,getVisibleObjects(),definition.fields);showToast("已按当前筛选与排序结果导出CSV");}});

  const auxiliaryItems=definition.auxiliary||[];const auxiliaryBlock=auxiliaryItems.length?createLevel2Block(base.main,{id:`${routeId}-auxiliary-block`,title:"辅助机动区",description:"只放当前管理/业务真正需要的特殊能力；保持单行，数量变化不改变基础高度。",railTarget:`${routeId}-auxiliary-track`}):null;if(auxiliaryBlock){auxiliaryBlock.body.id=`${routeId}-auxiliary-track`;auxiliaryBlock.body.className="miwa-horizontal-rail";}
  if(businessParams.requireMiwaNineElements!==false)renderMiwaNineElements(base.nineElements,{context:definition.title});
  const portal=createBusinessPortal(base.portal,definition,types);

  function showToast(text){const node=portal?.toast;if(!node)return;node.textContent=text;node.classList.add("is-visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove("is-visible"),2200);}
  function getVisibleObjects(){const state=workspace.getState();return workspace.sortItems(objects.filter((object)=>objectMatches(object,state)));}
  function renderTypes(){if(!typeBlock)return;const rows=normalizedTypeCards(definition,objects).map((type)=>({...type,key:type.label,active:workspace.getState().filter===type.label}));renderTypeRail(typeBlock.body,rows,{maxVisible:3,actions:[{key:"create",label:()=>`＋ ${definition.createLabel||`新建${definition.objectName}`}`,disabled:()=>params.permissions?.allowCreate===false},{key:"view",label:"查看全部"}]});}
  function renderMetrics(){renderCoreMetrics(metricBlock.body,(definition.metrics||[]).map((metric)=>({label:metric.label,value:metricValue(metric,objects)})),{maxVisible:6});}
  function renderAuxiliary(){if(!auxiliaryBlock)return;auxiliaryBlock.body.dataset.visible=String(Math.min(5,Math.max(1,auxiliaryItems.length)));auxiliaryBlock.body.innerHTML=auxiliaryItems.map((item)=>`<article class="miwa-auxiliary-card"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p>${item.route?`<a href="#/${esc(item.route)}">进入 ›</a>`:""}${item.url?`<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">打开 ↗</a>`:""}</article>`).join("");}
  function renderObjects(){const rows=getVisibleObjects();workspace.setCount(rows.length);renderTypes();if(!rows.length){if(objects.length&&(workspace.getState().query||workspace.getState().filter))workspace.showNoResults();else workspace.showEmpty(`暂无${definition.objectPlural}`,`可以使用“${definition.createLabel}”、导入已有数据，或等待业务系统自动汇入；不使用虚构数据填满页面。`);return;}workspace.hideEmpty();const cardFields=fieldsByKeys(definition,definition.cardFields,6).filter((field)=>!field.primary&&field.key!=="type"&&field.key!=="state");const listFields=fieldsByKeys(definition,definition.listFields,8);const actions=[{key:"detail",label:"查看详情"},...(definition.specialActions||[]).map((action)=>({key:`special:${action.key}`,label:action.label})),{key:"external",label:"打开入口 ↗",href:(item)=>item.url||"",external:true,visible:(item)=>Boolean(item.url)}];const cardHost=workspace.getViewHost("card");if(cardHost)renderObjectCards(cardHost,rows,{objectName:definition.objectName,title:(item)=>item.name||item.title||definition.objectName,type:(item)=>item.type||definition.objectName,state:(item)=>item.state||"待确认",visual:(item)=>objectVisual(item,definition),fields:cardFields.map((field)=>({label:field.label,value:(item)=>fieldValue(field,item)})),actions});for(const viewId of ["list","table"]){if(!workspace.getViewHost(viewId))continue;const table=workspace.getTableNodes(viewId);renderObjectList(table.head,table.body,rows,{fields:listFields.map((field)=>({label:field.label,value:(item)=>fieldValue(field,item)})),actions:[{key:"detail",label:"详情"},...(definition.specialActions||[]).map((action)=>({key:`special:${action.key}`,label:action.label})),{key:"external",label:"打开",href:(item)=>item.url||"",external:true,visible:(item)=>Boolean(item.url)}]});}}
  function renderAll(){renderTypes();if(flowBlock)renderFlow(flowBlock.body,flowSteps);renderMetrics();renderObjects();renderAuxiliary();bindHorizontalRails(base.root);}
  function openCreate(type=""){if(!portal)return;portal.fields.innerHTML=definition.fields.map((field)=>{const required=field.required?"required":"";const value=field.key==="type"?type:"";const configured=field.dictionaryKey?params.dictionaries?.[field.dictionaryKey]:null;const options=field.key==="type"?types:(Array.isArray(configured)?configured:[]);if(field.dictionary&&options.length)return `<label><span>${esc(field.label)}${field.required?" *":""}</span><select name="${esc(field.key)}" ${required}><option value="">请选择</option>${options.map((item)=>`<option value="${esc(item)}" ${item===value?'selected':''}>${esc(item)}</option>`).join("")}</select></label>`;if(field.ui?.input==="textarea")return `<label${field.ui?.span==="full"?' style="grid-column:1/-1"':''}><span>${esc(field.label)}${field.required?" *":""}</span><textarea name="${esc(field.key)}" rows="${Number(field.ui?.rows)||3}" ${required}></textarea></label>`;return `<label><span>${esc(field.label)}${field.required?" *":""}</span><input name="${esc(field.key)}" type="${esc(getHtmlInputType(field))}" ${required}></label>`;}).join("");portal.form.reset();if(type&&portal.form.elements.type)portal.form.elements.type.value=type;portal.dialog.showModal();}

  base.root.addEventListener("click",(event)=>{const pageAction=event.target.closest("[data-page-action]");if(pageAction?.dataset.pageAction==="overview"){window.scrollTo({top:0,behavior:"smooth"});return;}if(pageAction?.dataset.pageAction==="create"&&!pageAction.disabled){openCreate();return;}const typeButton=event.target.closest("[data-type-rail-select]");if(typeButton){const type=typeButton.dataset.typeRailSelect||"";workspace.setFilter(workspace.getState().filter===type?"":type);return;}const typeAction=event.target.closest("[data-type-rail-action]");if(typeAction){const type=typeAction.dataset.typeRailKey||"";if(typeAction.dataset.typeRailAction==="create"&&!typeAction.disabled){openCreate(type);return;}if(typeAction.dataset.typeRailAction==="view"){workspace.setFilter(workspace.getState().filter===type?"":type);return;}}const action=event.target.closest("[data-object-action]");if(!action)return;const object=objects.find((item)=>String(item.id)===String(action.dataset.objectId));if(action.dataset.objectAction==="detail"){showToast("对象详情页沿用统一子母版；本轮只锁定二级页面与组件调用。");return;}if(action.dataset.objectAction?.startsWith("special:")&&object){const key=action.dataset.objectAction.slice(8);const special=(definition.specialActions||[]).find((item)=>item.key===key);if(special?.kind==="print-a4"){if(!printCustomerA4(object))showToast("浏览器阻止了打印窗口，请允许弹出窗口后重试。");return;}if(special?.kind==="export-label"){exportCustomerLabel(object);showToast("已导出当前客户面单资料CSV");}}});
  portal?.dialog?.querySelectorAll("[data-create-dialog-close]").forEach((button)=>button.addEventListener("click",()=>portal.dialog.close()));
  portal?.form?.addEventListener("submit",(event)=>{event.preventDefault();const formData=new FormData(event.currentTarget);const object={};definition.fields.forEach((field)=>{object[field.key]=coerceFieldValue(field,formData.get(field.key)??"");});const validation=validateObjectByFields(definition.fields,object);if(!validation.ok){showToast(validation.errors[0]||"字段校验未通过");return;}if(!object.state)object.state="待确认";const result=dataAdapter?.create?dataAdapter.create(object,definition):createBusinessObject(routeId,object,definition.seedObjects||[]);objects=result.objects||objects;portal.dialog.close();renderAll();if(params.notifications?.autoNotifyOnCreate!==false){createNotification({title:`${definition.title}｜已${definition.createLabel}`,summary:`${object.name||definition.objectName} 已建立标准档案，可进入${definition.title}继续处理。`,scope:params.notifications?.defaultScope||"相关人员",source:definition.title,label:"业务通知",level:"normal",requiresAck:false});}showToast(`${definition.createLabel}成功`);});
  workspace.nodes.importFile?.addEventListener("change",async()=>{const file=workspace.nodes.importFile.files?.[0];if(!file)return;try{let rows=[];if(/\.csv$/i.test(file.name)){if(ioParams.allowCsv===false)throw new Error("CSV导入已由系统参数关闭");rows=parseCsv(await file.text());}else if(/\.xlsx$/i.test(file.name)){if(ioParams.allowExcel===false)throw new Error("Excel导入已由系统参数关闭");if(!window.XLSX)throw new Error("Excel解析组件未加载");const book=window.XLSX.read(await file.arrayBuffer(),{type:"array"});rows=window.XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:""});}else throw new Error("仅支持系统参数允许的CSV / XLSX文件");const mapped=mapImportedRows(rows,definition);const primaryKey=definition.fields.find((field)=>field.primary)?.key||"name";let rowsToImport=mapped;let skipped=0;if(ioParams.duplicateCheck!==false){const existing=new Set(objects.map((item)=>`${String(item[primaryKey]||"").trim().toLowerCase()}|${String(item.type||"").trim().toLowerCase()}`));rowsToImport=mapped.filter((item)=>{const signature=`${String(item[primaryKey]||"").trim().toLowerCase()}|${String(item.type||"").trim().toLowerCase()}`;if(!signature.startsWith("|")&&existing.has(signature)){skipped+=1;return false;}existing.add(signature);return true;});}const result=dataAdapter?.import?dataAdapter.import(rowsToImport,definition):importBusinessObjects(routeId,rowsToImport,definition.seedObjects||[]);objects=result.objects||objects;renderAll();showToast(`导入完成：新增 ${result.added} 条${skipped?`，跳过重复 ${skipped} 条`:""}`);}catch(error){showToast(`导入失败：${error.message||error}`);}finally{workspace.nodes.importFile.value="";}});

  const unsubscribe=dataAdapter?.subscribe?.((next)=>{objects=next||[];renderAll();});if(unsubscribe)window.addEventListener("hashchange",()=>unsubscribe(),{once:true});
  const asideItems=(definition.auxiliary||[]).slice(0,3).map((item)=>({label:item.title||"关联信息",value:item.text||"",route:item.route||""}));
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:asideItems.length?"standard":"light",kicker:"当前空间",title:definition.title,text:definition.description||"",items:asideItems}}));
  renderAll();return true;
}
