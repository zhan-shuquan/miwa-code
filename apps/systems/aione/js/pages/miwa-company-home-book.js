/* ========================================
   MIWA Company Home | Digital Publication Book V1.9.31.4
   Scope: 美和之家概览。其他章节保留现有真实内容页面，内容工程在本版后暂停。
======================================== */
import { getRouteId } from "../config/route-registry.js";
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
} from "../components/miwa-publication-master.js?v=20260827-v1.9.31.4";
import { initMiwaCompanyHome as initLegacyCompanyHome } from "./miwa-company-home.js?v=20260826-v1.9.26-drive-proxy";
import { MIWA_COMPANY_SUBTITLE, MIWA_COMPANY_NAVIGATION } from "../data/miwa-company-content.js?v=20260826-v1.9.26-drive-proxy";

const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));

function directoryCards() {
  return MIWA_COMPANY_NAVIGATION.filter((item) => item.children?.length).slice(0, 8).map((group, index) => `
    <article class="miwa-company-book-toc"><span>${String(index + 1).padStart(2,"0")}</span><div><h3>${esc(group.label)}</h3><p>${esc(group.subtitle || "")}</p><small>${group.children.slice(0,4).map((child) => esc(child.label)).join(" · ")}</small></div></article>`).join("");
}

function page2() {
  return publicationPage({
    pageNumber:2,
    section:"概览｜认识美和",
    title:"从真实经营出发，再把经过验证的方法沉淀成集团长期能力",
    lead:"美和之家不是企业官网，也不是文件仓库。它是集团成员理解美和是谁、为什么经营、向哪里发展以及如何共同工作的统一认知入口。",
    content:`<div class="miwa-company-book-two">
      <article><span>NOW</span><h3>今天的美和</h3><p>立足日本经营，持续开展跨境电商、日本批发、进出口、供应链与品牌经营，在真实业务中积累商品、客户、供应商、渠道和组织能力。</p></article>
      <article><span>NEXT</span><h3>正在形成的美和</h3><p>以AIONE为经营基础设施，让人、AI、数据、知识和自动化围绕真实业务协同，并把有效经验逐步沉淀为可复用的方法资产。</p></article>
    </div>`,
    conclusion:"先把真实业务做清楚，再让系统与AI理解业务；先形成证据，再形成标准。",
    bookLabel:"美和之家"
  });
}

function page3() {
  return publicationPage({
    pageNumber:3,
    section:"概览｜全书目录",
    title:"一个目录就是一章，一个二级目录就是一节",
    lead:"Sidebar同时承担系统导航与书籍目录。内容按章、节、页组织，让网页阅读、内部培训和正式PDF共用一套结构。",
    content:`<div class="miwa-company-book-toc-grid">${directoryCards()}</div>`,
    conclusion:"空间即书，目录即章，子目录即节，内容即页；结构稳定，内容可以持续更新。",
    bookLabel:"美和之家"
  });
}

function page4() {
  return publicationPage({
    pageNumber:4,
    section:"第01章｜理念与文化",
    title:"美和灵魂、美和准则、美和传承，是长期判断与行动的三项基础",
    lead:"业务、组织、工具和AI都会变化，但集团必须保留稳定的价值判断、行动原则与可传承的组织记忆。",
    content:`<div class="miwa-company-book-three">
      <article><span>WHY</span><h3>美和灵魂</h3><p>为什么存在、相信什么，以及面对变化时用什么判断方向。</p></article>
      <article><span>HOW</span><h3>美和准则</h3><p>真实、清晰、稳定、可验证、可维护、可扩展、可交接。</p></article>
      <article><span>LEGACY</span><h3>美和传承</h3><p>把经验、决策、知识、规则、数据、代码和方法形成可理解、可调用、可交接的长期资产。</p></article>
    </div>`,
    conclusion:"理念不是装饰文字，而是经营、系统和AI在复杂环境中保持方向一致的判断依据。",
    bookLabel:"美和之家"
  });
}

