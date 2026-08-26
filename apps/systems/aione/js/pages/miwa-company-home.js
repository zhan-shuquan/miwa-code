import { getRouteId } from "../config/route-registry.js";
import { aioneDownload } from "../services/aione-api-client.js";
import { mountLevel2EmptyBase } from "../templates/level2-empty-base.js";
import { getTemplateRecipe } from "../templates/template-registry.js";
import {
  MIWA_COMPANY_NAVIGATION,
  MIWA_COMPANY_SUBTITLE,
  MIWA_OVERVIEW_SUBTITLE,
  MIWA_GROUP_CORE_ASSETS,
  getMiwaCompanyPage,
  getMiwaCompanyGroupForRoute
} from "../data/miwa-company-content.js?v=20260826-v1.9.26-drive-proxy";

const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

function routeHref(route) {
  return route ? `#/${route}` : "#";
}

function statusClass(status = "") {
  if (/正式|已有内容|真实内容|已接入|已确认/.test(status)) return "is-ready";
  if (/待|未/.test(status)) return "is-pending";
  return "is-validating";
}

function currentGroup(routeId) {
  return getMiwaCompanyGroupForRoute(routeId) || MIWA_COMPANY_NAVIGATION[0];
}

function sourcePanel(page) {
  const sources = Array.isArray(page?.sources) ? page.sources : [];
  if (!sources.length) return "";
  return `<div class="miwa-company-source-panel">
    <span>内容来源</span>
    <div>${sources.map((item) => `<article><strong>${esc(item.title)}</strong><small>${esc(item.version)} · ${esc(item.date)} · ${esc(item.status)}</small></article>`).join("")}</div>
  </div>`;
}

function pageHero(page, options = {}) {
  const action = options.print === false ? "" : `<button type="button" class="miwa-company-btn miwa-company-btn--primary" data-company-action="print">导出 A4 PDF</button>`;
  const back = options.backRoute ? `<a class="miwa-company-btn" href="${routeHref(options.backRoute)}">返回${esc(options.backLabel || "上级")} →</a>` : "";
  return `
    <header class="miwa-company-page-hero">
      <div class="miwa-company-page-hero__copy">
        <span class="miwa-company-eyebrow">${esc(page.eyebrow || "MIWA GROUP")}</span>
        <h1>${esc(page.title)}</h1>
        <p>${esc(page.subtitle || MIWA_COMPANY_SUBTITLE)}</p>
        <div class="miwa-company-meta-row">
          <span>${esc(page.status || "验证中")}</span>
          <span>美和之家</span>
          <span>${Array.isArray(page.sources) && page.sources.length ? "真实资料已接入" : "内容与出版共源"}</span>
        </div>
        ${sourcePanel(page)}
      </div>
      <div class="miwa-company-page-hero__actions screen-only">${back}${action}</div>
    </header>`;
}

