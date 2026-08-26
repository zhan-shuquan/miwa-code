/* ========================================
   MIWA Business Home｜事业之家数字出版型 Main V1.9.31
   参考《美和集团AI执行总架构》信息表达：强结论、分区、卡片、留白、可打印。
======================================== */

import { getRouteId } from "../config/route-registry.js";
import { setCurrentBusinessSpace } from "../shell/platform-context.js";
import {
  MIWA_BUSINESS_HOME_SUBTITLE,
  MIWA_BUSINESS_NAVIGATION,
  MIWA_BUSINESSES,
  MIWA_BUSINESS_BY_ROUTE,
  MIWA_BUSINESS_PAGES,
  getBusinessGroup
} from "../data/miwa-business-home-content.js";

const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));

function pageHero(page, options = {}) {
  const back = options.backRoute ? `<a class="miwa-business-btn miwa-business-btn--light" href="#/${esc(options.backRoute)}">返回${esc(options.backLabel || "事业之家")} ←</a>` : "";
  return `
    <header class="miwa-business-page-hero miwa-business-print-page">
      <span class="miwa-business-page-hero__index">${esc(page.eyebrow || "MIWA GROUP BUSINESS")}</span>
      <h1>${esc(page.title)}</h1>
      <p>${esc(page.subtitle || "")}</p>
      <div class="miwa-business-page-hero__actions">${back}<button type="button" class="miwa-business-btn miwa-business-btn--primary" data-business-action="print">导出 A4 PDF</button></div>
    </header>`;
}

function coverHtml() {
  return `
    <section class="miwa-business-cover miwa-business-print-page">
      <div class="miwa-business-cover__rule"></div>
      <div class="miwa-business-cover__copy">
        <span class="miwa-business-cover__eyebrow">MIWA GROUP BUSINESS</span>
        <h1>事业之家</h1>
        <p>${esc(MIWA_BUSINESS_HOME_SUBTITLE)}</p>
        <div class="miwa-business-cover__principles"><span>真实业务优先</span><span>事业独立经营</span><span>集团能力共享</span><span>人AI协同</span></div>
      </div>
      <div class="miwa-business-cover__footer"><span>美和AIONE一体化工作平台｜集团事业总入口</span><b>2026.08</b></div>
    </section>`;
}

function businessAction(item, compact = false) {
  if (item.spaceId) return `<button type="button" class="miwa-business-btn miwa-business-btn--primary" data-business-enter="${esc(item.spaceId)}">进入事业</button>`;
  return `<a class="miwa-business-btn${compact ? " miwa-business-btn--compact" : ""}" href="#/${esc(item.route)}">查看介绍</a>`;
}

function businessCard(item, options = {}) {
  const flow = item.flow?.length ? `<div class="miwa-business-card__flow">${item.flow.slice(0, options.flowLimit || 6).map((step) => `<span>${esc(step)}</span>`).join("<b>→</b>")}${item.flow.length > (options.flowLimit || 6) ? `<em>…</em>` : ""}</div>` : "";
  return `<article class="miwa-business-card" data-business-category="${esc(item.category)}">
    <div class="miwa-business-card__head"><div><span>${esc(item.tagline)}</span><h3>${esc(item.name)}</h3></div><b>${esc(item.stage)}</b></div>
    <p>${esc(item.description)}</p>
    ${flow}
    <div class="miwa-business-card__actions"><a class="miwa-business-card__detail" href="#/${esc(item.route)}">事业说明 →</a>${businessAction(item, true)}</div>
  </article>`;
}

