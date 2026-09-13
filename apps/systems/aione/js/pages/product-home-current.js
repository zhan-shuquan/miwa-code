import { PRODUCT_HOME_CENTERS } from "../config/home-registry.js?v=20260913-commerce-flow-v1";
import { aioneApi } from "../services/aione-api-client.js";

const CURRENT_VALIDATION_PRODUCT = "MH0000002";

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function params(){
  const raw=String(location.hash||"");
  return raw.includes("?")?new URLSearchParams(raw.slice(raw.indexOf("?")+1)):new URLSearchParams();
}
function currentCenter(){return params().get("center")||"home";}
function currentProduct(){return params().get("product")||"";}
function currentView(){return params().get("view")||"overview";}
function centerDef(id){return PRODUCT_HOME_CENTERS.find((item)=>item.id===id)||null;}
function centerHref(center,product="",view=""){
  const p=new URLSearchParams({center});
  if(product)p.set("product",product);
  if(view)p.set("view",view);
  return `#/product-home?${p.toString()}`;
}
function go(center,product="",view=""){location.hash=centerHref(center,product,view);}

function state(label,tone="ready"){return `<span class="phc-state phc-state--${tone}">${escapeHtml(label)}</span>`;}
function materialCount(materials,key){return Array.isArray(materials?.[key])?materials[key].length:0;}
function totalAssets(materials){const ids=new Set();Object.values(materials||{}).forEach((items)=>Array.isArray(items)&&items.forEach((item)=>item?.id&&ids.add(item.id)));return ids.size;}
function factRows(workbench){
  const p=workbench?.product||{};const d=p.productData||{};
  const variants=Array.isArray(d.actualVariants)?d.actualVariants.filter(Boolean).join(" / "):"";
  return [["商品编号",p.productCode],["商品名称",p.name||p.productName],["适用人群",d.targetGender],["季节",d.season],["长度 / 类型",d.lengthType],["适用尺码",d.supportedSize],["颜色 / 变体",variants],["套装数",d.setCount],["材质",d.material]].filter(([,v])=>v!==undefined&&v!==null&&String(v).trim()!=="");
}

async function loadWorkbench(ref){
  const payload=await aioneApi(`/api/v1/design-center/workbench?product=${encodeURIComponent(ref)}`);
  if(!payload?.workbench)throw new Error("CURRENT 后端未返回商品工作区。");
  return payload.workbench;
}
async function loadDesignTasks(productId){
  if(!productId)return [];
  const payload=await aioneApi(`/api/v1/products/${encodeURIComponent(productId)}/design/tasks`);
  return Array.isArray(payload?.tasks)?payload.tasks:[];
}

function pageHead(title,description,extra=""){
  return `<header class="phc-page-head"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${extra}</header>`;
}
function loading(host,title){host.innerHTML=`<section class="phc">${pageHead(title,"正在读取 CURRENT 数据…")}<div class="phc-loading"><span></span>正在连接 AIONE 后端</div></section>`;}
function errorView(host,title,error,retry){host.innerHTML=`<section class="phc">${pageHead(title,"当前真实数据暂时无法读取。")}<div class="phc-error"><strong>读取失败</strong><span>${escapeHtml(error?.message||error)}</span><button type="button" data-retry>重新读取</button></div></section>`;host.querySelector("[data-retry]")?.addEventListener("click",retry);}

