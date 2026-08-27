/* ========================================
   MIWA Business Home | Digital Publication Book V1.9.31.5
   Scope: 事业之家概览 + 全部章节统一出版物排版。
   Screen: adaptive portrait A4 book. Print: portrait A4 single pages.
======================================== */

import { getRouteId } from "../config/route-registry.js";
import { setCurrentBusinessSpace } from "../shell/platform-context.js";
import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260824-v1.9.5-sidebar-aside-lock-candidate";
import {
  bindPublicationActions,
  configurePublicationAside,
  publicationBackCover,
  publicationChapterSummary,
  publicationCover,
  publicationCoverSpread,
  publicationPage,
  publicationSpread,
  setPublicationPageMode,
  validatePublicationPages
} from "../components/miwa-publication-master.js?v=20260827-v1.9.31.5";
import {
  MIWA_BUSINESS_HOME_SUBTITLE,
  MIWA_BUSINESS_NAVIGATION,
  MIWA_BUSINESSES,
  MIWA_BUSINESS_BY_ROUTE,
  MIWA_BUSINESS_PAGES,
  getBusinessGroup
} from "../data/miwa-business-home-content.js";

const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));

const FALLBACK_BUSINESS_ICONS = Object.freeze({
  crossborder: "store", wholesale: "orders", "procurement-agency": "procurement", logistics: "supplier",
  "study-abroad": "knowledge", "real-estate": "shared", consulting: "analysis", brand: "brand"
});

function businessVisual(item) {
  if (item.iconAsset) return `<img src="${esc(item.iconAsset)}" alt="${esc(item.name)}图标">`;
  return `<span class="miwa-business-publication-icon is-fallback" data-icon="${esc(FALLBACK_BUSINESS_ICONS[item.id] || "apps")}" aria-hidden="true"></span>`;
}

function compactBusinessCard(item, options = {}) {
  const wide = options.wide ? " is-wide" : "";
  const action = item.spaceId ? `<button type="button" data-business-enter="${esc(item.spaceId)}">进入事业</button>` : `<a href="#/${esc(item.route)}">查看事业说明 →</a>`;
  return `<article class="miwa-business-publication-card${wide}">
    <div class="miwa-business-publication-card__icon" data-business-icon-slot="${esc(item.id)}">${businessVisual(item)}</div>
    <div class="miwa-business-publication-card__copy"><span>${esc(item.tagline)}</span><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><div class="miwa-business-publication-card__meta"><b>${esc(item.stage)}</b>${action}</div></div>
  </article>`;
}

function chapterDirectory() {
  return MIWA_BUSINESS_NAVIGATION.filter((item) => item.children?.length).map((group, index) => {
    const sectionText = group.children.map((child, childIndex) => `${String(index + 1).padStart(2, "0")}.${String(childIndex + 1).padStart(2, "0")} ${child.label}`).join(" · ");
    return `<article class="miwa-publication-editorial-card is-compact ${index % 2 ? "tone-red" : "tone-green"}"><span>${String(index + 1).padStart(2, "0")}</span><h3>${esc(group.label)}</h3><p>${esc(group.subtitle)}</p><small>${esc(sectionText)}</small></article>`;
  }).join("");
}

function overviewPage2() {
  const content = `<div class="miwa-publication-editorial-grid cols-3">
    <article class="miwa-publication-editorial-card tone-green"><span>01</span><h3>事业独立经营</h3><p>每个事业有自己的客户价值、经营闭环和最终责任，不因共享系统而混成一个流程。</p></article>
    <article class="miwa-publication-editorial-card tone-red"><span>02</span><h3>集团能力共享</h3><p>人才、AI、客户、供应商、商品、财务、知识和数字基础设施按需跨事业复用。</p></article>
    <article class="miwa-publication-editorial-card tone-green"><span>03</span><h3>真实阶段管理</h3><p>正式经营、既有业务基础、培育与未来方向必须清楚区分，不把规划中的事业包装成已经成熟。</p></article>
  </div>`;
  return publicationPage({
    pageNumber: 2,
    section: "概览｜为什么需要事业之家",
    title: "不是把所有事业塞进一个系统，而是让集团看清在哪里经营、怎么进入、如何共享能力",
    lead: "事业之家负责事业认知、事业版图、经营状态与进入路径；进入具体事业后，再由对应工作台承载真实业务执行。",
    content,
    conclusion: "事业之家回答“集团有哪些事业、现在在哪里、我要进入哪里”；具体事业负责把经营目标变成结果。",
    bookLabel: "事业之家"
  });
}