function overviewHtml(page) {
  const current = MIWA_BUSINESSES.filter((item) => item.category === "current");
  const restart = MIWA_BUSINESSES.filter((item) => item.category === "restart");
  const incubating = MIWA_BUSINESSES.filter((item) => item.category === "incubating");
  return `<article class="miwa-business-publication">
    ${coverHtml()}

    <section class="miwa-business-sheet miwa-business-print-page">
      <div class="miwa-business-section-kicker"><span>01</span><b>为什么需要事业之家</b></div>
      <h2>不是把所有事业塞进一个系统，而是让集团看清“在哪里经营、怎么进入、如何共享能力”</h2>
      <p class="miwa-business-lead">事业之家负责事业认知、事业版图、经营状态与进入路径；进入具体事业后，再由对应工作台承载真实业务执行。</p>
      <div class="miwa-business-three-principles">
        <article><span>01</span><h3>事业独立经营</h3><p>每个事业有自己的客户价值、经营闭环和最终责任，不因共享系统而混成一个流程。</p></article>
        <article><span>02</span><h3>集团能力共享</h3><p>人才、AI、客户、供应商、商品、财务、知识和数字基础设施按需跨事业复用。</p></article>
        <article><span>03</span><h3>真实阶段管理</h3><p>正式经营、既有基础、培育与未来方向必须区分，不把规划中的事业包装成已经成熟。</p></article>
      </div>
      <div class="miwa-business-conclusion">事业之家回答“集团有哪些事业、现在在哪里、我要进入哪里”；具体事业负责把经营目标变成结果。</div>
    </section>

    <section class="miwa-business-sheet miwa-business-print-page">
      <div class="miwa-business-section-kicker"><span>02</span><b>集团事业版图</b></div>
      <div class="miwa-business-sheet__head"><div><h2>格局可以大，建设必须脚踏实地</h2><p>先展示已经确认的事业方向；系统、团队与资源只随真实经营需要逐步配置。</p></div>
        <div class="miwa-business-metrics"><span><b>${MIWA_BUSINESSES.length}</b>事业方向</span><span><b>${current.length}</b>正式经营</span><span><b>${restart.length}</b>既有基础</span><span><b>${incubating.length}</b>培育/规划</span></div>
      </div>
      <div class="miwa-business-portfolio-group"><div class="miwa-business-portfolio-group__title"><span>当前核心经营</span><small>真实业务优先</small></div><div class="miwa-business-grid">${current.map((item) => businessCard(item)).join("")}</div></div>
      <div class="miwa-business-portfolio-group"><div class="miwa-business-portfolio-group__title"><span>既有业务基础</span><small>重新开发</small></div><div class="miwa-business-grid miwa-business-grid--single">${restart.map((item) => businessCard(item, {flowLimit:10})).join("")}</div></div>
      <div class="miwa-business-portfolio-group"><div class="miwa-business-portfolio-group__title"><span>培育与规划</span><small>不提前建设复杂系统</small></div><div class="miwa-business-grid miwa-business-grid--compact">${incubating.map((item) => businessCard(item)).join("")}</div></div>
    </section>

    <section class="miwa-business-sheet miwa-business-print-page">
      <div class="miwa-business-section-kicker"><span>03</span><b>共享关系</b></div>
      <h2>事业承担经营结果，集团共享长期能力</h2>
      <div class="miwa-business-capability-rail"><a href="#/talent-home">人才之家</a><a href="#/ai-home">AI之家</a><a href="#/customer-home">客户之家</a><a href="#/supplier-home">供应商之家</a><a href="#/product-home">商品之家</a><a href="#/finance-home">财务之家</a><a href="#/analysis">分析之家</a><a href="#/knowledge-home">知识之家</a></div>
      <div class="miwa-business-operating-rule"><b>底层原则</b><span>先明确经营目标与业务闭环 → 再确认能力与责任 → 再判断由人、AI、自动化、集团共享能力或外部资源承担。</span></div>
    </section>
  </article>`;
}

function portfolioHtml(page) {
  return `<article class="miwa-business-publication">${pageHero(page, {backRoute:"business-home",backLabel:"事业之家"})}
    <section class="miwa-business-sheet miwa-business-print-page"><div class="miwa-business-grid">${MIWA_BUSINESSES.map((item) => businessCard(item, {flowLimit:5})).join("")}</div></section>
  </article>`;
}

function detailHtml(page, item) {
  const facts = item.facts?.length ? item.facts.map((fact, index) => `<article><span>${String(index+1).padStart(2,"0")}</span><p>${esc(fact)}</p></article>`).join("") : `<article><span>01</span><p>当前仅锁定事业方向，更多事实待真实经营确认。</p></article>`;
  const flow = item.flow?.length ? `<div class="miwa-business-process">${item.flow.map((step,index) => `<article><b>${String(index+1).padStart(2,"0")}</b><span>${esc(step)}</span></article>`).join("")}</div>` : `<div class="miwa-business-content-note">具体业务流程待真实经营启动后确认，不用示例流程冒充正式标准。</div>`;
  return `<article class="miwa-business-publication miwa-business-detail-page">
    ${pageHero(page, {backRoute:"business-portfolio",backLabel:"集团事业"})}
    <section class="miwa-business-sheet miwa-business-print-page">
      <div class="miwa-business-business-title"><div><span>${esc(item.tagline)}</span><h2>${esc(item.name)}</h2><p>${esc(item.description)}</p></div><div class="miwa-business-status-panel"><small>当前阶段</small><strong>${esc(item.stage)}</strong>${businessAction(item)}</div></div>
    </section>
    <section class="miwa-business-sheet miwa-business-print-page">
      <div class="miwa-business-section-kicker"><span>01</span><b>当前事实</b></div><div class="miwa-business-fact-grid">${facts}</div>
    </section>
    <section class="miwa-business-sheet miwa-business-print-page">
      <div class="miwa-business-section-kicker"><span>02</span><b>${item.flow?.length ? "业务闭环" : "业务流程"}</b></div>${flow}
    </section>
    <section class="miwa-business-sheet miwa-business-print-page">
      <div class="miwa-business-section-kicker"><span>03</span><b>当前建设边界</b></div><div class="miwa-business-content-note">${esc(item.future)}</div>
      ${item.id === "procurement-agency" ? `<div class="miwa-business-highlight"><b>当前AIONE只负责介绍这项事业。</b><span>未来采购代理客户网站/客户门户作为独立项目建设；AIONE继续作为员工内部经营与执行平台，两者通过数据/API连接。</span></div>` : ""}
    </section>
  </article>`;
}

