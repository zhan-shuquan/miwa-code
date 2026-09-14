import { PRODUCT_HOME_CENTERS } from "../config/home-registry.js?v=20260908-product-home-current";
import { aioneApi } from "../services/aione-api-client.js";

const PRODUCT_REF="MH0000002";
const SELECTION_REF="SEL-20260907-000001";
const SKU_REF="MH0000002-01";
const ROOT_VIEWS=Object.freeze([
  {id:"overview",label:"概览",type:"overview"},
  {id:"handbook",label:"学习手册",type:"electronic-publication"},
  {id:"assets",label:"资料一览",type:"asset-management"}
]);
const VIEW_TYPES=Object.freeze({
  "selection-center":["overview","data-list","electronic-publication"],
  "product-center":["overview","data-list","data-list","generator-wizard"],
  "profit-center":["data-list","analysis-report"],
  "design-center":["overview","data-list","batch-job-monitor","asset-management","master-data","mapping"],
  "publish-center":["overview","data-list","form-editor","form-editor","batch-job-monitor","form-editor","batch-job-monitor","batch-job-monitor","batch-job-monitor","error-queue","master-data","mapping"],
  "category-center":["overview","master-data","tree","master-data","mapping","tree"],
  "brand-center":["overview","master-data","form-editor"],
  "attribute-center":["overview","master-data","master-data"],
  "specification-center":["overview","master-data","master-data"],
  "coding-center":["overview","master-data","generator-wizard","generator-wizard","master-data"],
  "sampling-center":["overview","data-list","master-data"],
  "procurement-center":["overview","data-list","data-list","ledger"],
  "inventory-center":["overview","data-list","ledger","rule-management"],
  "order-center":["overview","data-list"],
  "operations-center":["overview","data-list","rule-management"],
  "service-center":["overview","data-list"]
});
const CENTER_COPY=Object.freeze({
  "selection-center":"商品生命周期入口。候选商品通过后才创建正式 Product。",
  "product-center":"统一管理 Product、SKU、Product Truth 与正式商品工作区。",
  "profit-center":"统一成本试算、智能定价与利润结果。",
  "design-center":"ProductAsset、DesignTask、Page Spec、Design Engine 与人工审核的唯一工作场所。",
  "publish-center":"Publish Batch → Publish Job → Platform Adapter；Current State 与执行历史严格分离。",
  "category-center":"维护唯一系统分类、店铺分类及平台映射。",
  "brand-center":"维护统一品牌对象与品牌注册事实。",
  "attribute-center":"维护可供人工、规则、AI 与平台映射共同使用的属性。",
  "specification-center":"维护规格定义、模板及 SKU 组合依据。",
  "coding-center":"统一管理 Product、SKU、JAN、二维码与海关编码。",
  "sampling-center":"记录测样事实、证据与责任结论。",
  "procurement-center":"Purchase Request → Purchase Order → 收货的统一采购工作区。",
  "inventory-center":"以 SKU × Location 余额与不可无痕修改的 Ledger 管理库存。",
  "order-center":"确定性查询订单、订单行与经营聚合。",
  "operations-center":"维护运营记录与定价策略；价格计算仍归利润中心。",
  "service-center":"围绕订单与商品处理问题和客诉，不复制客户对象。"
});
const STATUS_LABEL=Object.freeze({active:"CURRENT",validating:"VALIDATING",planned:"NOT YET IMPLEMENTED"});