function overviewPage3() {
  return publicationPage({
    pageNumber: 3,
    section: "概览｜全书结构",
    title: "空间即书，目录即章，子目录即节，内容即页",
    lead: "Sidebar不只是网页导航，也是这本书的实时目录。每个一级目录代表一章，二级目录代表一节；章节内容按书页组织。",
    content: `<div class="miwa-publication-editorial-grid cols-2 compact">${chapterDirectory()}</div>`,
    conclusion: "内容页面先建立认知，再连接系统执行；阅读结构与AIONE信息架构保持一致。",
    bookLabel: "事业之家"
  });
}

function overviewPage4() {
  const core = MIWA_BUSINESSES.filter((item) => item.category === "current");
  const restart = MIWA_BUSINESSES.find((item) => item.category === "restart");
  const content = `<div class="miwa-business-core-grid">${core.map((item) => compactBusinessCard(item)).join("")}${restart ? compactBusinessCard(restart, { wide:true }) : ""}</div>`;
  return publicationPage({ pageNumber:4, section:"第01章｜集团事业 · 01.01 核心与既有事业", title:"真实业务优先：先把已经存在的经营前线讲清楚", lead:"事业版图可以持续发展，但AIONE首先服务真实经营。当前正式经营与已有真实业务基础必须清楚区分。", content, conclusion:"美和跨境与美和批发属于当前真实经营；美和采购代理有历史业务基础，当前先做事业认知，暂不提前建设客户系统。", bookLabel:"事业之家" });
}

function overviewPage5() {
  const current = MIWA_BUSINESSES.filter((item) => item.category === "current");
  const restart = MIWA_BUSINESSES.filter((item) => item.category === "restart");
  const incubating = MIWA_BUSINESSES.filter((item) => item.category === "incubating");
  const rows = [
    ["正式经营", `${current.length}个事业`, current.map((item) => item.name).join(" / ")],
    ["既有业务基础", `${restart.length}个事业`, restart.map((item) => item.name).join(" / ")],
    ["培育方向", `${incubating.length}个事业`, incubating.map((item) => item.name).join(" / ")],
    ["未来事业", "按真实经营判断新增", "不为了版图完整而预设未经确认的经营事实、负责人或目标。"]
  ];
  const content = `<div class="miwa-publication-editorial-grid cols-2">${rows.map((item,index)=>`<article class="miwa-publication-editorial-card ${index%2?"tone-red":"tone-green"}"><span>${String(index+1).padStart(2,"0")}</span><h3>${item[0]}</h3><strong>${item[1]}</strong><p>${item[2]}</p></article>`).join("")}</div>`;
  return publicationPage({ pageNumber:5, section:"第01章｜集团事业 · 01.02 事业阶段", title:"格局可以大，建设必须脚踏实地", lead:"所有事业使用统一阶段语言。阶段不是装饰标签，而是决定系统投入、资源配置和管理方式的经营事实。", content, conclusion:"先确认真实阶段，再决定是否进入系统建设、资源投入和经营目标管理。", bookLabel:"事业之家" });
}

function overviewPage6() {
  const groups = [["人才 / AI","人与AI协同、能力配置与最终责任。","人才之家 · AI之家"],["客户 / 供应商","客户价值与供应关系在集团层形成长期资产。","客户之家 · 供应商之家"],["商品 / 品牌","商品主数据、分类、规格属性与品牌资产按需复用。","商品之家"],["财务 / 数据","财务口径、经营数据、证据和分析形成共同经营语言。","财务之家 · 分析之家"],["知识 / 数字平台","标准、SOP、资料、系统和基础设施形成可持续数字粮草。","知识之家 · AIONE"]];
  const content = `<div class="miwa-publication-editorial-grid cols-2">${groups.map((item,index)=>`<article class="miwa-publication-editorial-card ${index===4?"is-feature ":""}${index%2?"tone-red":"tone-green"}"><span>${String(index+1).padStart(2,"0")}</span><h3>${item[0]}</h3><p>${item[1]}</p><small>${item[2]}</small></article>`).join("")}</div>`;
  return publicationPage({ pageNumber:6, section:"第01章｜集团事业 · 01.03 集团共享能力", title:"事业承担经营结果，集团共享长期能力", lead:"共享的是能够跨事业重复使用的能力、资源和数字底座，而不是把所有事业组织成同一个流程。", content, conclusion:"先明确经营目标与业务闭环，再确认能力与责任，再判断由人、AI、自动化、集团共享能力或外部资源承担。", bookLabel:"事业之家" });
}