function overviewHtml() {
  return `
    <article class="miwa-company-publication" data-company-publication>
      <section class="miwa-company-cover miwa-company-print-page" id="company-overview-cover">
        <div class="miwa-company-cover__copy">
          <span class="miwa-company-eyebrow">MIWA GROUP</span>
          <h1>美和集团</h1>
          <p class="miwa-company-cover__lead">以真实经营为基础，持续构建多事业协同、人与AI协同的一体化经营体系。</p>
          <div class="miwa-company-chip-row">
            <span>日本经营</span><span>跨境电商</span><span>日本批发</span><span>进出口</span><span>品牌经营</span><span>AI原生经营</span>
          </div>
          <div class="miwa-company-cover__actions screen-only">
            <a class="miwa-company-btn miwa-company-btn--primary" href="#company-identity">了解美和集团 →</a>
            <button type="button" class="miwa-company-btn" data-company-action="print">导出 A4 PDF</button>
          </div>
        </div>
        <div class="miwa-company-cover__brand">
          <figure class="miwa-company-logo-card">
            <img src="./assets/brand/miwa-company-logo-preview.png" alt="美和商会株式会社公司Logo">
            <figcaption>美和商会株式会社｜公司正式白底Logo</figcaption>
          </figure>
        </div>
      </section>

      <section class="miwa-company-section miwa-company-print-page" id="company-identity">
        <div class="miwa-company-section__head">
          <div><span class="miwa-company-eyebrow">WHO WE ARE</span><h2>从真实经营出发</h2><p>认识今天的美和，以及美和正在形成怎样的企业。</p></div>
          <span class="miwa-company-section__number">01 / GROUP IDENTITY</span>
        </div>
        <div class="miwa-company-now-next">
          <article>
            <span class="miwa-company-card-kicker">REAL BUSINESS</span><h3>今天的美和</h3>
            <p>美和从真实业务出发，在日本持续开展电商、批发、进出口、供应链与品牌经营，并在实际经营中不断积累商品、客户、供应商、渠道与组织能力。</p>
            <div class="miwa-company-mini-grid"><span>日本电商</span><span>日本批发</span><span>中国供应链</span><span>进出口</span><span>自有品牌</span><span>东京本地经营</span></div>
          </article>
          <div class="miwa-company-transition" aria-hidden="true"><span></span><b>→</b></div>
          <article>
            <span class="miwa-company-card-kicker">NEXT MIWA</span><h3>正在形成的美和</h3>
            <p>在真实业务基础上，美和正在逐步形成以AIONE为经营基础设施、人与AI协同工作的AI原生经营体系，并将经过验证的方法沉淀为能够跨事业复用的长期经营能力。</p>
            <div class="miwa-company-mini-grid"><span>多事业经营</span><span>集团化发展</span><span>AIONE一体化</span><span>美和AI</span><span>人与AI协同</span><span>方法资产沉淀</span></div>
          </article>
        </div>
      </section>

      <section class="miwa-company-section miwa-company-section--soft miwa-company-print-page" id="company-philosophy-section">
        <div class="miwa-company-section__head">
          <div><span class="miwa-company-eyebrow">PHILOSOPHY & CULTURE</span><h2>理念与文化</h2><p>沉淀美和集团原创的核心信念、行动准则与长期传承，形成所有成员共同理解和持续践行的精神基础。</p></div>
          <span class="miwa-company-section__number">02 / THREE FOUNDATIONS</span>
        </div>
        <div class="miwa-company-philosophy-grid">
          <a href="#/company-spirit"><em>WHY</em><h3>美和灵魂</h3><p>我们为什么存在、相信什么。</p><span>查看完整内容 →</span></a>
          <a href="#/company-principles"><em>HOW</em><h3>美和准则</h3><p>我们如何判断、如何行动。</p><span>查看完整内容 →</span></a>
          <a href="#/company-heritage"><em>LEGACY</em><h3>美和传承</h3><p>什么值得长期保留并持续传递。</p><span>查看完整内容 →</span></a>
        </div>
        <div class="miwa-company-principle-flow"><span>灵魂</span><b>→</b><span>准则</span><b>→</b><span>行动</span><b>→</b><span>传承</span></div>
      </section>

      <section class="miwa-company-section miwa-company-section--architecture miwa-company-print-page" id="company-architecture-section">
        <div class="miwa-company-section__head">
          <div><span class="miwa-company-eyebrow">MIWA ORIGINAL AI MANAGEMENT ARCHITECTURE</span><h2>美和集团AI经营总架构</h2><p>以真实经营为基础，连接经营目标、业务流程、数据规则、人、AI与管理决策的美和原创经营体系。</p></div>
          <span class="miwa-company-section__number">03 / 433</span>
        </div>
        <div class="miwa-company-architecture-board">
          <div class="miwa-company-architecture-center"><strong>真实经营</strong><span>业务 · 数据 · 人 · AI · 管理决策</span></div>
          <div class="miwa-company-architecture-groups">
            <article><strong>四化</strong><ul><li>工作一体化</li><li>管理标准化</li><li>业务流程化</li><li>执行自动化</li></ul></article>
            <article><strong>三基石</strong><ul><li>美和灵魂</li><li>美和准则</li><li>美和传承</li></ul></article>
            <article><strong>三属性</strong><ul><li>普适</li><li>开放</li><li>共享</li></ul></article>
          </div>
        </div>
        <div class="miwa-company-flow-strip"><span>经营目标</span><b>→</b><span>业务流程</span><b>→</b><span>业务对象</span><b>→</b><span>状态与数据</span><b>→</b><span>规则与责任</span><b>→</b><span>AI与自动化</span><b>→</b><span>人类负责人</span><b>→</b><span>结果指标</span><b>→</b><span>管理决策</span><b>→</b><span>持续优化</span></div>
        <div class="miwa-company-subflow">操作闭环 → 业务闭环 → 经营闭环</div>
        <div class="miwa-company-execution-principles">
          <article><b>01</b><strong>战略未动 · 情报先行</strong><span>先看清外部环境与内部真实状态。</span></article>
          <article><b>02</b><strong>作战未起 · 粮草先行</strong><span>先确认资金、商品、数字资源、数据与人才。</span></article>
          <article><b>03</b><strong>命令一出 · 执行到底</strong><span>任务找到正确的人或AI，权责与异常升级清楚。</span></article>
          <article><b>04</b><strong>战果必留 · 复盘必做</strong><span>结果、数据、证据和经验重新进入下一轮经营。</span></article>
        </div>
        <a class="miwa-company-inline-link screen-only" href="#/company-management-architecture">查看AI经营总架构 →</a>
      </section>

      <section class="miwa-company-section miwa-company-print-page" id="company-business-section">
        <div class="miwa-company-section__head">
          <div><span class="miwa-company-eyebrow">BUSINESS PORTFOLIO</span><h2>事业版图</h2><p>立足真实业务，逐步构建美和集团多事业协同发展的经营版图。</p></div>
          <span class="miwa-company-section__number">04 / BUSINESS</span>
        </div>
        <div class="miwa-company-business-grid">
          <a class="is-core" href="#/selection"><span>核心现实事业</span><h3>美和跨境</h3><p>围绕日本电商形成商品开发、采购、上架、运营、订单、库存与客户服务闭环。</p><b>进入事业 →</b></a>
          <a class="is-core" href="#/wholesale-products"><span>核心现实事业</span><h3>美和批发</h3><p>面向日本国内客户开展商品企划、商谈、受注、出荷、请款与客户服务。</p><b>进入事业 →</b></a>
          <article><span>状态待确认</span><h3>美和品牌</h3><p>集团品牌经营与自有品牌能力的长期事业空间。</p></article>
          <article><span>状态待确认</span><h3>美和物流</h3><p>围绕履约、物流与供应链能力形成的事业方向。</p></article>
          <article><span>状态待确认</span><h3>美和留学</h3><p>已形成早期事业目标，正式状态与当前业务定位后续确认。</p></article>
          <article><span>持续演进</span><h3>其他事业</h3><p>不动产、商务咨询、独立站等既有方向按真实发展逐步进入正式版图。</p></article>
        </div>
      </section>

      <section class="miwa-company-section miwa-company-section--soft miwa-company-print-page" id="company-roadmap-section">
        <div class="miwa-company-section__head">
          <div><span class="miwa-company-eyebrow">ROADMAP</span><h2>发展路线</h2><p>格局按长期集团设计，目标按真实经营逐步确认；没有真实数据时不使用示例数字冒充正式成果。</p></div>
          <span class="miwa-company-section__number">05 / NOW · 3Y · 5Y · 10Y</span>
        </div>
        <div class="miwa-company-roadmap">
          <article class="is-current"><span>NOW</span><h3>真实业务与AI经营体系验证</h3><p>先用AIONE跑通真实业务，再总结可复制的方法；先形成证据，再形成标准。</p></article>
          <article><span>3 YEARS</span><h3>正式目标待确认</h3><p>保留长期位置，等待正式规划内容。</p></article>
          <article><span>5 YEARS</span><h3>正式目标待确认</h3><p>只使用经过经营确认的集团目标。</p></article>
          <article><span>10 YEARS</span><h3>长期愿景待确认</h3><p>不以演示文字替代真实战略判断。</p></article>
        </div>
        <a class="miwa-company-inline-link screen-only" href="#/company-development-plan">查看完整发展规划 →</a>
      </section>

      <section class="miwa-company-section miwa-company-print-page" id="company-history-section">
        <div class="miwa-company-section__head">
          <div><span class="miwa-company-eyebrow">MIWA HISTORY</span><h2>发展历程</h2><p>只记录真正改变美和发展方向的重要节点，并持续形成可追溯的集团历史。</p></div>
          <span class="miwa-company-section__number">06 / HISTORY</span>
        </div>
        <div class="miwa-company-timeline">
          <article><time>早期</time><div><h3>多事业目标与原创企业视觉体系开始形成</h3><p>在AI出现以前，美和已经形成跨境、商务咨询、留学、物流等事业方向及相应原创事业视觉标识。</p></div></article>
          <article><time>2026</time><div><h3>AIONE进入真实业务验证阶段</h3><p>美和开始以真实业务持续验证一体化工作平台、AI协同与方法资产沉淀。</p></div></article>
          <article><time>2026-08</time><div><h3>美和AI第一条真实业务执行闭环完成验证</h3><p>AIONE真实业务数据 → 美和AI分析 → Proposal → 人工确认 → 执行层 → 工作事项落地。</p></div></article>
          <article><time>持续补充</time><div><h3>集团历史事实逐步归档</h3><p>成立、事业启动、品牌、组织、海外布局等内容只在事实确认后进入正式时间轴。</p></div></article>
        </div>
      </section>

      <section class="miwa-company-closing" id="company-closing">
        <div><span class="miwa-company-eyebrow">MIWA GROUP</span><h2>让内容成为可以持续复用的集团资产</h2><p>同一正式内容源逐步服务AIONE、美和AI、PDF资料与未来集团官网。</p></div>
        <div class="screen-only"><a class="miwa-company-btn miwa-company-btn--light" href="#/company-core-assets">集团核心资料 →</a></div>
      </section>
    </article>`;
}

