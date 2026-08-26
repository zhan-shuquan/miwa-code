/* ========================================
   MIWA Business Home | Digital Book Overview V1.9.31.3
   Screen: portrait A4 two-page spreads. Print: portrait A4 single pages.
   Information model: space=book, group=chapter, child=section, content=page.
======================================== */

import { getRouteId } from "../config/route-registry.js";
import { setCurrentBusinessSpace } from "../shell/platform-context.js";
import { renderSemanticIcons } from "../config/semantic-icons.js?v=20260824-v1.9.5-sidebar-aside-lock-candidate";
import {
  bindPublicationActions,
  configurePublicationAside,
  publicationChapterSummary,
  publicationCover,
  publicationPage,
  publicationSingle,
  publicationSpread,
  setPublicationPageMode,
  validatePublicationPages
} from "../components/miwa-publication-master.js?v=20260826-v1.9.31.3";
import { initMiwaBusinessHome as initLegacyBusinessHome } from "./miwa-business-home.js?v=20260826-v1.9.31-business-home";
import {
  MIWA_BUSINESS_HOME_SUBTITLE,
  MIWA_BUSINESS_NAVIGATION,
  MIWA_BUSINESSES
} from "../data/miwa-business-home-content.js";

const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));

const FALLBACK_BUSINESS_ICONS = Object.freeze({
  crossborder: "store",
  wholesale: "orders",
  "procurement-agency": "procurement",
  logistics: "supplier",
  "study-abroad": "knowledge",
  "real-estate": "shared",
  consulting: "analysis",
  brand: "brand"
});

function businessVisual(item) {
  if (item.iconAsset) {
    return `<img src="${esc(item.iconAsset)}" alt="${esc(item.name)}图标">`;
  }
  return `<span class="miwa-business-publication-icon is-fallback" data-icon="${esc(FALLBACK_BUSINESS_ICONS[item.id] || "apps")}" aria-hidden="true"></span>`;
}

function compactBusinessCard(item, options = {}) {
  const wide = options.wide ? " is-wide" : "";
  const action = item.spaceId ? `<button type="button" data-business-enter="${esc(item.spaceId)}">进入事业</button>` : `<a href="#/${esc(item.route)}">查看事业说明 →</a>`;
  return `<article class="miwa-business-publication-card${wide}">
    <div class="miwa-business-publication-card__icon" data-business-icon-slot="${esc(item.id)}">${businessVisual(item)}</div>
    <div class="miwa-business-publication-card__copy">
      <span>${esc(item.tagline)}</span>
      <h3>${esc(item.name)}</h3>
      <p>${esc(item.description)}</p>
      <div class="miwa-business-publication-card__meta"><b>${esc(item.stage)}</b>${action}</div>
    </div>
  </article>`;
}

function chapterDirectory() {
  return MIWA_BUSINESS_NAVIGATION.filter((item) => item.children?.length).map((group, index) => {
    const sectionText = group.children.map((child, childIndex) => `${String(index + 1).padStart(2, "0")}.${String(childIndex + 1).padStart(2, "0")} ${child.label}`).join(" · ");
    return `<article class="miwa-business-toc-card">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <h3>${esc(group.label)}</h3>
      <p>${esc(group.subtitle)}</p>
      <small>${esc(sectionText)}</small>
    </article>`;
  }).join("");
}

