import { PRODUCT_HOME_CENTERS } from "../config/home-registry.js?v=20260903-product-home-current";
import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260903-product-home-current";

const SECTION_MAP = Object.freeze({
  "product-center": ["全部商品", "SKU", "设置"],
  "design-center": ["概览", "商品设计", "设计模板", "设计规则"],
  "publish-center": ["概览", "待发布", "已发布", "发布规则"],
  "cost-center": ["概览", "成本明细", "成本规则"],
  "price-center": ["概览", "售价", "渠道价格", "调价规则"],
  "profit-center": ["概览", "毛利", "利润", "盈亏分析"],
  "brand-center": ["概览", "美和品牌", "品牌注册"],
  "attribute-center": ["属性", "属性组", "映射", "设置"],
  "specification-center": ["规格模板", "规格值", "SKU组合", "设置"],
  "coding-center": ["商品编码", "JAN / GTIN", "外部编码", "设置"],
  "sampling-center": ["概览", "待测样", "测样记录", "标准"],
  "procurement-center": ["概览", "采购关系", "采购记录", "规则"],
  "inventory-center": ["概览", "库存", "库存流水", "规则"],
  "operations-center": ["概览", "运营状态", "活动", "优化记录"],
  "service-center": ["概览", "商品问题", "客诉记录", "服务资料"],
  "asset-center": ["全部资料", "图片", "文档", "表格", "其他"]
});

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
    <section class="phc" aria-labelledby="phc-title">
      <header class="phc-head">
        <div class="phc-head__icon" data-icon="product"></div>
        <div>
          <div class="phc-eyebrow">PRODUCT HOME</div>
          <h1 id="phc-title">商品之家</h1>
          <p>统一承载商品正式事实、专业规则与商品域能力。当前先锁定章节、导航与页面母版，业务内容按真实使用逐章建设。</p>
        </div>
      </header>
      <nav class="phc-tabs" aria-label="商品之家章节">
        <a class="is-active" href="#/product-home">概览</a>
        <a href="#/product-home?center=asset-center">资料中心</a>
      </nav>
      <main class="phc-stage">
        <div class="phc-empty">
          <div class="phc-empty__icon" data-icon="product"></div>
          <h2>商品之家框架已建立</h2>
          <p>先稳定“章 / 节 / 路由 / 页面母版”。各中心的业务内容将在对应章节确认后再接入，不再使用旧页面填充。</p>
          <span>当前状态｜结构已锁定 · 内容待逐章建设</span>
        </div>
      </main>
    </section>`;
  renderSemanticIcons(host);
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"light",kicker:"商品之家",title:"概览",text:"商品之家当前进入结构优先阶段：先固定章、节和页面母版，再逐章建设真实业务内容。"}}));
}

function renderCenter(host,centerId){
  const center=centerDefinition(centerId);
  if(!center){renderHomeOverview(host);return true;}
  const sections=SECTION_MAP[centerId] || ["概览"];
  host.innerHTML=`
    <section class="phc" aria-labelledby="phc-title">
      <header class="phc-head">
        <div class="phc-head__icon" data-icon="${center.icon||"product"}"></div>
        <div>
          <div class="phc-eyebrow">PRODUCT HOME · CENTER</div>
          <h1 id="phc-title">${center.label}</h1>
          <p>当前先锁定本章的横向“节”和统一页面骨架；正式业务内容后续在这套母版内继续建设。</p>
        </div>
      </header>
      <nav class="phc-tabs" aria-label="${center.label}章节">
        ${sections.map((label,index)=>`<button type="button" class="${index===0?"is-active":""}" data-phc-section="${index}">${label}</button>`).join("")}
      </nav>
      <main class="phc-stage" data-phc-stage>
        <div class="phc-empty">
          <div class="phc-empty__icon" data-icon="${center.icon||"product"}"></div>
          <h2>${sections[0]}</h2>
          <p>${center.label}的页面结构已就位。这里暂不加载任何旧版业务页面。</p>
          <span>当前状态｜章节已就位 · 内容待建设</span>
        </div>
      </main>
    </section>`;
  renderSemanticIcons(host);
  const stage=host.querySelector("[data-phc-stage]");
  host.querySelectorAll("[data-phc-section]").forEach((button)=>button.addEventListener("click",()=>{
    const index=Number(button.dataset.phcSection)||0;
    host.querySelectorAll("[data-phc-section]").forEach((item)=>item.classList.toggle("is-active",item===button));
    stage.innerHTML=`<div class="phc-empty"><div class="phc-empty__icon" data-icon="${center.icon||"product"}"></div><h2>${sections[index]}</h2><p>${center.label} · ${sections[index]} 已作为稳定“节”保留，正式内容后续接入。</p><span>当前状态｜节已锁定 · 内容待建设</span></div>`;
    renderSemanticIcons(stage);
  }));
  window.dispatchEvent(new CustomEvent("aione:page-aside-context",{detail:{state:"light",kicker:"商品之家",title:center.label,text:`${center.label}当前只保留统一章节骨架和横向节，不再加载旧页面。`}}));
  return true;
}

export function initProductHomeCurrent(){
  const host=document.getElementById("app-main-host");
  if(!host)return false;
  const centerId=currentCenterId();
  if(centerId==="home")return renderHomeOverview(host),true;
  return renderCenter(host,centerId);
}