function flowMarkup(workbench,tasks=[]){
  const p=workbench?.product||{};const materials=workbench?.materials||{};
  const reviewed=tasks.filter((t)=>String(t.review_status||t.reviewStatus||"").toLowerCase().includes("approved")||String(t.lifecycle_status||t.lifecycleStatus||"").toLowerCase()==="approved").length;
  const steps=[
    ["01","选品","已转正式商品","done","工作之家"],
    ["02","商品","Product Truth 已建立","done",p.productCode||CURRENT_VALIDATION_PRODUCT],
    ["03","素材",`${totalAssets(materials)} 个 CURRENT SOURCE`,`done","人工筛选"],
    ["04","设计",tasks.length?`${tasks.length} 个 DesignTask`:"进入设计中心","current","Design Center"],
    ["05","审核",reviewed?`${reviewed} 个 Approved`:"待人工审核",reviewed?"done":"pending","Human Review"],
    ["06","乐天素材","Approved → Canonical Pack","pending","Cabinet API"],
    ["07","商品上架","CURRENT 尚未接 Item API","blocked","真实缺口"]
  ];
  return `<div class="phc-flow">${steps.map(([n,name,desc,tone,meta])=>`<div class="phc-flow__step is-${tone}"><span class="phc-flow__no">${n}</span><div><strong>${escapeHtml(name)}</strong><p>${escapeHtml(desc)}</p><small>${escapeHtml(meta)}</small></div></div>`).join("")}</div>`;
}

function homeMarkup(){
  return `<section class="phc phc-home">${pageHead("商品之家","从正式商品事实到设计、审核与渠道发布的统一商品操作空间。")}
    <div class="phc-command-card">
      <div><span class="phc-eyebrow">CURRENT BUSINESS FLOW</span><h2>选品进入正式商品后，从这里继续完成商品化</h2><p>选品属于工作之家；正式 Product 进入商品之家。设计任务归设计中心，Approved 结果进入发布中心。</p></div>
      <button type="button" class="phc-primary" data-open-current>打开 ${CURRENT_VALIDATION_PRODUCT}</button>
    </div>
    <div class="phc-home-grid">
      <a href="${centerHref("product-center")}"><span>01</span><strong>商品中心</strong><p>Product / SKU / Product Truth / ProductAsset</p></a>
      <a href="${centerHref("design-center",CURRENT_VALIDATION_PRODUCT,"tasks")}"><span>02</span><strong>设计中心</strong><p>DesignTask / 生成 / 人工审核 / Approved</p></a>
      <a href="${centerHref("publish-center",CURRENT_VALIDATION_PRODUCT)}"><span>03</span><strong>发布中心</strong><p>Canonical Pack / Rakuten Cabinet / 发布状态</p></a>
    </div>
    <div class="phc-truth-note"><strong>CURRENT 边界</strong><span>后端目前真实打通到 Rakuten Cabinet canonical publish；Rakuten 商品 Item API 创建/更新尚未进入 CURRENT，因此最终“商品上架”不会在前端伪装成已完成。</span></div>
  </section>`;
}
function renderHome(host){host.innerHTML=homeMarkup();host.querySelector("[data-open-current]")?.addEventListener("click",()=>go("product-center",CURRENT_VALIDATION_PRODUCT));}

function productTabs(active){
  const tabs=[["overview","概览"],["facts","商品事实"],["assets","商品素材"],["lifecycle","生命周期"]];
  return `<nav class="phc-tabs">${tabs.map(([id,label])=>`<button class="${active===id?"is-active":""}" data-product-view="${id}">${label}</button>`).join("")}</nav>`;
}
function productBody(view,workbench,tasks){
  const p=workbench.product||{};const d=p.productData||{};const m=workbench.materials||{};const ref=p.productCode||CURRENT_VALIDATION_PRODUCT;
  if(view==="facts")return `<div class="phc-work-panel"><div class="phc-panel-head"><div><h2>Product Truth</h2><p>只展示数据库中已经确认的正式商品事实；AI 不补写缺失事实。</p></div>${state("CURRENT")}</div><div class="phc-facts">${factRows(workbench).map(([k,v])=>`<div><span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong></div>`).join("")}</div></div>`;
  if(view==="assets")return `<div class="phc-work-panel"><div class="phc-panel-head"><div><h2>CURRENT ProductAsset</h2><p>Google Drive 是来源；正式设计输入以 ProductAsset + Human Material Confirmation 为准。</p></div>${state(`${totalAssets(m)} 个素材`)}</div><div class="phc-metric-grid"><div><b>${materialCount(m,"sku")}</b><span>01_SKU图</span></div><div><b>${materialCount(m,"product")+materialCount(m,"whiteBackground")+materialCount(m,"detail")}</b><span>02_产品图</span></div><div><b>${materialCount(m,"real")}</b><span>03_实拍图</span></div><div><b>${totalAssets(m)}</b><span>CURRENT SOURCE</span></div></div><p class="phc-note">人工筛选节点保留；旧 1688 SOURCE 只保留历史证据，不参与当前 AI 设计。</p></div>`;
  if(view==="lifecycle")return `<div class="phc-work-panel"><div class="phc-panel-head"><div><h2>从选品到上架</h2><p>同一个商品对象在各中心推进，不复制第二套事实。</p></div>${state("真实链路","progress")}</div>${flowMarkup(workbench,tasks)}</div>`;
  return `<div class="phc-workspace-overview">
    <div class="phc-object-hero"><div><span class="phc-eyebrow">FORMAL PRODUCT</span><h2>${escapeHtml(ref)}</h2><p>${escapeHtml(p.name||p.productName||"正式商品")}</p></div>${state("正式商品")}</div>
    <div class="phc-summary-grid"><div><span>商品事实</span><b>${factRows(workbench).length}</b><small>Product Truth</small></div><div><span>CURRENT 素材</span><b>${totalAssets(m)}</b><small>ProductAsset</small></div><div><span>设计任务</span><b>${tasks.length}</b><small>DesignTask</small></div><div><span>适用尺码</span><b>${escapeHtml(d.supportedSize||"待确认")}</b><small>不推断数字</small></div></div>
    <div class="phc-cross-actions"><a href="${centerHref("design-center",ref,"tasks")}"><strong>进入设计中心</strong><span>创建/执行 DesignTask、查看生成结果并审核</span><i>→</i></a><a href="${centerHref("publish-center",ref)}"><strong>进入发布中心</strong><span>查看 Approved 资产、Rakuten canonical pack 与发布状态</span><i>→</i></a></div>
    ${flowMarkup(workbench,tasks)}
  </div>`;
}
async function renderProductWorkspace(host,ref){
  loading(host,ref);
  try{
    const wb=await loadWorkbench(ref);const productId=wb.product?.id;let tasks=[];try{tasks=await loadDesignTasks(productId);}catch{}
    const resolved=wb.product?.productCode||ref;let active=currentView();if(!["overview","facts","assets","lifecycle"].includes(active))active="overview";
    host.innerHTML=`<section class="phc">${pageHead(resolved,wb.product?.name||wb.product?.productName||"正式商品工作区",state("REAL DATA"))}${productTabs(active)}<main data-product-stage>${productBody(active,wb,tasks)}</main></section>`;
    const stage=host.querySelector("[data-product-stage]");
    host.querySelectorAll("[data-product-view]").forEach((btn)=>btn.addEventListener("click",()=>{const v=btn.dataset.productView;host.querySelectorAll("[data-product-view]").forEach((x)=>x.classList.toggle("is-active",x===btn));stage.innerHTML=productBody(v,wb,tasks);history.replaceState(null,"",`${location.pathname}${location.search}${centerHref("product-center",resolved,v)}`);}));
  }catch(e){errorView(host,ref,e,()=>renderProductWorkspace(host,ref));}
}
function renderProductList(host){
  host.innerHTML=`<section class="phc">${pageHead("商品中心","正式 Product、SKU、Product Truth 与 ProductAsset 的唯一业务入口。")}
    <div class="phc-toolbar"><label class="phc-search"><span>⌕</span><input value="${CURRENT_VALIDATION_PRODUCT}" placeholder="搜索商品 / SKU"></label><button>筛选</button><button>分组</button><button>排序</button></div>
    <div class="phc-product-list"><button class="phc-product-row" data-product="${CURRENT_VALIDATION_PRODUCT}"><span class="phc-product-thumb">M2</span><span class="phc-product-main"><strong>${CURRENT_VALIDATION_PRODUCT}</strong><small>冬款男袜 6双套装 · 当前真实验证商品</small></span>${state("商品化中","progress")}<span class="phc-chevron">›</span></button></div>
  </section>`;
  host.querySelector("[data-product]")?.addEventListener("click",()=>go("product-center",CURRENT_VALIDATION_PRODUCT));
}
async function renderProductCenter(host){const ref=currentProduct();if(ref)return renderProductWorkspace(host,ref);renderProductList(host);}

function designFrame(ref){const src=`./design-center-v1.html?product=${encodeURIComponent(ref)}&embed=1`;return `<div class="phc-design-frame-wrap"><iframe class="phc-design-frame" src="${src}" title="${escapeHtml(ref)} 设计中心"></iframe></div>`;}
async function renderDesignCenter(host){
  const ref=currentProduct()||CURRENT_VALIDATION_PRODUCT;const view=currentView();loading(host,"设计中心");
  try{
    const wb=await loadWorkbench(ref);let tasks=[];try{tasks=await loadDesignTasks(wb.product?.id);}catch{}
    const tabs=[["overview","概览"],["tasks","设计任务"],["design","商品设计"],["templates","设计模板"],["rules","设计规则"]];
    let active=tabs.some(([id])=>id===view)?view:"overview";
    const taskStats={total:tasks.length,approved:tasks.filter((t)=>String(t.lifecycle_status||t.lifecycleStatus||"").toLowerCase()==="approved"||String(t.review_status||t.reviewStatus||"").toLowerCase()==="approved").length};
    const body=(v)=>{
      if(v==="design")return designFrame(ref);
      if(v==="tasks")return `<div class="phc-work-panel"><div class="phc-panel-head"><div><h2>设计任务</h2><p>DesignTask 在这里统一创建、执行、审核与重做；商品中心只显示状态。</p></div>${state(`${taskStats.total} 个任务`,"progress")}</div><div class="phc-summary-grid"><div><span>全部任务</span><b>${taskStats.total}</b><small>DesignTask</small></div><div><span>Approved</span><b>${taskStats.approved}</b><small>人工通过</small></div><div><span>图片工作流</span><b>8</b><small>当前执行能力</small></div><div><span>待处理</span><b>${Math.max(0,taskStats.total-taskStats.approved)}</b><small>执行 / 审核</small></div></div><div class="phc-action-card"><div><strong>打开 ${escapeHtml(ref)} 商品设计工作区</strong><span>素材绑定 → Page Spec → DesignTask → Design Engine → DERIVED → 人工审核</span></div><button class="phc-primary" data-open-design>开始设计</button></div></div>`;
      if(v==="templates")return `<div class="phc-work-panel"><div class="phc-panel-head"><div><h2>设计模板</h2><p>模板是分类级复用能力，不为每个商品复制一套设计逻辑。</p></div>${state("统一模板")}</div><div class="phc-truth-note"><strong>当前验证</strong><span>男袜模板正在通过 ${escapeHtml(ref)} 的真实素材和 Product Truth 验证；模板与商品事实分离。</span></div></div>`;
      if(v==="rules")return `<div class="phc-work-panel"><div class="phc-panel-head"><div><h2>设计规则</h2><p>事实由 Product Truth 提供，AI 只负责视觉与受控生成；尺寸、规格等事实型页面优先确定性渲染。</p></div>${state("Fail Closed")}</div>${flowMarkup(wb,tasks)}</div>`;
      return `<div class="phc-workspace-overview"><div class="phc-object-hero"><div><span class="phc-eyebrow">DESIGN CENTER</span><h2>${escapeHtml(ref)} · 设计生产线</h2><p>这里是设计任务的正式归属，不在商品中心维护第二套任务。</p></div>${state("CURRENT")}</div><div class="phc-summary-grid"><div><span>CURRENT SOURCE</span><b>${totalAssets(wb.materials)}</b><small>ProductAsset</small></div><div><span>DesignTask</span><b>${taskStats.total}</b><small>设计任务</small></div><div><span>Approved</span><b>${taskStats.approved}</b><small>人工审核通过</small></div><div><span>执行能力</span><b>10</b><small>Design Engine</small></div></div><div class="phc-cross-actions"><a href="${centerHref("design-center",ref,"tasks")}"><strong>设计任务</strong><span>看任务队列和审核状态</span><i>→</i></a><a href="${centerHref("design-center",ref,"design")}"><strong>商品设计</strong><span>进入真实设计工作区</span><i>→</i></a></div></div>`;
    };
    host.innerHTML=`<section class="phc">${pageHead("设计中心",`${ref} · DesignTask / 生成 / 审核 / Approved`)}<nav class="phc-tabs">${tabs.map(([id,label])=>`<button class="${active===id?"is-active":""}" data-design-view="${id}">${label}</button>`).join("")}</nav><main data-center-stage>${body(active)}</main></section>`;
    const stage=host.querySelector("[data-center-stage]");
    const switchView=(v)=>{host.querySelectorAll("[data-design-view]").forEach((x)=>x.classList.toggle("is-active",x.dataset.designView===v));stage.innerHTML=body(v);stage.querySelector("[data-open-design]")?.addEventListener("click",()=>switchView("design"));history.replaceState(null,"",`${location.pathname}${location.search}${centerHref("design-center",ref,v)}`);};
    host.querySelectorAll("[data-design-view]").forEach((btn)=>btn.addEventListener("click",()=>switchView(btn.dataset.designView)));stage.querySelector("[data-open-design]")?.addEventListener("click",()=>switchView("design"));
  }catch(e){errorView(host,"设计中心",e,()=>renderDesignCenter(host));}
}

async function renderPublishCenter(host){
  const ref=currentProduct()||CURRENT_VALIDATION_PRODUCT;loading(host,"发布中心");
  try{
    const wb=await loadWorkbench(ref);let tasks=[];try{tasks=await loadDesignTasks(wb.product?.id);}catch{}
    const approved=tasks.filter((t)=>String(t.lifecycle_status||t.lifecycleStatus||"").toLowerCase()==="approved"||String(t.review_status||t.reviewStatus||"").toLowerCase()==="approved").length;
    host.innerHTML=`<section class="phc">${pageHead("发布中心",`${ref} · Approved 设计结果到渠道发布的统一出口`)}
      <nav class="phc-tabs"><button class="is-active">概览</button><button>待发布</button><button>已发布</button><button>发布规则</button></nav>
      <div class="phc-workspace-overview">
        <div class="phc-object-hero"><div><span class="phc-eyebrow">RAKUTEN PUBLISH</span><h2>Rakuten canonical publish</h2><p>Approved DERIVED ProductAsset → Canonical Pack → Rakuten Cabinet。</p></div>${state(approved?`${approved} Approved`:`待设计审核`,approved?"ready":"pending")}</div>
        <div class="phc-summary-grid"><div><span>Approved 设计</span><b>${approved}</b><small>发布输入</small></div><div><span>Canonical Pack</span><b>${approved?"可检查":"待就绪"}</b><small>图片包</small></div><div><span>Rakuten Cabinet</span><b>已接入</b><small>Cabinet API</small></div><div><span>Rakuten Item</span><b>未接入</b><small>Item API</small></div></div>
        <div class="phc-publish-board"><div class="is-ready"><span>01</span><div><strong>Approved 资产</strong><p>设计中心人工审核通过后进入发布输入。</p></div></div><div class="${approved?"is-ready":"is-waiting"}"><span>02</span><div><strong>Canonical Pack</strong><p>按 Rakuten 文件命名与槽位规则形成正式发布包。</p></div></div><div class="is-ready"><span>03</span><div><strong>Rakuten Cabinet</strong><p>CURRENT 后端已具备文件夹、容量与 canonical 图片上传能力。</p></div></div><div class="is-blocked"><span>04</span><div><strong>商品 Item API 上架</strong><p>当前 Repo 尚无商品创建/更新 Item API 实现，因此这里明确阻断，不伪造“已上架”。</p></div></div></div>
        <div class="phc-truth-note phc-truth-note--risk"><strong>CURRENT 最后一段真实缺口</strong><span>今天要真正完成“上架”，下一项工程工作不是继续美化前端，而是接入 Rakuten 商品 Item API，并建立 Product Truth → Rakuten Item Contract → 发布回执/状态。</span></div>
      </div>
    </section>`;
  }catch(e){errorView(host,"发布中心",e,()=>renderPublishCenter(host));}
}

function genericCenter(host,id){const c=centerDef(id);const tabs=c?.tabs||["概览"];host.innerHTML=`<section class="phc">${pageHead(c?.label||"商品之家","该中心已进入商品之家统一目录。")}<nav class="phc-tabs">${tabs.map((x,i)=>`<button class="${i===0?"is-active":""}">${escapeHtml(x)}</button>`).join("")}</nav><div class="phc-empty-lite"><h2>${escapeHtml(c?.label||"")}</h2><p>当前主线先完成选品 → 商品 → 素材 → 设计 → 审核 → 发布；该中心保持正式入口，不用临时页面冒充业务完成。</p></div></section>`;}

export async function initProductHomeCurrent(){
  const host=document.getElementById("app-main-host");if(!host)return false;
  const center=currentCenter();
  if(center==="home"){renderHome(host);return true;}
  if(center==="product-center"){await renderProductCenter(host);return true;}
  if(center==="design-center"){await renderDesignCenter(host);return true;}
  if(center==="publish-center"){await renderPublishCenter(host);return true;}
  genericCenter(host,center);return true;
}