function groupHtml(page, routeId) {
  const group = currentGroup(routeId);
  const children = group?.children || [];
  return `
    <article class="miwa-company-publication miwa-company-article-page">
      ${pageHero(page, { backRoute:"company", backLabel:"美和概览" })}
      <section class="miwa-company-content-sheet miwa-company-print-page">
        <div class="miwa-company-section__head"><div><span class="miwa-company-eyebrow">SECTION DIRECTORY</span><h2>${esc(page.title)}目录</h2><p>一级目录负责稳定分类，二级页面负责具体内容。目录可以先建立，正式内容按真实业务逐步补充。</p></div></div>
        <div class="miwa-company-directory-grid">
          ${children.map((item, index) => `<a href="${routeHref(item.route)}"><span>${String(index + 1).padStart(2,"0")}</span><h3>${esc(item.label)}</h3><p>${esc(item.subtitle || "")}</p><b>${esc(item.status || "验证中")} · 进入 →</b></a>`).join("")}
        </div>
      </section>
    </article>`;
}

function articleHtml(page, routeId) {
  const group = currentGroup(routeId);
  const sections = Array.isArray(page.sections) && page.sections.length ? page.sections : [
    { title:"页面定位", text:"目录与页面位置已经锁定，正式内容将在真实资料确认后逐步接入。当前不为了页面完整而虚构内容。" },
    { title:"建设原则", text:"内容可以持续丰富，但名称、归属、版本、权限与来源需要保持清晰，确保员工、美和AI与未来出版渠道读取同一正式内容源。" }
  ];
  return `
    <article class="miwa-company-publication miwa-company-article-page">
      ${pageHero(page, { backRoute:group?.route || "company", backLabel:group?.label || "美和之家" })}
      ${sections.map((section, index) => `<section class="miwa-company-content-sheet ${index === 0 ? "miwa-company-content-sheet--lead" : ""} miwa-company-print-page"><span class="miwa-company-eyebrow">${String(index + 1).padStart(2,"0")} / CONTENT</span><h2>${esc(section.title)}</h2><p>${esc(section.text)}</p></section>`).join("")}
      ${relatedNav(group, routeId)}
    </article>`;
}

