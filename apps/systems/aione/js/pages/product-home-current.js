import { PRODUCT_HOME_CENTERS } from "../config/home-registry.js?v=20260903-product-home-current";
import { aioneApi } from "../services/aione-api-client.js";

const CURRENT_VALIDATION_PRODUCT = "MH0000002";

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

function currentParams(){
  const raw=String(window.location.hash||"");
  if(!raw.startsWith("#/product-home")) return new URLSearchParams();
  return raw.includes("?")?new URLSearchParams(raw.slice(raw.indexOf("?")+1)):new URLSearchParams();
}

function currentCenterId(){ return currentParams().get("center") || "home"; }
function currentProductRef(){ return currentParams().get("product") || ""; }
function currentProductSection(){ return currentParams().get("section") || "overview"; }

function centerDefinition(centerId){
  return PRODUCT_HOME_CENTERS.find((center)=>center.id===centerId) || null;
}

function navigateProduct(productRef,section="overview"){
  const params=new URLSearchParams({center:"product-center",product:productRef,section});
  window.location.hash=`#/product-home?${params.toString()}`;
}

function renderHomeOverview(host){
  host.innerHTML=`
    <section class="phc phc-home" aria-labelledby="phc-title">
      <header class="phc-page-head">
        <div>
          <h1 id="phc-title">商品之家</h1>
          <p>统一管理商品正式事实、素材、设计与发布状态。</p>
        </div>
      </header>
      <main class="phc-home-stage">
        <div class="phc-home-welcome phc-home-welcome--real">
          <div>
            <span class="phc-eyebrow">CURRENT · 真实业务入口</span>
            <h2>从真实商品开始工作</h2>
            <p>商品之家已经进入前后端联调阶段。当前先用真实商品打通 Product Truth → 素材 → 设计 → 审核 → 发布。</p>
          </div>
          <button type="button" class="phc-primary" data-action="open-current-product">打开 ${CURRENT_VALIDATION_PRODUCT}</button>
        </div>
      </main>
    </section>`;
  host.querySelector('[data-action="open-current-product"]')?.addEventListener("click",()=>navigateProduct(CURRENT_VALIDATION_PRODUCT));
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"light",kicker:"商品之家",title:"概览",text:"当前阶段优先跑通真实商品闭环，再扩展同类商品与其他分类。"}}));
}

function renderLoading(host,title="商品中心"){
  host.innerHTML=`<section class="phc phc-center"><header class="phc-page-head"><div><h1>${escapeHtml(title)}</h1><p>正在读取 CURRENT 商品事实与素材状态…</p></div></header><div class="phc-loading"><span></span>正在连接 AIONE 后端</div></section>`;
}

function renderLoadError(host,error){
  host.innerHTML=`<section class="phc phc-center"><header class="phc-page-head"><div><h1>商品中心</h1><p>真实商品工作区暂时无法读取。</p></div></header><div class="phc-error"><strong>连接失败</strong><span>${escapeHtml(error?.message||"未知错误")}</span><button type="button" data-action="retry-product">重新读取</button></div></section>`;
  host.querySelector('[data-action="retry-product"]')?.addEventListener("click",()=>renderProductCenter(host));
}

function productFactRows(workbench){
  const product=workbench?.product||{};
  const data=product.productData||{};
  const variants=Array.isArray(data.actualVariants)?data.actualVariants.filter(Boolean).join(" / "):"";
  return [
    ["商品编号",product.productCode],
    ["商品名称",product.name||product.productName],
    ["适用人群",data.targetGender],
    ["季节",data.season],
    ["长度 / 类型",data.lengthType],
    ["适用尺码",data.supportedSize],
    ["颜色 / 变体",variants],
    ["套装数",data.setCount],
    ["材质",data.material]
  ].filter(([,value])=>value!==undefined&&value!==null&&String(value).trim()!=="");
}

function materialCount(materials,key){ return Array.isArray(materials?.[key])?materials[key].length:0; }
function totalSourceCount(materials){
  const ids=new Set();
  Object.values(materials||{}).forEach((items)=>{ if(Array.isArray(items)) items.forEach((item)=>item?.id&&ids.add(item.id)); });
  return ids.size;
}