function groupHtml(page) {
  const group = getBusinessGroup(page.groupId);
  const children = group?.children || [];
  return `<article class="miwa-business-publication">${pageHero(page, {backRoute:"business-home",backLabel:"事业之家"})}
    <section class="miwa-business-sheet miwa-business-print-page"><div class="miwa-business-directory-grid">${children.map((item,index) => `<a href="#/${esc(item.route)}"><span>${String(index+1).padStart(2,"0")}</span><h3>${esc(item.label)}</h3><p>${esc(item.subtitle)}</p><b>查看 →</b></a>`).join("")}</div></section>
  </article>`;
}

function principlesHtml(page) {
  return `<article class="miwa-business-publication">${pageHero(page, {backRoute:"business-management",backLabel:"事业管理"})}
    <section class="miwa-business-sheet miwa-business-print-page"><div class="miwa-business-three-principles">${(page.principles || []).map((item,index) => `<article><span>${String(index+1).padStart(2,"0")}</span><h3>${esc(item[0])}</h3><p>${esc(item[1])}</p></article>`).join("")}</div></section>
  </article>`;
}

function stagesHtml(page) {
  const rows = [
    ["正式经营","已有真实客户、业务与经营闭环，持续用AIONE跑真实业务。","美和跨境 / 美和批发"],
    ["重新开发","历史上有真实业务与客户基础，当前等待重新获客和系统化。","美和采购代理"],
    ["培育/待启动","事业方向存在，但负责人、目标、流程或系统尚未形成正式经营闭环。","美和物流 / 美和留学 / 美和不动产 / 美和商务咨询 / 美和品牌"],
    ["未来方向","只有经过正式确认后才进入事业版图，不用想象中的业务填满页面。","按未来经营判断增加"]
  ];
  return `<article class="miwa-business-publication">${pageHero(page,{backRoute:"business-management",backLabel:"事业管理"})}<section class="miwa-business-sheet miwa-business-print-page"><div class="miwa-business-stage-table">${rows.map((row,index) => `<article><b>${String(index+1).padStart(2,"0")}</b><div><h3>${esc(row[0])}</h3><p>${esc(row[1])}</p><span>${esc(row[2])}</span></div></article>`).join("")}</div></section></article>`;
}

function relationsHtml(page) {
  return `<article class="miwa-business-publication">${pageHero(page,{backRoute:"business-management",backLabel:"事业管理"})}
    <section class="miwa-business-sheet miwa-business-print-page"><div class="miwa-business-relation-board"><div class="miwa-business-relation-center"><b>集团共享能力</b><span>人才 · AI · 客户 · 供应商 · 商品 · 财务 · 知识 · 数据 · 数字平台</span></div><div class="miwa-business-relation-arrow">↓</div><div class="miwa-business-relation-front">${MIWA_BUSINESSES.slice(0,8).map((item) => `<span>${esc(item.name)}</span>`).join("")}</div><p>共享能力服务多个事业，但每个事业仍独立承担客户价值、经营结果与最终责任。</p></div></section>
  </article>`;
}

function filteredHtml(page) {
  let items = [];
  if (page.filter === "existing") items = MIWA_BUSINESSES.filter((item) => item.category === "current" || item.category === "restart");
  else items = MIWA_BUSINESSES.filter((item) => item.category === "incubating");
  return `<article class="miwa-business-publication">${pageHero(page,{backRoute:"business-development",backLabel:"事业发展"})}<section class="miwa-business-sheet miwa-business-print-page"><div class="miwa-business-grid">${items.map((item) => businessCard(item)).join("")}</div></section></article>`;
}

function futureHtml(page) {
  return `<article class="miwa-business-publication">${pageHero(page,{backRoute:"business-development",backLabel:"事业发展"})}<section class="miwa-business-sheet miwa-business-print-page"><div class="miwa-business-content-note">当前不新增未经正式经营判断确认的“未来事业”名称。新事业只有在客户价值、经营目标、负责人和基本闭环形成后，再进入事业之家正式目录。</div></section></article>`;
}