function overviewPage7() {
  return publicationChapterSummary({ pageNumber:7, chapter:"第01章｜集团事业 · 本章总结", title:"集团事业这一章，需要记住四件事", points:["事业首先对应真实客户价值和经营结果，不以页面、部门或系统功能来定义。","美和跨境与美和批发是当前真实经营事业；美和采购代理已有业务基础但处于重新开发阶段。","事业可以独立经营，但人才、AI、客户、供应商、商品、财务、知识与数字平台可以持续共享。","所有事业必须标明真实阶段；未经确认的目标、负责人和经营事实不得由系统或AI自行补全。"], next:"第02章｜事业管理：定位、负责人、阶段、目标与事业关系", bookLabel:"事业之家" });
}

function overviewHtml() {
  const cover = publicationCover({ title:"集团事业", englishTitle:"BUSINESS PORTFOLIO", subtitle:MIWA_BUSINESS_HOME_SUBTITLE, statement:"真实业务优先 · 事业独立经营 · 集团能力共享 · 人AI协同", bookLabel:"事业之家", visualHtml:`<span class="miwa-business-book-cover-icon" data-icon="shared" aria-hidden="true"></span>` });
  const backCover = publicationBackCover({ title:"关于《美和集团事业手册》", summary:"本册用于帮助美和集团成员快速理解集团事业构成、真实经营阶段、事业之间的关系，以及集团共享能力如何支持各事业持续经营。", contents:["集团事业","事业管理","事业发展","经营连接"], audiences:["集团成员","事业负责人","新入职员工","管理人员"], bookLabel:"事业之家", visualHtml:`<span class="miwa-business-book-cover-icon" data-icon="shared" aria-hidden="true"></span>` });
  return `<article class="miwa-business-publication miwa-business-book miwa-publication-book" data-publication-book="business-home">${publicationCoverSpread(cover, backCover)}${publicationSpread(overviewPage2(), overviewPage3(), "overview")}${publicationSpread(overviewPage4(), overviewPage5(), "chapter-01-a")}${publicationSpread(overviewPage6(), overviewPage7(), "chapter-01-b")}</article>`;
}

function businessChapterContext(routeId) {
  const group = MIWA_BUSINESS_NAVIGATION.find((item) => item.route === routeId || item.children?.some((child) => child.route === routeId)) || null;
  const chapterIndex = Math.max(1, MIWA_BUSINESS_NAVIGATION.findIndex((item) => item.id === group?.id));
  const sectionIndex = group?.children?.findIndex((item) => item.route === routeId) ?? -1;
  return { group, chapterNo:String(chapterIndex).padStart(2,"0"), sectionNo:sectionIndex >= 0 ? String(sectionIndex+1).padStart(2,"0") : "00" };
}

function directoryForGroup(group) {
  return `<div class="miwa-publication-directory-grid">${(group?.children || []).map((item,index)=>`<a class="miwa-publication-directory-card" href="#/${esc(item.route)}"><span>${String(index+1).padStart(2,"0")}</span><div><h3>${esc(item.label)}</h3><p>${esc(item.subtitle)}</p></div></a>`).join("")}</div>`;
}

function principlesContent(page) {
  return `<div class="miwa-publication-editorial-grid cols-3">${(page.principles || []).map((item,index)=>`<article class="miwa-publication-editorial-card ${index===1?"tone-red":"tone-green"}"><span>${String(index+1).padStart(2,"0")}</span><h3>${esc(item[0])}</h3><p>${esc(item[1])}</p></article>`).join("")}</div>`;
}

function stagesContent() {
  const rows = [["正式经营","已有真实客户、业务与经营闭环，持续用AIONE跑真实业务。","美和跨境 / 美和批发"],["重新开发","历史上有真实业务与客户基础，当前等待重新获客和系统化。","美和采购代理"],["培育 / 待启动","事业方向存在，但负责人、目标、流程或系统尚未形成正式经营闭环。","美和物流 / 美和留学 / 美和不动产 / 美和商务咨询 / 美和品牌"],["未来方向","只有经过正式确认后才进入事业版图，不用想象中的业务填满页面。","按未来经营判断增加"]];
  return `<div class="miwa-publication-editorial-grid cols-2">${rows.map((row,index)=>`<article class="miwa-publication-editorial-card ${index%2?"tone-red":"tone-green"}"><span>${String(index+1).padStart(2,"0")}</span><h3>${row[0]}</h3><p>${row[1]}</p><small>${row[2]}</small></article>`).join("")}</div>`;
}