function designCenterMarkup(productRef){
  const src=`./design-center-v1.html?product=${encodeURIComponent(productRef)}&embed=1`;
  return `<div class="phc-design-live">
    <div class="phc-design-live__head">
      <div><span class="phc-eyebrow">LIVE DESIGN WORKSPACE</span><h2>设计中心</h2><p>直接在商品之家内操作真实 ProductAsset、Page Spec、DesignTask、生成结果和人工验收。</p></div>
      <a class="phc-link-button phc-link-button--secondary" href="${src.replace("&embed=1","")}" target="_blank" rel="noopener">新窗口打开</a>
    </div>
    <div class="phc-design-frame-wrap"><iframe class="phc-design-frame" src="${src}" title="${escapeHtml(productRef)} 设计中心" loading="eager"></iframe></div>
  </div>`;
}

function productSectionMarkup(section,workbench){
  const product=workbench.product||{};
  const data=product.productData||{};
  const materials=workbench.materials||{};
  const productRef=product.productCode||CURRENT_VALIDATION_PRODUCT;
  if(section==="facts"){
    const rows=productFactRows(workbench);
    return `<div class="phc-work-panel"><div class="phc-panel-head"><div><h2>Product Truth</h2><p>这里只显示当前已经存在的正式商品事实；未确认内容不由 AI 补写。</p></div><span class="phc-state phc-state--ready">CURRENT</span></div><div class="phc-facts">${rows.map(([label,value])=>`<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")||'<p class="phc-muted">暂无已确认商品事实。</p>'}</div></div>`;
  }
  if(section==="assets"){
    return `<div class="phc-work-panel"><div class="phc-panel-head"><div><h2>商品素材</h2><p>正式素材只认 ProductAsset；Google Drive 是来源，不在前端维护第二套事实。</p></div><span class="phc-state phc-state--ready">${totalSourceCount(materials)} 个素材</span></div><div class="phc-metric-grid"><div><b>${materialCount(materials,"sku")}</b><span>SKU图</span></div><div><b>${materialCount(materials,"product")+materialCount(materials,"whiteBackground")}</b><span>产品图 / 白底图</span></div><div><b>${materialCount(materials,"real")}</b><span>实拍图</span></div><div><b>${materialCount(materials,"detail")}</b><span>细节候选</span></div></div><p class="phc-note">CURRENT 素材目录仍保持：01_SKU图 / 02_产品图 / 03_实拍图。</p></div>`;
  }
  if(section==="design"){
    return designCenterMarkup(productRef);
  }
  if(section==="publish"){
    return `<div class="phc-work-panel"><div class="phc-panel-head"><div><h2>发布状态</h2><p>Approved DERIVED ProductAsset 将进入 Rakuten canonical publish，不要求员工手工搬运图片。</p></div><span class="phc-state phc-state--pending">待设计验收</span></div><div class="phc-pipeline"><span class="is-done">Product Truth</span><i>→</i><span class="is-done">SOURCE</span><i>→</i><span>Design</span><i>→</i><span>Review</span><i>→</i><span>Rakuten</span></div></div>`;
  }
  const facts=productFactRows(workbench);
  return `<div class="phc-workspace-overview"><div class="phc-work-panel"><div class="phc-panel-head"><div><span class="phc-eyebrow">真实商品工作区</span><h2>${escapeHtml(productRef)}</h2><p>${escapeHtml(product.name||product.productName||"当前验证商品")}</p></div><span class="phc-state phc-state--ready">可操作</span></div><div class="phc-summary-grid"><div><span>Product Truth</span><b>${facts.length}</b><small>已读取字段</small></div><div><span>ProductAsset</span><b>${totalSourceCount(materials)}</b><small>素材对象</small></div><div><span>适用尺码</span><b>${escapeHtml(data.supportedSize||"待确认")}</b><small>不推断数字</small></div><div><span>套装</span><b>${escapeHtml(data.setCount||"—")}</b><small>当前商品事实</small></div></div></div><div class="phc-next-step"><strong>当前员工下一步</strong><span>先查看素材和商品事实，再进入设计中心生成第一张真实白底图。</span><button type="button" class="phc-primary" data-open-section="design">进入设计</button></div></div>`;
}