function milestonesHtml(page) {
  const milestones = [
    ["既有阶段","美和跨境、日本批发、中国采购代理等真实业务经验形成集团当前经营基础。"],
    ["2026","AIONE作为美和方法论第一个真实业务实验场，开始把多事业共享能力、业务流程、人AI协同和证据闭环系统化。"],
    ["下一阶段","先让AIONE与美和跨境稳定运行，再根据真实经营价值逐步复制到批发、采购代理及其他事业。"]
  ];
  return `<article class="miwa-business-publication">${pageHero(page,{backRoute:"business-development",backLabel:"事业发展"})}<section class="miwa-business-sheet miwa-business-print-page"><div class="miwa-business-timeline">${milestones.map((item,index) => `<article><b>${String(index+1).padStart(2,"0")}</b><div><h3>${esc(item[0])}</h3><p>${esc(item[1])}</p></div></article>`).join("")}</div></section></article>`;
}

function enterHtml(page) {
  const items = MIWA_BUSINESSES.filter((item) => item.spaceId);
  return `<article class="miwa-business-publication">${pageHero(page,{backRoute:"business-connections",backLabel:"经营连接"})}<section class="miwa-business-sheet miwa-business-print-page"><div class="miwa-business-grid">${items.map((item) => businessCard(item)).join("")}</div><div class="miwa-business-content-note">没有正式AIONE业务空间的事业只展示介绍，不提供“进入事业”按钮，避免让员工误以为系统已经开发完成。</div></section></article>`;
}

function connectionsHtml(page, routeId) {
  const map = {
    "business-data": ["分析之家","事业经营数据、异常、趋势与经营判断统一进入分析之家/管理驾驶舱。","analysis"],
    "business-work": ["工作之家","事业执行产生的正式工作事项进入工作之家统一承接、跟踪、证据与复盘。","work"],
    "business-assets": ["美和之家 / 知识之家","正式企业资料、事业资料与成熟知识统一进入正式知识/资料来源；事业之家不做资料仓库。","company-assets"]
  };
  const item = map[routeId] || ["经营连接",page.subtitle,"business-home"];
  return `<article class="miwa-business-publication">${pageHero(page,{backRoute:"business-connections",backLabel:"经营连接"})}<section class="miwa-business-sheet miwa-business-print-page"><div class="miwa-business-connection-card"><span>统一入口</span><h2>${esc(item[0])}</h2><p>${esc(item[1])}</p><a class="miwa-business-btn miwa-business-btn--primary" href="#/${esc(item[2])}">进入 →</a></div></section></article>`;
}

function renderPage(root, routeId) {
  const page = MIWA_BUSINESS_PAGES[routeId] || MIWA_BUSINESS_PAGES["business-home"];
  const businessItem = MIWA_BUSINESS_BY_ROUTE[routeId] || null;
  if (page.kind === "overview") root.innerHTML = overviewHtml(page);
  else if (page.kind === "portfolio") root.innerHTML = portfolioHtml(page);
  else if (page.kind === "business-detail" && businessItem) root.innerHTML = detailHtml(page, businessItem);
  else if (page.kind === "group") root.innerHTML = groupHtml(page);
  else if (page.kind === "principles") root.innerHTML = principlesHtml(page);
  else if (page.kind === "stages") root.innerHTML = stagesHtml(page);
  else if (page.kind === "relations") root.innerHTML = relationsHtml(page);
  else if (page.kind === "filtered") root.innerHTML = filteredHtml(page);
  else if (page.kind === "future") root.innerHTML = futureHtml(page);
  else if (page.kind === "milestones") root.innerHTML = milestonesHtml(page);
  else if (page.kind === "enter") root.innerHTML = enterHtml(page);
  else if (page.kind === "connections") root.innerHTML = connectionsHtml(page, routeId);
  else root.innerHTML = groupHtml(MIWA_BUSINESS_PAGES["business-management"]);

  root.querySelectorAll('[data-business-action="print"]').forEach((button) => button.addEventListener("click", () => window.print()));
  root.querySelectorAll("[data-business-enter]").forEach((button) => button.addEventListener("click", () => {
    const spaceId = button.dataset.businessEnter;
    if (!spaceId) return;
    setCurrentBusinessSpace(spaceId, { navigate:true, reason:"business-home-publication" });
  }));
}

export async function initMiwaBusinessHome() {
  const root = document.getElementById("miwa-business-home-entry");
  if (!root) return;
  const routeId = getRouteId();
  renderPage(root, routeId);
  const page = MIWA_BUSINESS_PAGES[routeId] || MIWA_BUSINESS_PAGES["business-home"];
  window.dispatchEvent(new CustomEvent("aione:page-aside-context", { detail:{
    state:"light", kicker:"事业之家", title:page.title, text:page.subtitle
  }}));
}