function esc(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function params(){const raw=String(location.hash||"");return raw.includes("?")?new URLSearchParams(raw.slice(raw.indexOf("?")+1)):new URLSearchParams();}
function centerById(id){return PRODUCT_HOME_CENTERS.find(center=>center.id===id)||null;}
function navigate(next){location.hash=`#/product-home?${new URLSearchParams(next)}`;}
function status(value){const key=String(value||"validating").toLowerCase();return `<span class="phc-state phc-state--${key==='active'||key==='current'?'ready':key==='blocked'?'blocked':'pending'}">${esc(STATUS_LABEL[key]||String(value||"VALIDATING").toUpperCase())}</span>`;}
function rootTabs(active){return `<nav class="phc-tabs phc-root-tabs" aria-label="商品之家"><button data-root-view="overview" class="${active==='overview'?'is-active':''}">概览</button><button data-root-view="handbook" class="${active==='handbook'?'is-active':''}">学习手册</button><button data-root-view="assets" class="${active==='assets'?'is-active':''}">资料一览</button></nav>`;}
function centerTabs(center,active){return `<nav class="phc-tabs" aria-label="${esc(center.label)}">${center.tabs.map((label,index)=>`<button data-center-view="${index}" class="${index===active?'is-active':''}">${esc(label)}</button>`).join("")}</nav>`;}
function pageHeader(title,copy,badge=""){return `<header class="phc-page-head"><div><h1 id="phc-title">${esc(title)}</h1><p>${esc(copy)}</p></div>${badge}</header>`;}
function pending(title,type,state="VALIDATING",detail="后端能力尚未接入；页面 Contract、权限边界与状态表达已就位，不展示虚假业务数据。"){return `<section class="phc-empty-state"><div class="phc-empty-state__icon">${esc(type.split("-").map(x=>x[0]).join("").toUpperCase())}</div><h2>${esc(title)}</h2><p>${esc(detail)}</p><span>${esc(state)}</span></section>`;}
function toolbar({primary="",search="搜索",danger=false}={}){return `<div class="phc-toolbar">${primary?`<button class="${danger?'phc-danger':'phc-primary'}">${esc(primary)}</button>`:""}<label class="phc-search"><span>⌕</span><input type="search" placeholder="${esc(search)}"></label><button>筛选</button><button>排序</button><button>列设置</button><span class="phc-toolbar-spacer"></span><button>保存视图</button></div>`;}
function dataTable(columns,rows=[]){return `<div class="phc-table-wrap"><table class="phc-table"><thead><tr>${columns.map(x=>`<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr>${row.map((cell,index)=>`<td>${index===0?`<strong>${esc(cell)}</strong>`:esc(cell)}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${columns.length}"><div class="phc-table-empty">待后端接入后显示真实记录</div></td></tr>`}</tbody></table></div>`;}
function metric(label,value,copy,state=""){return `<div class="phc-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(copy)}</small>${state?status(state):""}</div>`;}

const PAGE_TYPE_RENDERERS=Object.freeze({
  overview:({center})=>`<div class="phc-overview-grid">${metric("运行原则","Automation First","正常流程自动执行")}${metric("人工介入","By Exception","异常、低置信度、高风险与最终责任")}${metric("数据状态",center.status==='active'?"CURRENT":"VALIDATING","未接入能力不生成数字",center.status)}</div><section class="phc-section"><h2>当前工作</h2>${pending(`${center.label}业务聚合`,"overview",STATUS_LABEL[center.status]||"VALIDATING")}</section>`,
  "data-list":({center,label})=>`${toolbar({primary:label.includes("商品")?"＋ 新建商品":"",search:`搜索${label}`})}${dataTable(["对象","关联","状态","负责人","更新时间"])}`,
  "object-detail":({workbench={}})=>productWorkspaceMarkup(workbench),
  "form-editor":({label})=>`<div class="phc-form"><label><span>执行范围</span><input disabled placeholder="待后端接入"></label><label><span>对象</span><input disabled placeholder="从统一对象选择"></label><label class="phc-form-wide"><span>说明</span><textarea disabled placeholder="不以临时表单生成正式数据"></textarea></label><div class="phc-form-actions"><button disabled>保存草稿</button><button class="phc-primary" disabled>${esc(label)}</button></div></div>`,
  "generator-wizard":({label})=>`<ol class="phc-steps"><li class="is-active"><b>1</b><span>选择对象</span></li><li><b>2</b><span>规则预览</span></li><li><b>3</b><span>冲突校验</span></li><li><b>4</b><span>生成结果</span></li></ol>${pending(label,"generator-wizard","NOT YET IMPLEMENTED","生成器共用统一规则引擎；后端未接入时不在浏览器制造正式编码或对象。")}`,
  "master-data":({label})=>`${toolbar({primary:`＋ 新增${label.replace("一览","")}`,search:`搜索${label}`})}${dataTable(["编码","名称","引用数","状态","更新时间"])}`,
  tree:({label})=>`<div class="phc-tree-layout"><section><h2>${esc(label)}</h2><div class="phc-tree-placeholder"><span>▸</span> 分类根节点<div><span>▸</span> 待后端接入真实层级</div></div></section><aside>${pending("节点详情","tree","NOT YET IMPLEMENTED")}</aside></div>`,
  mapping:({label})=>`${toolbar({primary:"＋ 新建映射",search:`搜索${label}`})}${dataTable(["AIONE 来源","平台 / 目标","转换规则","优先级","状态"])}`,
  ledger:({label})=>`${toolbar({search:`搜索${label}`})}${dataTable(["发生时间","业务类型","对象","变更前","变更后","来源单据"])}`,
  "rule-management":({label})=>`${toolbar({primary:"＋ 新建规则",search:`搜索${label}`})}${dataTable(["规则","Scope","条件","动作","优先级","状态"])}`,
  "batch-job-monitor":({label})=>`${toolbar({search:`搜索${label}`})}${dataTable(["任务 / 批次","执行方式","进度","成功","失败","状态"])}`,
  "analysis-report":()=>`<div class="phc-analysis">${metric("新品保本标准售价","800 JPY","CURRENT 已验证计算")}${metric("常规定价","1680 JPY","目标利润率规则结果")}${metric("50%优惠","3360 → 1680 JPY","活动标价 → 成交价")}${metric("700円校验","-37 JPY","低于当前经营现金口径保本线","blocked")}</div><section class="phc-section"><h2>${PRODUCT_REF} 成本依据</h2>${dataTable(["项目","值","来源状态"],[["采购成本","11.4 CNY / 套","CONFIRMED"],["国际空运","5.28 CNY / 套","PROVISIONAL"],["包装/验货/标签","2 CNY / 套","CONFIRMED"],["日本配送","200 JPY / 订单","CONFIRMED"],["乐天综合手续费率","10%","CONFIRMED"]])}</section>`,
  "asset-management":({label})=>`${toolbar({search:`搜索${label}`})}<div class="phc-asset-groups"><div><strong>01_SKU图</strong><span>人工素材 CURRENT</span></div><div><strong>02_产品图</strong><span>人工素材 CURRENT</span></div><div><strong>03_实拍图</strong><span>人工素材 CURRENT</span></div></div>${pending("资产记录","asset-management","NOT YET IMPLEMENTED","ProductAsset 是唯一图片事实；文件来源、版本、用途与关联对象由后端返回后展示。")}`,
  "electronic-publication":()=>`<div class="phc-publication"><aside><strong>目录</strong><a href="#phc-handbook-1">商品生命周期</a><a href="#phc-handbook-2">Automation First</a><a href="#phc-handbook-3">对象与责任</a></aside><article><span>CURRENT · 2026-09-08</span><h2 id="phc-handbook-1">商品从选品开始</h2><p>Selection 是商品生命周期入口。选品通过后，系统才创建正式 Product，并由同一生成引擎建立 SKU。</p><h2 id="phc-handbook-2">Automation First, Human by Exception</h2><p>确定、可继承、可计算和可映射的工作由系统完成；员工处理异常、低置信度、高风险、首次正式发布确认与最终责任判断。</p><h2 id="phc-handbook-3">一个对象，一份事实</h2><p>Product、SKU、ProductAsset、DesignTask、Listing、Publish Job、Inventory 与 Procurement 各守边界，通过关系连接，不复制事实。</p></article></div>`,
  "error-queue":({label})=>`${toolbar({search:`搜索${label}`})}${dataTable(["严重度","错误类型","对象","可重试","负责人","状态"])}`
});
export { PAGE_TYPE_RENDERERS };

async function selectionData(){return aioneApi(`/api/v1/selections?q=${encodeURIComponent(SELECTION_REF)}&limit=20`);}
async function productData(){return aioneApi(`/api/v1/design-center/workbench?product=${encodeURIComponent(PRODUCT_REF)}`);}
function loading(){return `<div class="phc-loading"><span></span>正在通过 AIONE API Client 读取真实数据</div>`;}
function loadError(error){return `<div class="phc-inline-error"><strong>真实 API 暂不可用</strong><span>${esc(error?.message||"连接失败")}</span><small>页面保持可用，不以 Mock 数据替代。</small></div>`;}
function lifecycle(){
  const stages=[["Selection","CURRENT"],["Product","CURRENT"],["SKU","CURRENT"],["素材","VALIDATING"],["Design / Image","VALIDATING"],["Review","VALIDATING"],["Profit","CURRENT"],["Publish","NOT YET IMPLEMENTED"],["Rakuten","NOT YET IMPLEMENTED"],["Order","NOT YET IMPLEMENTED"],["Inventory","NOT YET IMPLEMENTED"],["Procurement","NOT YET IMPLEMENTED"]];
  return `<div class="phc-lifecycle">${stages.map(([label,state],i)=>`<div class="phc-lifecycle__step"><span>${i+1}</span><strong>${esc(label)}</strong><small>${esc(state)}</small></div>`).join("")}</div>`;
}
async function renderSelectionView(stage,label,index){
  if(index===2){stage.innerHTML=PAGE_TYPE_RENDERERS["electronic-publication"]({label});return;}
  stage.innerHTML=loading();
  try{
    const payload=await selectionData();const items=Array.isArray(payload?.items)?payload.items:[];
    if(index===0){stage.innerHTML=`<div class="phc-overview-grid">${metric("真实验证 Selection",SELECTION_REF,"已转为正式商品")}${metric("正式 Product",PRODUCT_REF,"Selection qualified 后生成")}${metric("正式 SKU",SKU_REF,"6种颜色是套装内容，不拆 SKU")}</div>${items.length?"":pending("选品聚合","overview","CURRENT","当前筛选未返回记录；不补造候选商品数量。")}`;}
    else stage.innerHTML=`${toolbar({search:"搜索 Selection Code / 商品名 / 来源"})}${dataTable(["Selection Code","候选商品","来源","状态","正式商品"],items.map(item=>[item.selectionNo||item.id,item.title||"—",item.sourcePlatform||"—",item.lifecycleStatus||"—",item.convertedProductCode||"—"]))}`;
  }catch(error){stage.innerHTML=`${loadError(error)}${index===0?`<div class="phc-overview-grid">${metric("已验证身份链",`${SELECTION_REF} → ${PRODUCT_REF} → ${SKU_REF}`,"Google Drive CURRENT 运行时证据")}</div>`:""}`;}
}
function workbenchFacts(workbench){
  const product=workbench?.product||{},data=product.productData||{};return [["Product Code",product.productCode||PRODUCT_REF],["商品名称",product.name||"冬款男袜6双套装"],["SKU Code",SKU_REF],["生命周期",product.lifecycleStatus||"draft"],["销售 SKU 结构","1个SKU"],["套装颜色","白色｜米色｜卡其｜军绿｜深灰｜黑色"],["素材目录","01_SKU图｜02_产品图｜03_实拍图"],["Rakuten normal-item","574列 Contract｜平台规则仍在验证"]];
}
function objectSection(section,workbench){
  const facts=workbenchFacts(workbench);
  if(section==="facts")return `<section class="phc-section"><h2>Product Truth</h2>${dataTable(["字段","当前事实"],facts)}</section>`;
  if(section==="relations")return `<section class="phc-section"><h2>对象关系</h2>${lifecycle()}</section>`;
  if(section==="timeline")return `<section class="phc-section"><h2>时间线</h2>${dataTable(["时间","对象","事件","状态"],[["2026-09-07",SELECTION_REF,"选品通过并创建正式商品","CURRENT"],["2026-09-07",PRODUCT_REF,"生成 Product Code","CURRENT"],["2026-09-07",SKU_REF,"生成 SKU Code","CURRENT"]])}</section>`;
  return `<section class="phc-object-summary"><div><span>Selection</span><strong>${SELECTION_REF}</strong></div><div><span>Product</span><strong>${PRODUCT_REF}</strong></div><div><span>SKU</span><strong>${SKU_REF}</strong></div><div><span>SKU数量</span><strong>1</strong></div></section><section class="phc-section"><h2>全链路状态</h2>${lifecycle()}</section>`;
}
function productWorkspaceMarkup(workbench){
  return `${pageHeader(PRODUCT_REF,"正式商品工作区 · Product Truth 与跨中心状态",status("active"))}<nav class="phc-tabs" aria-label="商品详情"><button class="is-active" data-object-view="overview">概览</button><button data-object-view="facts">商品事实</button><button data-object-view="relations">关系</button><button data-object-view="timeline">时间线</button></nav><main data-object-stage>${objectSection("overview",workbench)}</main><div class="phc-responsibility-links"><button data-jump="design-center">进入设计中心</button><button data-jump="profit-center">进入利润中心</button><button data-jump="publish-center">进入发布中心</button><button data-jump="inventory-center">进入库存中心</button></div>`;
}
async function renderProductWorkspace(host){let workbench={};host.innerHTML=`<section class="phc phc-object-workspace">${loading()}</section>`;try{const payload=await productData();workbench=payload?.workbench||{};host.firstElementChild.innerHTML=PAGE_TYPE_RENDERERS["object-detail"]({workbench});}catch(error){host.firstElementChild.innerHTML=`${loadError(error)}${PAGE_TYPE_RENDERERS["object-detail"]({workbench})}`;}host.querySelectorAll("[data-jump]").forEach(button=>button.addEventListener("click",()=>navigate({center:button.dataset.jump})));host.querySelectorAll("[data-object-view]").forEach(button=>button.addEventListener("click",()=>{host.querySelectorAll("[data-object-view]").forEach(item=>item.classList.toggle("is-active",item===button));host.querySelector("[data-object-stage]").innerHTML=objectSection(button.dataset.objectView,workbench);}));}
function designLive(){return `<div class="phc-design-frame-wrap"><iframe class="phc-design-frame" src="./design-center-v1.html?product=${PRODUCT_REF}&embed=1" title="${PRODUCT_REF} 设计中心" loading="eager"></iframe></div>`;}
async function renderCenter(host,center,index){
  const label=center.tabs[index]||center.tabs[0],type=(VIEW_TYPES[center.id]||[])[index]||"overview";
  host.innerHTML=`<section class="phc phc-center" aria-labelledby="phc-title">${pageHeader(center.label,CENTER_COPY[center.id],status(center.status))}${centerTabs(center,index)}<main class="phc-content" data-stage></main></section>`;
  const stage=host.querySelector("[data-stage]");
  if(center.id==="selection-center")await renderSelectionView(stage,label,index);
  else if(center.id==="product-center"&&index===0)stage.innerHTML=`<section class="phc-section"><h2>正式商品工作区</h2><button class="phc-object-row" data-open-product><span class="phc-product-thumb">M2</span><span><strong>${PRODUCT_REF}</strong><small>冬款男袜6双套装 · 1个SKU</small></span>${status("active")}<b>›</b></button></section><section class="phc-section"><h2>生命周期关系</h2>${lifecycle()}</section>`;
  else if(center.id==="product-center"&&index===1)stage.innerHTML=`${toolbar({search:"搜索商品编码 / 名称"})}${dataTable(["商品编码","商品名称","SKU数","生命周期","发布状态"],[[PRODUCT_REF,"冬款男袜6双套装","1","draft","NOT YET IMPLEMENTED"]])}`;
  else if(center.id==="product-center"&&index===2)stage.innerHTML=`${toolbar({search:"搜索 SKU Code / 商品"})}${dataTable(["SKU Code","Product Code","规格组合","状态","更新时间"],[[SKU_REF,PRODUCT_REF,"款式｜6双套装","CURRENT","2026-09-07"]])}`;
  else if(center.id==="design-center"&&index===2)stage.innerHTML=designLive();
  else stage.innerHTML=PAGE_TYPE_RENDERERS[type]({center,label});
  host.querySelector("[data-open-product]")?.addEventListener("click",()=>navigate({center:"product-center",product:PRODUCT_REF}));
  host.querySelectorAll("[data-center-view]").forEach(button=>button.addEventListener("click",()=>navigate({center:center.id,view:button.dataset.centerView})));
}
function renderRoot(host,view){
  const active=ROOT_VIEWS.some(item=>item.id===view)?view:"overview";const definition=ROOT_VIEWS.find(item=>item.id===active);
  let body="";
  if(active==="overview")body=`<section class="phc-home-intro"><div><span class="phc-eyebrow">商品之家 · CURRENT</span><h2>商品全生命周期工作台</h2><p>从选品进入正式商品，自动连接素材、设计、利润、发布、订单、库存与采购。只在例外需要人。</p></div><button class="phc-primary" data-open-product>打开 ${PRODUCT_REF}</button></section><section class="phc-section"><h2>真实验证链</h2>${lifecycle()}</section>`;
  else body=PAGE_TYPE_RENDERERS[definition.type]({label:definition.label,center:{status:"active",label:definition.label}});
  host.innerHTML=`<section class="phc phc-home" aria-labelledby="phc-title">${pageHeader("商品之家","Product Truth：Google Drive CURRENT · 2026-09-08",status("active"))}${rootTabs(active)}<main class="phc-content">${body}</main></section>`;
  host.querySelector("[data-open-product]")?.addEventListener("click",()=>navigate({center:"product-center",product:PRODUCT_REF}));host.querySelectorAll("[data-root-view]").forEach(button=>button.addEventListener("click",()=>navigate({view:button.dataset.rootView})));
}
export async function initProductHomeCurrent(){
  const host=document.getElementById("app-main-host");if(!host)return false;document.body.dataset.productHome="current";
  const query=params(),centerId=query.get("center");
  if(query.get("product"))await renderProductWorkspace(host);else if(centerId&&centerById(centerId))await renderCenter(host,centerById(centerId),Math.max(0,Number(query.get("view")||0)));else renderRoot(host,query.get("view")||"overview");
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"hidden"}}));return true;
}