function businessDetailContent(item) {
  const facts = item.facts?.length ? item.facts : ["当前仅锁定事业方向，更多事实待真实经营确认。"];
  return `<div class="miwa-publication-editorial-grid ${facts.length >= 3 ? "cols-3" : "cols-2"}">${facts.slice(0,5).map((fact,index)=>`<article class="miwa-publication-editorial-card ${index===1?"tone-red":"tone-green"}"><span>${String(index+1).padStart(2,"0")}</span><h3>${index===0?"当前事实":"事实依据"}</h3><p>${esc(fact)}</p></article>`).join("")}</div>`;
}

function businessFlowContent(item) {
  if (!item.flow?.length) return `<article class="miwa-publication-editorial-card tone-green is-feature"><span>FLOW</span><h3>具体业务流程待真实经营启动后确认</h3><p>不使用示例流程冒充正式标准；先有真实业务，再进入流程、字段、规则和系统建设。</p></article>`;
  return `<div class="miwa-publication-process-grid">${item.flow.map((step,index)=>`<span><b>${String(index+1).padStart(2,"0")}</b>${esc(step)}</span>`).join("")}</div>`;
}

function filteredBusinesses(filter) {
  const items = filter === "existing" ? MIWA_BUSINESSES.filter((item) => item.category === "current" || item.category === "restart") : MIWA_BUSINESSES.filter((item) => item.category === "incubating");
  return `<div class="miwa-business-core-grid">${items.map((item,index)=>compactBusinessCard(item,{wide:items.length%2===1 && index===items.length-1})).join("")}</div>`;
}

function genericPrimaryContent(page, routeId, ctx) {
  const item = MIWA_BUSINESS_BY_ROUTE[routeId];
  if (page.kind === "group") return directoryForGroup(getBusinessGroup(page.groupId));
  if (page.kind === "portfolio") return `<div class="miwa-business-core-grid">${MIWA_BUSINESSES.map((item,index)=>compactBusinessCard(item,{wide:MIWA_BUSINESSES.length%2===1&&index===MIWA_BUSINESSES.length-1})).join("")}</div>`;
  if (page.kind === "business-detail" && item) return businessDetailContent(item);
  if (page.kind === "principles") return principlesContent(page);
  if (page.kind === "stages") return stagesContent();
  if (page.kind === "relations") return `<div class="miwa-publication-editorial-grid cols-3"><article class="miwa-publication-editorial-card tone-green"><span>01</span><h3>事业独立</h3><p>每个事业独立承担客户价值、经营闭环和最终责任。</p></article><article class="miwa-publication-editorial-card tone-red"><span>02</span><h3>集团共享</h3><p>人才、AI、客户、供应商、商品、财务、知识、数据与数字平台按需复用。</p></article><article class="miwa-publication-editorial-card tone-green"><span>03</span><h3>边界清晰</h3><p>共享能力不等于把所有事业混成同一个流程；先明确主责任，再建立协同关系。</p></article></div>`;
  if (page.kind === "filtered") return filteredBusinesses(page.filter);
  if (page.kind === "future") return `<article class="miwa-publication-editorial-card tone-green is-feature"><span>FUTURE</span><h3>未来事业只记录正式确认方向</h3><p>新事业只有在客户价值、经营目标、负责人和基本闭环形成后，再进入事业之家正式目录。</p></article>`;
  if (page.kind === "milestones") return `<div class="miwa-publication-editorial-grid cols-3"><article class="miwa-publication-editorial-card tone-green"><span>01</span><h3>既有阶段</h3><p>美和跨境、日本批发、中国采购代理等真实业务经验形成集团当前经营基础。</p></article><article class="miwa-publication-editorial-card tone-red"><span>02</span><h3>2026</h3><p>AIONE作为美和方法论第一个真实业务实验场，开始把共享能力、流程、人AI协同和证据闭环系统化。</p></article><article class="miwa-publication-editorial-card tone-green"><span>03</span><h3>下一阶段</h3><p>先让AIONE与美和跨境稳定运行，再根据真实经营价值逐步复制到批发、采购代理及其他事业。</p></article></div>`;
  if (page.kind === "enter") return filteredBusinesses("existing");
  if (page.kind === "connections") return `<article class="miwa-publication-editorial-card tone-green is-feature"><span>统一连接</span><h3>${esc(page.title)}</h3><p>${esc(page.subtitle)}</p></article>`;
  return directoryForGroup(ctx.group);
}