function factsHtml(page, routeId) {
  const rows = page.title === "会社概要" ? [
    ["公司名称", "美和商会株式会社"], ["英文名称", "MIWA SHOUKAI CO., LTD."], ["代表者", "待确认"], ["成立时间", "待确认"], ["资本金", "待确认"], ["所在地", "待确认"], ["主要事业", "日本电商 / 日本批发 / 进出口 / 品牌经营等（正式表述待确认）"], ["联系方式", "待确认"]
  ] : [
    ["日本公司/据点", "待补充"], ["中国相关公司/供应链据点", "待补充"], ["办公室", "待补充"], ["仓库/履约据点", "待补充"], ["其他国家与地区", "真实发生后补充"]
  ];
  const group = currentGroup(routeId);
  return `
    <article class="miwa-company-publication miwa-company-article-page">
      ${pageHero(page, { backRoute:group?.route || "company", backLabel:group?.label || "美和之家" })}
      <section class="miwa-company-content-sheet miwa-company-print-page">
        <div class="miwa-company-facts">${rows.map(([label,value]) => `<div><span>${esc(label)}</span><strong class="${/待/.test(value)?"is-pending":""}">${esc(value)}</strong></div>`).join("")}</div>
        <p class="miwa-company-content-note">事实型内容不猜测。未确认项目保持“待确认/待补充”，以后由正式公司资料或数据库更新。</p>
      </section>
      ${relatedNav(group, routeId)}
    </article>`;
}