async function loadWorkbench(productRef){
  const payload=await aioneApi(`/api/v1/design-center/workbench?product=${encodeURIComponent(productRef)}`);
  if(!payload?.workbench) throw new Error("后端未返回商品工作区。");
  return payload.workbench;
}

async function renderProductWorkspace(host,productRef){
  renderLoading(host,productRef);
  try{
    const workbench=await loadWorkbench(productRef);
    const product=workbench.product||{};
    const resolvedRef=product.productCode||productRef;
    const active=currentProductSection();
    const sections=[
      ["overview","概览"],["facts","商品事实"],["assets","商品素材"],["design","设计中心"],["publish","发布状态"]
    ];
    host.innerHTML=`<section class="phc phc-center phc-product-workspace" aria-labelledby="phc-title"><header class="phc-page-head phc-page-head--workspace"><div><button type="button" class="phc-back" data-action="back-products">← 商品中心</button><h1 id="phc-title">${escapeHtml(resolvedRef)}</h1><p>${escapeHtml(product.name||product.productName||"正式商品工作区")}</p></div><span class="phc-state phc-state--ready">REAL DATA</span></header><nav class="phc-tabs" aria-label="商品工作区">${sections.map(([id,label])=>`<button type="button" class="${id===active?"is-active":""}" data-product-section="${id}">${label}</button>`).join("")}</nav><main class="phc-content" data-phc-product-stage>${productSectionMarkup(active,workbench)}</main></section>`;
    host.querySelector('[data-action="back-products"]')?.addEventListener("click",()=>{window.location.hash="#/product-home?center=product-center";});
    const stage=host.querySelector("[data-phc-product-stage]");
    function switchSection(id){
      host.querySelectorAll("[data-product-section]").forEach((button)=>button.classList.toggle("is-active",button.dataset.productSection===id));
      stage.innerHTML=productSectionMarkup(id,workbench);
      stage.querySelector('[data-open-section="design"]')?.addEventListener("click",()=>switchSection("design"));
      const params=new URLSearchParams({center:"product-center",product:resolvedRef,section:id});
      history.replaceState(null,"",`${location.pathname}${location.search}#/${"product-home"}?${params.toString()}`);
    }
    host.querySelectorAll("[data-product-section]").forEach((button)=>button.addEventListener("click",()=>switchSection(button.dataset.productSection)));
    stage.querySelector('[data-open-section="design"]')?.addEventListener("click",()=>switchSection("design"));
    window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"light",kicker:"商品之家 · 商品中心",title:resolvedRef,text:"真实 Product Truth、ProductAsset、Design 与发布状态统一在同一商品对象下工作。"}}));
  }catch(error){ renderLoadError(host,error); }
}