function overviewPage2() {
  const content = `<div class="miwa-business-publication-two">
    <article><span>01</span><h3>事业独立经营</h3><p>每个事业有自己的客户价值、经营闭环和最终责任，不因共享系统而混成一个流程。</p></article>
    <article><span>02</span><h3>集团能力共享</h3><p>人才、AI、客户、供应商、商品、财务、知识和数字基础设施按需跨事业复用。</p></article>
  </div>
  <article class="miwa-business-publication-feature"><span>03</span><div><h3>真实阶段管理</h3><p>正式经营、既有业务基础、培育与未来方向必须清楚区分，不把规划中的事业包装成已经成熟。</p></div></article>`;
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
  const content = `<div class="miwa-business-toc-grid">${chapterDirectory()}</div>`;
  return publicationPage({
    pageNumber: 3,
    section: "概览｜全书结构",
    title: "空间即书，目录即章，子目录即节，内容即页",
    lead: "Sidebar不只是网页导航，也是这本书的实时目录。每个一级目录代表一章，二级目录代表一节；章节内容按书页组织。",
    content,
    conclusion: "内容页面先建立认知，再连接系统执行；阅读结构与AIONE信息架构保持一致。",
    bookLabel: "事业之家"
  });
}

function overviewPage4() {
  const core = MIWA_BUSINESSES.filter((item) => item.category === "current");
  const restart = MIWA_BUSINESSES.find((item) => item.category === "restart");
  const content = `<div class="miwa-business-core-grid">
    ${core.map((item) => compactBusinessCard(item)).join("")}
    ${restart ? compactBusinessCard(restart, { wide:true }) : ""}
  </div>`;
  return publicationPage({
    pageNumber: 4,
    section: "第01章｜集团事业 · 01.01 核心与既有事业",
    title: "真实业务优先：先把已经存在的经营前线讲清楚",
    lead: "事业版图可以持续发展，但AIONE首先服务真实经营。当前正式经营与已有真实业务基础必须清楚区分。",
    content,
    conclusion: "美和跨境与美和批发属于当前真实经营；美和采购代理有历史业务基础，当前先做事业认知，暂不提前建设客户系统。",
    bookLabel: "事业之家"
  });
}

function overviewPage5() {
  const current = MIWA_BUSINESSES.filter((item) => item.category === "current");
  const restart = MIWA_BUSINESSES.filter((item) => item.category === "restart");
  const incubating = MIWA_BUSINESSES.filter((item) => item.category === "incubating");
  const content = `<div class="miwa-business-stage-grid">
    <article><span>01</span><h3>正式经营</h3><strong>${current.length}个事业</strong><p>${current.map((item) => item.name).join(" / ")}</p></article>
    <article><span>02</span><h3>既有业务基础</h3><strong>${restart.length}个事业</strong><p>${restart.map((item) => item.name).join(" / ")}</p></article>
    <article><span>03</span><h3>培育方向</h3><strong>${incubating.length}个事业</strong><p>${incubating.map((item) => item.name).join(" / ")}</p></article>
    <article><span>04</span><h3>未来事业</h3><strong>按真实经营判断新增</strong><p>不为了版图完整而预设未经确认的经营事实、负责人或目标。</p></article>
  </div>`;
  return publicationPage({
    pageNumber: 5,
    section: "第01章｜集团事业 · 01.02 事业阶段",
    title: "格局可以大，建设必须脚踏实地",
    lead: "所有事业使用统一阶段语言。阶段不是装饰标签，而是决定系统投入、资源配置和管理方式的经营事实。",
    content,
    conclusion: "先确认真实阶段，再决定是否进入系统建设、资源投入和经营目标管理。",
    bookLabel: "事业之家"
  });
}

function overviewPage6() {
  const groups = [
    ["人才 / AI", "人与AI协同、能力配置与最终责任。", "人才之家 · AI之家"],
    ["客户 / 供应商", "客户价值与供应关系在集团层形成长期资产。", "客户之家 · 供应商之家"],
    ["商品 / 品牌", "商品主数据、分类、规格属性与品牌资产按需复用。", "商品之家"],
    ["财务 / 数据", "财务口径、经营数据、证据和分析形成共同经营语言。", "财务之家 · 分析之家"],
    ["知识 / 数字平台", "标准、SOP、资料、系统和基础设施形成可持续数字粮草。", "知识之家 · AIONE"]
  ];
  const content = `<div class="miwa-business-capability-grid">${groups.map((item, index) => `<article class="${index === 4 ? "is-wide" : ""}"><span>${String(index + 1).padStart(2, "0")}</span><h3>${item[0]}</h3><p>${item[1]}</p><small>${item[2]}</small></article>`).join("")}</div>`;
  return publicationPage({
    pageNumber: 6,
    section: "第01章｜集团事业 · 01.03 集团共享能力",
    title: "事业承担经营结果，集团共享长期能力",
    lead: "共享的是能够跨事业重复使用的能力、资源和数字底座，而不是把所有事业组织成同一个流程。",
    content,
    conclusion: "先明确经营目标与业务闭环，再确认能力与责任，再判断由人、AI、自动化、集团共享能力或外部资源承担。",
    bookLabel: "事业之家"
  });
}