function architectureHtml(page, routeId) {
  const group = currentGroup(routeId);
  const forces = [
    ["指挥军","总参谋部 / 战略情报 / 集团指挥与调度","看清、想清、指挥清楚"],
    ["作战军","品牌宣传 / 市场作战 / 各事业作战军团","创造客户价值、收入与市场影响"],
    ["建设军","工程建设 / AI人才建设 / 科研创新","制造系统、AI、工具和新能力"],
    ["保障军","军需后勤 / 人才训练 / 安全监察 / 战备","保证前线长期有粮、有兵、有装备、有安全"]
  ];
  const steps = ["确定目标","侦察环境","形成方案","确认粮草","准备装备与兵力","宣传/销售打开市场","事业执行交付","记录战果","分析复盘","重新决策"];
  return `
    <article class="miwa-company-publication miwa-company-article-page">
      ${pageHero(page, { backRoute:group?.route || "company", backLabel:group?.label || "经营与战略" })}
      <section class="miwa-company-content-sheet miwa-company-content-sheet--architecture miwa-company-print-page">
        <span class="miwa-company-eyebrow">STRATEGIC MOTHER ARCHITECTURE</span>
        <h2>433｜美和经营方法的稳定表达</h2>
        <div class="miwa-company-architecture-board miwa-company-architecture-board--detail">
          <div class="miwa-company-architecture-center"><strong>美和集团AI经营总架构</strong><span>真实经营 → 标准 → AI/自动化 → 决策 → 持续优化</span></div>
          <div class="miwa-company-architecture-groups">
            <article><strong>四化</strong><ul><li>工作一体化</li><li>管理标准化</li><li>业务流程化</li><li>执行自动化</li></ul></article>
            <article><strong>三基石</strong><ul><li>美和灵魂</li><li>美和准则</li><li>美和传承</li></ul></article>
            <article><strong>三属性</strong><ul><li>普适</li><li>开放</li><li>共享</li></ul></article>
          </div>
        </div>
        <div class="miwa-company-flow-strip"><span>经营目标</span><b>→</b><span>业务流程</span><b>→</b><span>业务对象</span><b>→</b><span>状态与数据</span><b>→</b><span>规则与责任</span><b>→</b><span>AI与自动化</span><b>→</b><span>人类负责人</span><b>→</b><span>结果指标</span><b>→</b><span>管理决策</span><b>→</b><span>持续优化</span></div>
        <div class="miwa-company-subflow">操作闭环 → 业务闭环 → 经营闭环</div>
      </section>

      <section class="miwa-company-content-sheet miwa-company-print-page">
        <span class="miwa-company-eyebrow">EXECUTION SYSTEM</span>
        <h2>美和集团AI执行总架构｜军团执行体系</h2>
        <p>AI执行总架构不是新的经营母架构，而是美和集团AI经营总架构之下的集团级军团执行体系。它以统一指挥、情报、后勤、训练、作战、监察与复盘等组织逻辑，强化责任边界、AI协同和结果落地。</p>
        <div class="miwa-company-force-grid">${forces.map(([name,units,mission]) => `<article><span>${esc(name)}</span><h3>${esc(mission)}</h3><p>${esc(units)}</p></article>`).join("")}</div>
      </section>

      <section class="miwa-company-content-sheet miwa-company-print-page">
        <span class="miwa-company-eyebrow">FOUR EXECUTION PRINCIPLES</span>
        <h2>四条底层作战原则</h2>
        <div class="miwa-company-execution-principles miwa-company-execution-principles--detail">
          <article><b>01</b><strong>战略未动 · 情报先行</strong><span>重大行动前必须有外部环境与内部真实状态的事实和证据基础。</span></article>
          <article><b>02</b><strong>作战未起 · 粮草先行</strong><span>行动前确认资金、商品、数字资源、数据与人才是否能够持续支撑。</span></article>
          <article><b>03</b><strong>命令一出 · 执行到底</strong><span>任务必须找到正确的人或AI，明确权责、时限、权限与异常升级。</span></article>
          <article><b>04</b><strong>战果必留 · 复盘必做</strong><span>每次经营形成结果、数据、证据与经验，并反馈到下一轮资源配置。</span></article>
        </div>
      </section>

      <section class="miwa-company-content-sheet miwa-company-print-page">
        <span class="miwa-company-eyebrow">STANDARD OPERATION LOOP</span>
        <h2>十步经营闭环</h2>
        <div class="miwa-company-operation-loop">${steps.map((step,index) => `<article><b>${index + 1}</b><span>${esc(step)}</span></article>`).join("")}</div>
        <div class="miwa-company-content-note">每一次经营都必须形成结果、数据与证据，并重新进入下一轮经营判断和资源配置。</div>
      </section>

      <section class="miwa-company-content-sheet miwa-company-print-page">
        <span class="miwa-company-eyebrow">AI & HUMAN</span>
        <h2>人与AI的责任关系</h2>
        <p>能规则化的规则化，能自动化的自动化，需要判断的交给AI，需要负责的留给人。AI可以在授权范围内承担分析和执行主责，但最终经营责任、重大授权与高风险异常必须有明确的人类负责人。</p>
      </section>
      ${relatedNav(group, routeId)}
    </article>`;
}

function roadmapHtml(page, routeId) {
  const group = currentGroup(routeId);
  return `
    <article class="miwa-company-publication miwa-company-article-page">
      ${pageHero(page, { backRoute:group?.route || "company", backLabel:group?.label || "经营与战略" })}
      <section class="miwa-company-content-sheet miwa-company-print-page">
        <div class="miwa-company-roadmap miwa-company-roadmap--detail">
          <article class="is-current"><span>NOW</span><h3>真实业务优先</h3><p>2026年9月起以全员真实使用为主线，优先优化业务、逻辑、结构和体验。</p></article>
          <article><span>3 YEARS</span><h3>目标待正式确认</h3><p>保留目录与版式，不用示例目标替代真实规划。</p></article>
          <article><span>5 YEARS</span><h3>目标待正式确认</h3><p>未来由正式集团规划内容更新。</p></article>
          <article><span>10 YEARS</span><h3>长期愿景待确认</h3><p>只在经营判断形成后锁定。</p></article>
        </div>
      </section>
      ${relatedNav(group, routeId)}
    </article>`;
}