function page5() {
  return publicationPage({
    pageNumber:5,
    section:"第02章｜经营与战略",
    title:"AIONE是美和方法论第一个真实业务实验场",
    lead:"美和集团AI经营总架构以真实经营为中心，把经营目标、流程、对象、数据、规则、人、AI与管理决策连接成持续优化闭环。",
    content:`<div class="miwa-company-book-flow">
      ${["经营目标","业务流程","业务对象","状态与数据","规则与责任","AI／自动化","人类负责人","结果指标","管理决策","持续优化"].map((item,index)=>`<span><b>${String(index+1).padStart(2,"0")}</b>${item}</span>`).join("")}
    </div>`,
    conclusion:"先用AIONE跑通真实业务，再总结可复制的方法；系统负责放大正确的方法，而不是放大混乱。",
    bookLabel:"美和之家"
  });
}

function page6() {
  return publicationPage({
    pageNumber:6,
    section:"第03章｜事业与集团能力",
    title:"事业独立承担经营结果，集团能力持续共享",
    lead:"集团不是为了给每个事业重复建设一套部门和系统，而是让可复用的人才、AI、知识、财务、商品、供应链与数字能力按需支持真实事业。",
    content:`<div class="miwa-company-book-two miwa-company-book-two--stack">
      <article><span>BUSINESS</span><h3>事业前线</h3><p>围绕真实客户价值建立自己的目标、闭环、责任和经营结果。</p></article>
      <article><span>GROUP</span><h3>集团共享能力</h3><p>优先复用能够跨事业重复使用的能力、资源、规则、知识和数字基础设施。</p></article>
    </div>`,
    conclusion:"先确认共享能力和共享资源，组织部门最后决定；不机械按页面或系统模块建立组织。",
    bookLabel:"美和之家"
  });
}

function page7() {
  return publicationChapterSummary({
    pageNumber:7,
    chapter:"美和概览｜结束语",
    title:"理解美和，最终要回到真实经营",
    points:[
      "美和之家负责集团认知、战略方向、事业版图和组织发展的统一理解。",
      "美和长期坚持方向比速度重要、原则比方法重要，先把业务讲清楚再让系统与AI理解。",
      "事业承担客户价值和经营结果，集团共享长期能力，人与AI各自承担适合的责任。",
      "AIONE持续把真实业务结果、数据、规则和经验沉淀为未来能够传承和复制的方法资产。"
    ],
    next:"从左侧目录进入具体章节，继续阅读美和的理念、战略、事业、治理与正式资料。",
    bookLabel:"美和之家"
  });
}

function overviewHtml(){
  const cover = publicationCover({
    title:"美和集团",
    englishTitle:"MIWA GROUP",
    subtitle:MIWA_COMPANY_SUBTITLE,
    statement:"真实经营 · 长期主义 · 人AI协同 · 方法传承",
    bookLabel:"美和之家",
    visualHtml:`<img src="./assets/brand/miwa-company-logo-preview.png" alt="美和集团Logo">`
  });
  const back = publicationBackCover({
    title:"关于《美和集团经营管理手册》",
    summary:"本册用于帮助美和集团成员建立对集团定位、理念文化、经营战略、事业版图、治理方式和长期方法资产的共同认知。",
    contents:["集团介绍","理念与文化","经营与战略","事业与全球","组织与治理","品牌与价值"],
    audiences:["集团成员","事业负责人","新入职员工","管理人员"],
    bookLabel:"美和之家",
    visualHtml:`<img src="./assets/brand/miwa-company-logo-preview.png" alt="美和集团Logo">`
  });
  return `<article class="miwa-company-publication-book miwa-publication-book" data-publication-book="company-home">
    ${publicationCoverSpread(cover,back)}
    ${publicationSpread(page2(),page3(),"overview")}
    ${publicationSpread(page4(),page5(),"foundation")}
    ${publicationSpread(page6(),page7(),"closing")}
  </article>`;
}

export async function initMiwaCompanyHome(){
  const routeId=getRouteId();
  if(routeId!=="company"){
    setPublicationPageMode(false);
    return initLegacyCompanyHome();
  }
  setPublicationPageMode(true);
  const entry=document.getElementById("miwa-company-home-entry");
  if(!entry) return false;
  entry.innerHTML=overviewHtml();
  renderSemanticIcons(entry);
  bindPublicationActions(entry);
  configurePublicationAside({
    kicker:"美和之家",
    title:"美和概览",
    summary:"按美和数字出版设计系统阅读。宽屏优先双页，空间不足自动单页；打印与PDF按真实A4纵向单页输出。",
    bookTitle:"美和集团经营管理手册",
    chapter:"概览"
  });
  validatePublicationPages(entry);
  return true;
}