function genericSecondaryContent(page, routeId, ctx) {
  const item = MIWA_BUSINESS_BY_ROUTE[routeId];
  if (page.kind === "business-detail" && item) return `${businessFlowContent(item)}<div class="miwa-publication-editorial-note"><strong>当前建设边界</strong><p>${esc(item.future)}</p></div>`;
  const group = ctx.group;
  return `<div class="miwa-publication-editorial-grid cols-2 compact">${(group?.children || []).slice(0,6).map((child,index)=>`<a class="miwa-publication-editorial-card is-compact ${index%2?"tone-red":"tone-green"}" href="#/${esc(child.route)}"><span>${String(index+1).padStart(2,"0")}</span><h3>${esc(child.label)}</h3><p>${esc(child.subtitle)}</p></a>`).join("")}</div>`;
}

function genericBookHtml(routeId) {
  const page = MIWA_BUSINESS_PAGES[routeId] || MIWA_BUSINESS_PAGES["business-home"];
  const ctx = businessChapterContext(routeId);
  const chapterLabel = ctx.group?.label || "事业之家";
  const isGroup = ctx.group?.route === routeId;
  const prefix = isGroup ? `第${ctx.chapterNo}章｜${chapterLabel}` : `第${ctx.chapterNo}章｜${chapterLabel} · ${ctx.chapterNo}.${ctx.sectionNo}`;
  const leftNo = Math.max(2, Number(ctx.chapterNo) * 10 + (Number(ctx.sectionNo) || 1) * 2);
  const rightNo = leftNo + 1;
  const left = publicationPage({ pageNumber:leftNo, section:prefix, title:page.title, lead:page.subtitle, content:genericPrimaryContent(page,routeId,ctx), conclusion:isGroup?`本章先建立“${chapterLabel}”的共同认知，再通过二级目录进入具体节。`:`本节只表达当前已确认的真实业务逻辑；未确认的事实保持待确认。`, bookLabel:"事业之家" });
  const right = publicationPage({ pageNumber:rightNo, section:`${prefix}｜展开`, title:page.kind === "business-detail" ? "业务闭环与当前建设边界" : "本章关联与下一步", lead:page.kind === "business-detail" ? "事业认知与真实业务闭环分开表达；进入具体事业后，再由工作台承担高频业务操作。" : "事业之家负责认知、关系和进入路径；业务执行、经营数据、工作事项与正式资料分别回到对应系统空间。", content:genericSecondaryContent(page,routeId,ctx), conclusion:"事业之家先让人看懂，再把人带到真正需要执行、分析或管理的地方。", bookLabel:"事业之家" });
  return `<article class="miwa-business-publication miwa-business-book miwa-publication-book" data-publication-book="business-section">${publicationSpread(left,right,routeId)}</article>`;
}

function bindBusinessActions(root) {
  root.querySelectorAll("[data-business-enter]").forEach((button) => button.addEventListener("click", () => {
    const spaceId = button.dataset.businessEnter;
    if (!spaceId) return;
    setCurrentBusinessSpace(spaceId, { navigate:true, reason:"business-home-digital-book" });
  }));
}

export async function initMiwaBusinessHome() {
  const routeId = getRouteId();
  setPublicationPageMode(true);
  const root = document.getElementById("miwa-business-home-entry");
  if (!root) return;
  root.innerHTML = routeId === "business-home" ? overviewHtml() : genericBookHtml(routeId);
  renderSemanticIcons(root);
  bindPublicationActions(root);
  bindBusinessActions(root);
  const page = MIWA_BUSINESS_PAGES[routeId] || MIWA_BUSINESS_PAGES["business-home"];
  configurePublicationAside({ kicker:"事业之家", title:page.title, summary:"按美和数字出版设计系统阅读。内容页统一出版物信息层级、留白和A4打印完整性；宽屏优先双页，空间不足自动单页。", bookTitle:"美和集团事业手册", chapter:routeId === "business-home" ? "概览 + 第01章｜集团事业" : (businessChapterContext(routeId).group?.label || "当前章节") });
  validatePublicationPages(root);
}