function businessMapHtml(page, routeId) {
  const group = currentGroup(routeId);
  return `
    <article class="miwa-company-publication miwa-company-article-page">
      ${pageHero(page, { backRoute:group?.route || "company", backLabel:group?.label || "事业与全球" })}
      <section class="miwa-company-content-sheet miwa-company-print-page">
        <div class="miwa-company-business-grid miwa-company-business-grid--detail">
          <a class="is-core" href="#/selection"><span>运行中 · 核心现实事业</span><h3>美和跨境</h3><p>当前AIONE优先跑通的真实业务事业。</p><b>进入事业 →</b></a>
          <a class="is-core" href="#/wholesale-products"><span>运行中 · 核心现实事业</span><h3>美和批发</h3><p>日本国内批发核心现实业务。</p><b>进入事业 →</b></a>
          ${["美和留学","美和不动产","美和商务咨询","美和独立站","美和品牌","美和物流"].map((name) => `<article><span>状态待确认</span><h3>${name}</h3><p>已有事业方向或长期规划，正式状态按真实经营进展确认。</p></article>`).join("")}
        </div>
      </section>
      ${relatedNav(group, routeId)}
    </article>`;
}

function brandsHtml(page, routeId) {
  const group = currentGroup(routeId);
  const brands = [
    ["企业品牌", "美和 / MIWA", "集团与公司核心企业识别"],
    ["事业品牌", "美和跨境 / 美和批发 / 其他事业", "事业级识别按当前状态确认"],
    ["商品品牌", "HATORIA / SOCKONE / LIFEONE", "商品与消费者品牌体系"]
  ];
  return `
    <article class="miwa-company-publication miwa-company-article-page">
      ${pageHero(page, { backRoute:group?.route || "company", backLabel:group?.label || "品牌与价值" })}
      <section class="miwa-company-content-sheet miwa-company-print-page">
        <div class="miwa-company-brand-levels">${brands.map(([level,name,text]) => `<article><span>${esc(level)}</span><h3>${esc(name)}</h3><p>${esc(text)}</p></article>`).join("")}</div>
        <div class="miwa-company-subflow">企业品牌 → 事业品牌 → 商品品牌</div>
      </section>
      ${relatedNav(group, routeId)}
    </article>`;
}

function identityHtml(page, routeId) {
  const group = currentGroup(routeId);
  return `
    <article class="miwa-company-publication miwa-company-article-page">
      ${pageHero(page, { backRoute:group?.route || "company", backLabel:group?.label || "品牌与价值" })}
      <section class="miwa-company-content-sheet miwa-company-identity-layout miwa-company-print-page">
        <figure class="miwa-company-identity-logo"><img src="./assets/brand/miwa-company-logo-preview.png" alt="美和商会株式会社正式Logo"><figcaption>美和商会株式会社｜公司正式Logo（白底使用）</figcaption></figure>
        <div><span class="miwa-company-eyebrow">FOUNDER ORIGINAL MARK</span><h2>从创业早期延续至今的原创识别资产</h2><p>美和公司Logo由创始人在GPT等生成式AI出现以前自主设计。当前原则不是重新设计Logo，而是保留原始结构、比例与红绿关系，并逐步明确主标识、事业标识、衍生标识与历史标识的身份和使用范围。</p><div class="miwa-company-identity-rules"><span>不拉伸</span><span>不压缩</span><span>不拆分</span><span>不重新组合</span><span>白底正式场景优先</span></div></div>
      </section>
      ${relatedNav(group, routeId)}
    </article>`;
}

function historyHtml(page, routeId) {
  const group = currentGroup(routeId);
  return `
    <article class="miwa-company-publication miwa-company-article-page">
      ${pageHero(page, { backRoute:group?.route || "company", backLabel:group?.label || "发展与动态" })}
      <section class="miwa-company-content-sheet miwa-company-print-page">
        <div class="miwa-company-timeline">
          <article><time>早期</time><div><h3>多事业目标与战略方向已经形成</h3><p>跨境、商务咨询、留学、物流等事业目标及相应原创视觉标识在AI出现以前已经存在。</p></div></article>
          <article><time>2026</time><div><h3>AIONE成为美和方法论第一个真实业务实验场</h3><p>从系统建设转向真实经营验证，并开始持续记录效率、流程与AI贡献证据。</p></div></article>
          <article><time>2026-08</time><div><h3>美和AI第一条真实业务执行闭环验证</h3><p>AIONE真实业务数据 → 美和AI分析 → Proposal → 人工确认 → Tool/执行层 → 工作事项落地。</p></div></article>
          <article><time>持续补充</time><div><h3>历史必须以真实事实为依据</h3><p>公司成立、重大合作、品牌、事业、组织与海外布局等节点在资料确认后补入。</p></div></article>
        </div>
      </section>
      ${relatedNav(group, routeId)}
    </article>`;
}