function renderProductList(host,center,sections){
  host.innerHTML=`<section class="phc phc-center" aria-labelledby="phc-title"><header class="phc-page-head phc-page-head--center"><div><h1 id="phc-title">商品中心</h1><p>管理正式 Product、SKU 与商品工作区。</p></div></header><nav class="phc-tabs" aria-label="商品中心">${sections.map((label,index)=>`<button type="button" class="${index===0?"is-active":""}" data-phc-section="${index}">${label}</button>`).join("")}</nav><div class="phc-toolbar" data-phc-toolbar><button type="button" class="phc-primary">＋ 新建商品</button><label class="phc-search"><span>⌕</span><input type="search" placeholder="搜索商品 / SKU" value="${CURRENT_VALIDATION_PRODUCT}"></label><button type="button">筛选</button><button type="button">分组</button><button type="button">排序</button><span class="phc-toolbar-spacer"></span><button type="button">列表</button><button type="button">卡片</button></div><main class="phc-content" data-phc-stage><div class="phc-product-list"><button type="button" class="phc-product-row" data-product-ref="${CURRENT_VALIDATION_PRODUCT}"><span class="phc-product-thumb">M2</span><span class="phc-product-main"><strong>${CURRENT_VALIDATION_PRODUCT}</strong><small>冬款男袜 6双套装 · 当前真实验证商品</small></span><span class="phc-state phc-state--progress">设计联调</span><span class="phc-chevron">›</span></button></div></main></section>`;
  host.querySelector(`[data-product-ref="${CURRENT_VALIDATION_PRODUCT}"]`)?.addEventListener("click",()=>navigateProduct(CURRENT_VALIDATION_PRODUCT));
  const stage=host.querySelector("[data-phc-stage]");
  const toolbar=host.querySelector("[data-phc-toolbar]");
  host.querySelectorAll("[data-phc-section]").forEach((button)=>button.addEventListener("click",()=>{
    const index=Number(button.dataset.phcSection)||0; const section=sections[index];
    host.querySelectorAll("[data-phc-section]").forEach((item)=>item.classList.toggle("is-active",item===button));
    toolbar.hidden=section==="设置";
    if(index===0) stage.innerHTML=`<div class="phc-product-list"><button type="button" class="phc-product-row" data-product-ref="${CURRENT_VALIDATION_PRODUCT}"><span class="phc-product-thumb">M2</span><span class="phc-product-main"><strong>${CURRENT_VALIDATION_PRODUCT}</strong><small>冬款男袜 6双套装 · 当前真实验证商品</small></span><span class="phc-state phc-state--progress">设计联调</span><span class="phc-chevron">›</span></button></div>`;
    else if(section==="SKU") stage.innerHTML=`<div class="phc-empty-lite"><h2>SKU 统一归属于正式商品</h2><p>进入商品工作区后查看当前 SKU 与素材，不维护第二套商品事实。</p></div>`;
    else stage.innerHTML=`<div class="phc-settings-lite"><div><strong>商品编号规则</strong><span>统一 Product / SKU 编号与生成规则</span></div><div><strong>默认视图</strong><span>设置商品中心默认列表与卡片视图</span></div></div>`;
    stage.querySelector(`[data-product-ref="${CURRENT_VALIDATION_PRODUCT}"]`)?.addEventListener("click",()=>navigateProduct(CURRENT_VALIDATION_PRODUCT));
  }));
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"light",kicker:"商品之家",title:"商品中心",text:"从真实 Product 进入统一商品工作区，不复制 Product Truth。"}}));
}

async function renderProductCenter(host,center,sections){
  const productRef=currentProductRef();
  if(productRef) return renderProductWorkspace(host,productRef);
  return renderProductList(host,center,sections);
}

function genericEmpty(center,section){
  return `<div class="phc-empty-lite"><h2>${escapeHtml(section)}</h2><p>${escapeHtml(center.label)}的“${escapeHtml(section)}”已作为正式页面节保留，业务内容将在真实流程验证后逐步接入。</p></div>`;
}

function renderGenericCenter(host,center,sections){
  host.innerHTML=`<section class="phc phc-center" aria-labelledby="phc-title"><header class="phc-page-head phc-page-head--center"><div><h1 id="phc-title">${escapeHtml(center.label)}</h1><p>统一管理${escapeHtml(center.label.replace("中心",""))}相关事实、规则与业务能力。</p></div></header><nav class="phc-tabs" aria-label="${escapeHtml(center.label)}">${sections.map((label,index)=>`<button type="button" class="${index===0?"is-active":""}" data-phc-section="${index}">${escapeHtml(label)}</button>`).join("")}</nav><main class="phc-content" data-phc-stage>${genericEmpty(center,sections[0])}</main></section>`;
  const stage=host.querySelector("[data-phc-stage]");
  host.querySelectorAll("[data-phc-section]").forEach((button)=>button.addEventListener("click",()=>{const index=Number(button.dataset.phcSection)||0;host.querySelectorAll("[data-phc-section]").forEach((item)=>item.classList.toggle("is-active",item===button));stage.innerHTML=genericEmpty(center,sections[index]);}));
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"light",kicker:"商品之家",title:center.label,text:`${center.label}采用统一中心页母版。`}}));
}

async function renderCenter(host,centerId){
  const center=centerDefinition(centerId);
  if(!center){renderHomeOverview(host);return true;}
  const sections=Array.isArray(center.tabs)&&center.tabs.length?center.tabs:["概览"];
  if(centerId==="product-center") await renderProductCenter(host,center,sections);
  else renderGenericCenter(host,center,sections);
  return true;
}

export async function initProductHomeCurrent(){
  const host=document.getElementById("app-main-host");
  if(!host)return false;
  const centerId=currentCenterId();
  if(centerId==="home")return renderHomeOverview(host),true;
  await renderCenter(host,centerId);
  return true;
}
