import { PRODUCT_HOME_CENTERS } from "../config/home-registry.js?v=20260903-product-home-current";

function currentCenterId(){
  const raw=String(window.location.hash||"");
  if(!raw.startsWith("#/product-home"))return null;
  const query=raw.includes("?")?new URLSearchParams(raw.slice(raw.indexOf("?")+1)):new URLSearchParams();
  return query.get("center") || "home";
}

function centerDefinition(centerId){
  return PRODUCT_HOME_CENTERS.find((center)=>center.id===centerId) || null;
}

function renderHomeOverview(host){
  host.innerHTML=`
    <section class="phc phc-home" aria-labelledby="phc-title">
      <header class="phc-page-head">
        <div>
          <h1 id="phc-title">商品之家</h1>
          <p>统一管理商品正式事实、专业规则与商品域能力。</p>
        </div>
      </header>
      <main class="phc-home-stage">
        <div class="phc-home-welcome">
          <h2>商品之家</h2>
          <p>从左侧进入各专业中心；商品资料统一从顶部“资料中心”进入。</p>
        </div>
      </main>
    </section>`;
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"light",kicker:"商品之家",title:"概览",text:"统一查看商品域状态，并进入各专业中心。"}}));
}

function productEmpty(section){
  if(section==="SKU") return `<div class="phc-empty-lite"><h2>暂无 SKU</h2><p>商品建立 SKU 后将在这里统一管理。</p></div>`;
  if(section==="设置") return `<div class="phc-settings-lite"><div><strong>商品编号规则</strong><span>统一 Product / SKU 编号与生成规则</span></div><div><strong>默认视图</strong><span>设置商品中心默认列表与卡片视图</span></div></div>`;
  return `<div class="phc-empty-lite"><h2>暂无商品</h2><p>新建正式商品后，将在这里统一管理商品与 SKU。</p><button type="button" class="phc-primary">＋ 新建商品</button></div>`;
}

function renderProductCenter(host,center,sections){
  host.innerHTML=`
    <section class="phc phc-center" aria-labelledby="phc-title">
      <header class="phc-page-head phc-page-head--center">
        <div>
          <h1 id="phc-title">商品中心</h1>
          <p>管理正式商品、SKU 与商品基础设置。</p>
        </div>
      </header>
      <nav class="phc-tabs" aria-label="商品中心">
        ${sections.map((label,index)=>`<button type="button" class="${index===0?"is-active":""}" data-phc-section="${index}">${label}</button>`).join("")}
      </nav>
      <div class="phc-toolbar" data-phc-toolbar>
        <button type="button" class="phc-primary">＋ 新建商品</button>
        <label class="phc-search"><span>⌕</span><input type="search" placeholder="搜索商品 / SKU"></label>
        <button type="button">筛选</button>
        <button type="button">分组</button>
        <button type="button">排序</button>
        <span class="phc-toolbar-spacer"></span>
        <button type="button">列表</button>
        <button type="button">卡片</button>
      </div>
      <main class="phc-content" data-phc-stage>${productEmpty(sections[0])}</main>
    </section>`;

  const stage=host.querySelector("[data-phc-stage]");
  const toolbar=host.querySelector("[data-phc-toolbar]");
  host.querySelectorAll("[data-phc-section]").forEach((button)=>button.addEventListener("click",()=>{
    const index=Number(button.dataset.phcSection)||0;
    const section=sections[index];
    host.querySelectorAll("[data-phc-section]").forEach((item)=>item.classList.toggle("is-active",item===button));
    toolbar.hidden=section==="设置";
    stage.innerHTML=productEmpty(section);
  }));
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"light",kicker:"商品之家",title:"商品中心",text:"管理正式 Product、SKU 与商品基础设置。"}}));
}

function genericEmpty(center,section){
  return `<div class="phc-empty-lite"><h2>${section}</h2><p>${center.label}的“${section}”已作为正式页面节保留，业务内容将在实际使用时逐步接入。</p></div>`;
}

function renderGenericCenter(host,center,sections){
  host.innerHTML=`
    <section class="phc phc-center" aria-labelledby="phc-title">
      <header class="phc-page-head phc-page-head--center">
        <div>
          <h1 id="phc-title">${center.label}</h1>
          <p>统一管理${center.label.replace("中心","")}相关事实、规则与业务能力。</p>
        </div>
      </header>
      <nav class="phc-tabs" aria-label="${center.label}">
        ${sections.map((label,index)=>`<button type="button" class="${index===0?"is-active":""}" data-phc-section="${index}">${label}</button>`).join("")}
      </nav>
      <main class="phc-content" data-phc-stage>${genericEmpty(center,sections[0])}</main>
    </section>`;
  const stage=host.querySelector("[data-phc-stage]");
  host.querySelectorAll("[data-phc-section]").forEach((button)=>button.addEventListener("click",()=>{
    const index=Number(button.dataset.phcSection)||0;
    host.querySelectorAll("[data-phc-section]").forEach((item)=>item.classList.toggle("is-active",item===button));
    stage.innerHTML=genericEmpty(center,sections[index]);
  }));
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"light",kicker:"商品之家",title:center.label,text:`${center.label}采用统一中心页母版。`}}));
}

function renderCenter(host,centerId){
  const center=centerDefinition(centerId);
  if(!center){renderHomeOverview(host);return true;}
  const sections=Array.isArray(center.tabs)&&center.tabs.length?center.tabs:["概览"];
  if(centerId==="product-center") renderProductCenter(host,center,sections);
  else renderGenericCenter(host,center,sections);
  return true;
}

export function initProductHomeCurrent(){
  const host=document.getElementById("app-main-host");
  if(!host)return false;
  const centerId=currentCenterId();
  if(centerId==="home")return renderHomeOverview(host),true;
  return renderCenter(host,centerId);
}