function assetsHtml(page, routeId) {
  const group = currentGroup(routeId);
  const scope = page.assetScope || "all";
  const items = MIWA_GROUP_CORE_ASSETS.filter((asset) => {
    if (scope === "all") return true;
    if (scope === "public") return asset.visibility !== "内部";
    return asset.scope === scope;
  });
  return `
    <article class="miwa-company-publication miwa-company-article-page">
      ${pageHero(page, { backRoute:group?.route === routeId ? "company" : group?.route || "company", backLabel:group?.route === routeId ? "美和概览" : group?.label || "企业资料" })}
      <section class="miwa-company-content-sheet miwa-company-assets-sheet miwa-company-print-page">
        <div class="miwa-company-assets-toolbar screen-only"><label><span>搜索资料</span><input type="search" data-company-asset-search placeholder="名称 / 类型 / 主题"></label><label><span>类型</span><select data-company-asset-type><option value="">全部</option><option>PDF</option><option>PPTX</option><option>DOCX</option><option>XLSX</option><option>IMAGE</option></select></label></div>
        <div class="miwa-company-assets-list" data-company-assets-list>
          ${items.length ? items.map(assetRow).join("") : `<div class="miwa-company-empty-state"><strong>目录已就位</strong><p>当前没有符合该范围的资料。真实资料索引与内容摘要已经进入AIONE；原始文件只需按正式目录绑定，不必重新设计页面。</p></div>`}
        </div>
        <div class="miwa-company-package-bar screen-only" data-company-package-bar hidden><span>已选择 <b data-company-package-count>0</b> 项</span><button type="button" data-company-action="package">生成PDF资料包（预留）</button></div>
      </section>
      ${relatedNav(group, routeId)}
    </article>`;
}

function assetRow(asset) {
  const available = Boolean(asset.url);
  const downloadable = Boolean(asset.downloadPath);
  const hasContent = Boolean(asset.contentRoute);
  return `<article class="miwa-company-asset-row" data-company-asset-row data-title="${esc([asset.title,asset.summary,asset.fileName].filter(Boolean).join(" "))}" data-type="${esc(asset.type)}">
    <label class="screen-only"><input type="checkbox" data-company-asset-select value="${esc(asset.id)}"></label>
    <div class="miwa-company-asset-row__name">
      <strong>${esc(asset.title)}</strong>
      <span>${esc(asset.summary || asset.status)}</span>
      <small>${esc(asset.fileName || "")}${asset.sourceDate ? ` · ${esc(asset.sourceDate)}` : ""}</small>
    </div>
    <b>${esc(asset.type)}</b>
    <span>${esc(asset.version)}</span>
    <span>${esc(asset.recordStatus || asset.visibility)}</span>
    <div class="screen-only">
      ${hasContent ? `<a href="${routeHref(asset.contentRoute)}">看内容</a>` : ""}
      ${available ? `<a href="${esc(asset.url)}" target="_blank" rel="noopener noreferrer" title="在Google Drive打开当前原件">查看原件 ↗</a>${downloadable ? `<button type="button" data-company-action="download-asset" data-asset-id="${esc(asset.id)}" data-download-path="${esc(asset.downloadPath)}" title="通过AIONE安全下载当前原始文件">下载原件</button>` : ""}` : `<button type="button" disabled title="资料索引已接入，但当前没有绑定正式原件">原件待绑定</button>`}
    </div>
  </article>`;
}

function externalHtml(page, routeId) {
  const group = currentGroup(routeId);
  return `
    <article class="miwa-company-publication miwa-company-article-page">
      ${pageHero(page, { print:false, backRoute:group?.route || "company", backLabel:group?.label || "美和之家" })}
      <section class="miwa-company-content-sheet miwa-company-external-card">
        <span class="miwa-company-eyebrow">OFFICIAL EXTERNAL ENTRY</span><h2>集团官网入口已经预留</h2><p>未来官网面向客户、合作伙伴、人才与社会公众；AIONE美和之家面向内部员工。两端可以共用经批准的正式内容，但公开权限必须分离。</p>
        <button type="button" class="miwa-company-btn" disabled>官网URL待确认</button>
      </section>
    </article>`;
}

function relatedNav(group, routeId) {
  const siblings = (group?.children || []).filter((item) => item.route !== routeId).slice(0, 4);
  if (!siblings.length) return "";
  return `<nav class="miwa-company-related screen-only" aria-label="相关内容"><span>相关内容</span>${siblings.map((item) => `<a href="${routeHref(item.route)}">${esc(item.label)} →</a>`).join("")}</nav>`;
}

