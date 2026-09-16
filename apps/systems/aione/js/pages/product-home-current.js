import { PRODUCT_HOME_CENTERS } from "../config/home-registry.js?v=20260908-product-home-current";
import { aioneApi } from "../services/aione-api-client.js";

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
function toolbar({primary="",search="搜索"}={}){return `<div class="phc-toolbar">${primary?`<button class="phc-primary">${esc(primary)}</button>`:""}<label class="phc-search"><span>⌕</span><input type="search" placeholder="${esc(search)}"></label><button>筛选</button><button>排序</button><button>列设置</button><span class="phc-toolbar-spacer"></span><button>保存视图</button></div>`;}
function dataTable(columns,rows=[]){return `<div class="phc-table-wrap"><table class="phc-table"><thead><tr>${columns.map(x=>`<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr>${row.map((cell,index)=>`<td>${index===0?`<strong>${esc(cell)}</strong>`:esc(cell)}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${columns.length}"><div class="phc-table-empty">暂无真实记录</div></td></tr>`}</tbody></table></div>`;}
function metric(label,value,copy,state=""){return `<div class="phc-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(copy)}</small>${state?status(state):""}</div>`;}
function lifecycle(){
  const stages=[["Selection","CURRENT"],["Product","CURRENT"],["SKU","CURRENT"],["素材","VALIDATING"],["Design / Image","VALIDATING"],["Review","VALIDATING"],["Profit","VALIDATING"],["Publish","NOT YET IMPLEMENTED"],["Rakuten","NOT YET IMPLEMENTED"],["Order","NOT YET IMPLEMENTED"],["Inventory","NOT YET IMPLEMENTED"],["Procurement","NOT YET IMPLEMENTED"]];
  return `<div class="phc-lifecycle">${stages.map(([label,state],i)=>`<div class="phc-lifecycle__step"><span>${i+1}</span><strong>${esc(label)}</strong><small>${esc(state)}</small></div>`).join("")}</div>`;
}

const PAGE_TYPE_RENDERERS=Object.freeze({
  overview:({center})=>`<div class="phc-overview-grid">${metric("运行原则","Automation First","正常流程自动执行")}${metric("人工介入","By Exception","异常、低置信度、高风险与最终责任")}${metric("数据状态",center.status==='active'?"CURRENT":"VALIDATING","未接入能力不生成数字",center.status)}</div><section class="phc-section"><h2>当前工作</h2>${pending(`${center.label}业务聚合`,"overview",STATUS_LABEL[center.status]||"VALIDATING")}</section>`,
  "data-list":({label})=>`${toolbar({search:`搜索${label}`})}${dataTable(["对象","关联","状态","负责人","更新时间"])}`,
  "form-editor":({label})=>`<div class="phc-form"><label><span>执行范围</span><input disabled placeholder="待后端接入"></label><label><span>对象</span><input disabled placeholder="从统一对象选择"></label><label class="phc-form-wide"><span>说明</span><textarea disabled placeholder="不以临时表单生成正式数据"></textarea></label><div class="phc-form-actions"><button disabled>保存草稿</button><button class="phc-primary" disabled>${esc(label)}</button></div></div>`,
  "generator-wizard":({label})=>`<ol class="phc-steps"><li class="is-active"><b>1</b><span>选择对象</span></li><li><b>2</b><span>规则预览</span></li><li><b>3</b><span>冲突校验</span></li><li><b>4</b><span>生成结果</span></li></ol>${pending(label,"generator-wizard","NOT YET IMPLEMENTED","生成器共用统一规则引擎；后端未接入时不在浏览器制造正式编码或对象。")}`,
  "master-data":({label})=>`${toolbar({primary:`＋ 新增${label.replace("一览","")}`,search:`搜索${label}`})}${dataTable(["编码","名称","引用数","状态","更新时间"])}`,
  tree:({label})=>`<div class="phc-tree-layout"><section><h2>${esc(label)}</h2><div class="phc-tree-placeholder"><span>▸</span> 分类根节点<div><span>▸</span> 待后端接入真实层级</div></div></section><aside>${pending("节点详情","tree","NOT YET IMPLEMENTED")}</aside></div>`,
  mapping:({label})=>`${toolbar({primary:"＋ 新建映射",search:`搜索${label}`})}${dataTable(["AIONE 来源","平台 / 目标","转换规则","优先级","状态"])}`,
  ledger:({label})=>`${toolbar({search:`搜索${label}`})}${dataTable(["发生时间","业务类型","对象","变更前","变更后","来源单据"])}`,
  "rule-management":({label})=>`${toolbar({primary:"＋ 新建规则",search:`搜索${label}`})}${dataTable(["规则","Scope","条件","动作","优先级","状态"])}`,
  "batch-job-monitor":({label})=>`${toolbar({search:`搜索${label}`})}${dataTable(["任务 / 批次","执行方式","进度","成功","失败","状态"])}`,
  "analysis-report":()=>pending("利润分析","analysis-report","VALIDATING","只展示后端返回的真实成本与定价结果；前端不保留示例价格、示例成本或历史商品数据。"),
  "asset-management":({label})=>`${toolbar({search:`搜索${label}`})}<div class="phc-asset-groups"><div><strong>01_原始素材</strong><span>供应商 / 1688 原始证据</span></div><div><strong>02_实拍图</strong><span>美和实拍证据，可为空</span></div></div>${pending("ProductAsset 视图","asset-management","VALIDATING","物理目录只保留 01_原始素材 / 02_实拍图；SKU图、原始主图、详情图、白底图等作为 ProductAsset View/Filter，不再建立第二套物理目录。")}`,
  "electronic-publication":()=>`<div class="phc-publication"><aside><strong>目录</strong><a href="#phc-handbook-1">商品生命周期</a><a href="#phc-handbook-2">Automation First</a><a href="#phc-handbook-3">对象与责任</a></aside><article><span>CURRENT</span><h2 id="phc-handbook-1">商品从选品开始</h2><p>Selection 是商品生命周期入口。选品通过后，系统才创建正式 Product，并由统一规则建立 SKU。</p><h2 id="phc-handbook-2">Automation First, Human by Exception</h2><p>确定、可继承、可计算和可映射的工作由系统完成；员工处理异常、低置信度、高风险、首次正式发布确认与最终责任判断。</p><h2 id="phc-handbook-3">一个对象，一份事实</h2><p>Product、SKU、ProductAsset、DesignTask、Listing、Publish Job、Inventory 与 Procurement 各守边界，通过关系连接，不复制事实。</p></article></div>`,
  "error-queue":({label})=>`${toolbar({search:`搜索${label}`})}${dataTable(["严重度","错误类型","对象","可重试","负责人","状态"])}`
});
export { PAGE_TYPE_RENDERERS };

async function selectionData(){return aioneApi('/api/v1/selections?limit=50');}
function loading(){return `<div class="phc-loading"><span></span>正在通过 AIONE API Client 读取真实数据</div>`;}
function loadError(error){return `<div class="phc-inline-error"><strong>真实 API 暂不可用</strong><span>${esc(error?.message||"连接失败")}</span><small>页面保持可用，不以 Mock 数据替代。</small></div>`;}

async function renderSelectionView(stage,label,index){
  if(index===2){stage.innerHTML=PAGE_TYPE_RENDERERS["electronic-publication"]({label});return;}
  stage.innerHTML=loading();
  try{
    const payload=await selectionData();
    const items=Array.isArray(payload?.items)?payload.items:[];
    if(index===0){
      stage.innerHTML=`<div class="phc-overview-grid">${metric("真实 Selection",String(items.length),"仅统计 API 当前返回记录")}${metric("Product 创建","Qualified 后","Selection 通过后才允许创建正式 Product")}${metric("SKU 创建","Product 后","不得由前端硬编码")}</div>${items.length?"":pending("选品聚合","overview","CURRENT","当前没有 Selection 记录；保持真实空状态。")}`;
      return;
    }
    stage.innerHTML=`${toolbar({search:"搜索 Selection Code / 商品名 / 来源"})}${dataTable(["Selection Code","候选商品","来源","状态","正式商品"],items.map(item=>[item.selectionNo||item.id||"—",item.title||"—",item.sourcePlatform||"—",item.lifecycleStatus||"—",item.convertedProductCode||"—"]))}`;
  }catch(error){stage.innerHTML=loadError(error);}
}

async function renderProductWorkspace(host,productCode){
  host.innerHTML=`<section class="phc phc-object-workspace">${loading()}</section>`;
  try{
    const payload=await aioneApi(`/api/v1/design-center/workbench?product=${encodeURIComponent(productCode)}`);
    const workbench=payload?.workbench||{};
    const product=workbench?.product||{};
    const productData=product?.productData||{};
    const skuRows=Array.isArray(workbench?.skus)?workbench.skus:[];
    host.firstElementChild.innerHTML=`${pageHeader(product.productCode||productCode,"正式商品工作区 · 仅展示后端真实数据",status("active"))}<main class="phc-content"><section class="phc-section"><h2>Product Truth</h2>${dataTable(["字段","当前事实"],[["Product Code",product.productCode||productCode],["商品名称",product.name||productData.name||"—"],["生命周期",product.lifecycleStatus||"—"],["SKU 数量",String(skuRows.length)],["素材规则","01_原始素材 / 02_实拍图"]])}</section><section class="phc-section"><h2>SKU</h2>${dataTable(["SKU Code","状态"],skuRows.map(sku=>[sku.skuCode||sku.code||sku.id||"—",sku.status||"—"]))}</section><section class="phc-section"><h2>全链路状态</h2>${lifecycle()}</section></main>`;
  }catch(error){host.firstElementChild.innerHTML=`${loadError(error)}${pending("Product Workspace","object-detail","VALIDATING","未读取到真实 Product 时，不显示任何历史演示商品。")}`;}
}

function designLive(productCode){
  if(!productCode)return pending("设计中心","batch-job-monitor","VALIDATING","请选择真实 Product 后进入设计工作台。") ;
  return `<div class="phc-design-frame-wrap"><iframe class="phc-design-frame" src="./design-center-v1.html?product=${encodeURIComponent(productCode)}&embed=1" title="${esc(productCode)} 设计中心" loading="eager"></iframe></div>`;
}

async function renderCenter(host,center,index,query){
  const label=center.tabs[index]||center.tabs[0],type=(VIEW_TYPES[center.id]||[])[index]||"overview";
  host.innerHTML=`<section class="phc phc-center" aria-labelledby="phc-title">${pageHeader(center.label,CENTER_COPY[center.id],status(center.status))}${centerTabs(center,index)}<main class="phc-content" data-stage></main></section>`;
  const stage=host.querySelector("[data-stage]");
  if(center.id==="selection-center") await renderSelectionView(stage,label,index);
  else if(center.id==="product-center"&&index===0) stage.innerHTML=`<section class="phc-section"><h2>正式商品工作区</h2>${pending("Product 一览","data-list","VALIDATING","商品中心只接受正式 Product 数据源；历史演示商品已从运行时移除。")}</section><section class="phc-section"><h2>生命周期关系</h2>${lifecycle()}</section>`;
  else if(center.id==="product-center"&&(index===1||index===2)) stage.innerHTML=`${toolbar({search:index===1?"搜索商品编码 / 名称":"搜索 SKU Code / 商品"})}${dataTable(index===1?["商品编码","商品名称","SKU数","生命周期","发布状态"]:["SKU Code","Product Code","规格组合","状态","更新时间"])}`;
  else if(center.id==="design-center"&&index===2) stage.innerHTML=designLive(query.get("product"));
  else stage.innerHTML=PAGE_TYPE_RENDERERS[type]({center,label});
  host.querySelectorAll("[data-center-view]").forEach(button=>button.addEventListener("click",()=>navigate({center:center.id,view:button.dataset.centerView})));
}

function renderRoot(host,view){
  const active=ROOT_VIEWS.some(item=>item.id===view)?view:"overview";
  const definition=ROOT_VIEWS.find(item=>item.id===active);
  const body=active==="overview"
    ? `<section class="phc-home-intro"><div><span class="phc-eyebrow">商品之家 · CURRENT</span><h2>商品全生命周期工作台</h2><p>从真实 Selection 进入正式 Product，再连接素材、设计、利润、发布、订单、库存与采购。运行时不保留演示业务对象。</p></div></section><section class="phc-section"><h2>标准生命周期</h2>${lifecycle()}</section>`
    : PAGE_TYPE_RENDERERS[definition.type]({label:definition.label,center:{status:"active",label:definition.label}});
  host.innerHTML=`<section class="phc phc-home" aria-labelledby="phc-title">${pageHeader("商品之家","Product Truth：仅使用 CURRENT 对象与真实 API 数据",status("active"))}${rootTabs(active)}<main class="phc-content">${body}</main></section>`;
  host.querySelectorAll("[data-root-view]").forEach(button=>button.addEventListener("click",()=>navigate({view:button.dataset.rootView})));
}

export async function initProductHomeCurrent(){
  const host=document.getElementById("app-main-host");
  if(!host)return false;
  document.body.dataset.productHome="current";
  const query=params(),centerId=query.get("center"),productCode=query.get("product");
  if(productCode) await renderProductWorkspace(host,productCode);
  else if(centerId&&centerById(centerId)) await renderCenter(host,centerById(centerId),Math.max(0,Number(query.get("view")||0)),query);
  else renderRoot(host,query.get("view")||"overview");
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"hidden"}}));
  return true;
}