function overviewPage7() {
  return publicationChapterSummary({
    pageNumber: 7,
    chapter: "第01章｜集团事业 · 本章总结",
    title: "集团事业这一章，需要记住四件事",
    points: [
      "事业首先对应真实客户价值和经营结果，不以页面、部门或系统功能来定义。",
      "美和跨境与美和批发是当前真实经营事业；美和采购代理已有业务基础但处于重新开发阶段。",
      "事业可以独立经营，但人才、AI、客户、供应商、商品、财务、知识与数字平台可以持续共享。",
      "所有事业必须标明真实阶段；未经确认的目标、负责人和经营事实不得由系统或AI自行补全。"
    ],
    next: "第02章｜事业管理：定位、负责人、阶段、目标与事业关系",
    bookLabel: "事业之家"
  });
}

function overviewHtml() {
  const cover = publicationCover({
    title: "集团事业",
    englishTitle: "BUSINESS PORTFOLIO",
    subtitle: MIWA_BUSINESS_HOME_SUBTITLE,
    statement: "真实业务优先 · 事业独立经营 · 集团能力共享 · 人AI协同",
    bookLabel: "事业之家",
    visualHtml: `<span class="miwa-business-book-cover-icon" data-icon="shared" aria-hidden="true"></span>`
  });

  return `<article class="miwa-business-publication miwa-business-book miwa-publication-book" data-publication-book="business-home">
    ${publicationSingle(cover)}
    ${publicationSpread(overviewPage2(), overviewPage3(), "overview")}
    ${publicationSpread(overviewPage4(), overviewPage5(), "chapter-01-a")}
    ${publicationSpread(overviewPage6(), overviewPage7(), "chapter-01-b")}
  </article>`;
}

export async function initMiwaBusinessHome() {
  const routeId = getRouteId();
  setPublicationPageMode(true);

  if (routeId !== "business-home") {
    await initLegacyBusinessHome();
    configurePublicationAside({
      kicker: "事业之家",
      title: document.title.split("｜").pop() || "事业内容",
      summary: "当前属于事业之家内容空间。正式母版规则为：一级目录=章，二级目录=节，内容=页；打印与PDF操作归右侧辅助区。",
      bookTitle: "美和集团事业手册",
      chapter: "当前章节"
    });
    bindPublicationActions(document);
    return;
  }

  const root = document.getElementById("miwa-business-home-entry");
  if (!root) return;
  root.innerHTML = overviewHtml();
  renderSemanticIcons(root);
  bindPublicationActions(root);
  root.querySelectorAll("[data-business-enter]").forEach((button) => button.addEventListener("click", () => {
    const spaceId = button.dataset.businessEnter;
    if (!spaceId) return;
    setCurrentBusinessSpace(spaceId, { navigate:true, reason:"business-home-digital-book" });
  }));

  configurePublicationAside({
    kicker: "事业之家",
    title: "事业概览",
    summary: "桌面按双页展开阅读；移动端单页连续阅读；导出后为A4纵向单页，可直接打印装订。",
    bookTitle: "美和集团事业手册",
    chapter: "概览 + 第01章｜集团事业"
  });
  validatePublicationPages(root);
}