function renderPage(page, routeId) {
  if (page.kind === "overview") return overviewHtml();
  if (page.kind === "group") return groupHtml(page, routeId);
  if (page.kind === "facts") return factsHtml(page, routeId);
  if (page.kind === "architecture") return architectureHtml(page, routeId);
  if (page.kind === "roadmap") return roadmapHtml(page, routeId);
  if (page.kind === "business-map") return businessMapHtml(page, routeId);
  if (page.kind === "brands") return brandsHtml(page, routeId);
  if (page.kind === "identity") return identityHtml(page, routeId);
  if (page.kind === "history") return historyHtml(page, routeId);
  if (page.kind === "assets") return assetsHtml(page, routeId);
  if (page.kind === "external") return externalHtml(page, routeId);
  return articleHtml(page, routeId);
}

function bindPageActions(root) {
  root.querySelectorAll('[data-company-action="print"]').forEach((button) => button.addEventListener("click", () => window.print()));

  root.querySelectorAll('[data-company-action="download-asset"]').forEach((button) => button.addEventListener("click", async () => {
    const path = String(button.dataset.downloadPath || "");
    if (!path) return;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "下载中...";
    try {
      await aioneDownload(path);
    } catch (error) {
      const code = error?.payload?.error || "";
      const message = code === "drive_runtime_access_missing"
        ? "AIONE后台尚未取得美和共享云盘读取权限。请先给AIONE运行服务账号授予共享云盘 Viewer 权限。"
        : (error?.message || "下载失败，请稍后再试。");
      window.alert(message);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }));

  const search = root.querySelector("[data-company-asset-search]");
  const type = root.querySelector("[data-company-asset-type]");
  const rows = [...root.querySelectorAll("[data-company-asset-row]")];
  const applyFilter = () => {
    const query = String(search?.value || "").trim().toLowerCase();
    const fileType = String(type?.value || "");
    rows.forEach((row) => {
      const matchQuery = !query || String(row.dataset.title || "").toLowerCase().includes(query);
      const matchType = !fileType || row.dataset.type === fileType;
      row.hidden = !(matchQuery && matchType);
    });
  };
  search?.addEventListener("input", applyFilter);
  type?.addEventListener("change", applyFilter);

  const selections = [...root.querySelectorAll("[data-company-asset-select]")];
  const packageBar = root.querySelector("[data-company-package-bar]");
  const packageCount = root.querySelector("[data-company-package-count]");
  const syncPackage = () => {
    const count = selections.filter((input) => input.checked).length;
    if (packageBar) packageBar.hidden = count === 0;
    if (packageCount) packageCount.textContent = String(count);
  };
  selections.forEach((input) => input.addEventListener("change", syncPackage));
  root.querySelector('[data-company-action="package"]')?.addEventListener("click", () => {
    window.alert("V1.9.26已将原件下载切换为AIONE后台安全代理；当前下载不再依赖浏览器直接访问Google下载URL。多资料合并PDF继续作为后续出版能力，PPT自动生成继续后置。");
  });
}

function dispatchAside(page, routeId) {
  const group = currentGroup(routeId);
  const items = routeId === "company" ? [
    { label:"当前阶段", value:"全员正式启用准备期" },
    { label:"内容状态", value:"V1.9.26 Shared Drive安全下载" },
    { label:"经营架构", value:"查看美和集团AI经营总架构", route:"company-management-architecture" },
    { label:"企业资料", value:"查看集团核心资料", route:"company-core-assets" }
  ] : [
    { label:"所属目录", value:group?.label || "美和之家", route:group?.route || "company" },
    { label:"内容状态", value:page.status || "验证中" },
    { label:"页面定位", value:page.subtitle || MIWA_COMPANY_SUBTITLE },
    { label:"美和AI", value:"未来默认读取正式最新版内容与原始来源" }
  ];
  window.dispatchEvent(new CustomEvent("aione:page-aside-context", { detail:{ state:"standard", kicker:"美和之家", title:page.title || "美和之家", text:routeId === "company" ? MIWA_OVERVIEW_SUBTITLE : page.subtitle, items } }));
}

export async function initMiwaCompanyHome() {
  if (!getTemplateRecipe("corporate-publication")) throw new Error("企业数字出版母版Recipe未注册");
  const routeId = getRouteId();
  const page = getMiwaCompanyPage(routeId);
  const entry = document.getElementById("miwa-company-home-entry");
  if (!entry) return false;

  const base = await mountLevel2EmptyBase(entry, { routeId, recipeId:"corporate-publication", pageKind:"corporate-content", evidenceScope:"miwa-company" });
  base.root.classList.add("miwa-company-level2-base");
  base.pageHeader.hidden = true;
  base.nineElements.hidden = true;
  base.main.innerHTML = renderPage(page, routeId);
  bindPageActions(base.main);
  dispatchAside(page, routeId);
  window.AIONEMiwaCompany = Object.freeze({ routeId, page, navigation:MIWA_COMPANY_NAVIGATION });
  return true;
}
