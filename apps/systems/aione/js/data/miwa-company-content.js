/* ========================================
   MIWA Company Content｜美和之家正式内容索引 V1
   目标：目录先稳定，内容按真实事实逐步补充；页面、PDF、美和AI未来共用同一内容定义。
======================================== */

const child = (id, label, route, subtitle, options = {}) => Object.freeze({
  id, label, route, subtitle, icon: options.icon || "", status: options.status || "验证中"
});

const group = (id, label, route, icon, subtitle, children = []) => Object.freeze({
  id, label, route, icon, subtitle, children: Object.freeze(children)
});

export const MIWA_COMPANY_NAVIGATION = Object.freeze([
  Object.freeze({ id:"company-overview", label:"美和概览", route:"company", icon:"knowledge", children:[] }),
  group("company-introduction", "集团介绍", "company-introduction", "knowledge", "我们是谁", [
    child("company-positioning", "集团定位", "company-positioning", "说明美和的长期定位与发展方向。"),
    child("company-summary", "集团简介", "company-summary", "用简洁内容快速理解美和。"),
    child("company-profile", "会社概要", "company-profile", "统一管理法定与事实型公司基本资料。"),
    child("company-organization", "集团组织", "company-organization", "理解集团、公司、事业与组织之间的关系。")
  ]),
  group("company-philosophy", "理念与文化", "company-philosophy", "brand", "我们为什么存在、相信什么", [
    child("company-spirit", "美和灵魂", "company-spirit", "定义美和长期坚持的核心信念与存在意义。"),
    child("company-principles", "美和准则", "company-principles", "明确共同遵循的判断与行动原则。"),
    child("company-heritage", "美和传承", "company-heritage", "沉淀值得长期保留的理念、经验、方法与组织记忆。")
  ]),
  group("company-strategy", "经营与战略", "company-strategy", "analysis", "我们怎么经营、准备去哪里", [
    child("company-management-architecture", "经营架构", "company-management-architecture", "展示美和原创AI经营架构与经营闭环。"),
    child("company-development-strategy", "发展战略", "company-development-strategy", "说明集团长期发展的战略方向。"),
    child("company-development-plan", "发展规划", "company-development-plan", "承载3年、5年、10年发展规划。")
  ]),
  group("company-global", "事业与全球", "company-global", "shared", "我们在哪里经营、有哪些事业", [
    child("company-business-map", "事业版图", "company-business-map", "展示集团当前与未来事业组合。"),
    child("company-global-layout", "全球布局", "company-global-layout", "展示国家、地区与业务覆盖布局。"),
    child("company-locations", "公司与据点", "company-locations", "统一展示公司、办公室、仓库与业务据点。")
  ]),
  group("company-governance", "组织与治理", "company-governance", "shield", "谁负责、怎么治理", [
    child("company-governance-structure", "治理架构", "company-governance-structure", "说明公司治理与责任结构。"),
    child("company-leadership", "经营团队", "company-leadership", "展示关键经营角色与责任。"),
    child("company-compliance", "合规原则", "company-compliance", "说明法律、财务、信息与商业伦理的基本原则。")
  ]),
  group("company-brand-value", "品牌与价值", "company-brand-value", "brand", "美和向社会传递什么价值", [
    child("company-brand-system", "品牌体系", "company-brand-system", "说明企业品牌、事业品牌与商品品牌之间的关系。"),
    child("company-image", "企业形象", "company-image", "管理美和企业视觉识别与原创品牌资产。"),
    child("company-responsibility", "社会责任", "company-responsibility", "逐步沉淀企业对客户、员工、供应链与社会的责任。")
  ]),
  group("company-development", "发展与动态", "company-development", "lifecycle", "我们怎么走到今天、现在发生什么", [
    child("company-history", "发展历程", "company-history", "记录美和集团持续发展的真实历史。"),
    child("company-milestones", "重要里程碑", "company-milestones", "只记录真正改变公司方向的重要节点。"),
    child("company-news", "集团动态", "company-news", "展示当前真正重要的集团级变化。")
  ]),
  group("company-assets", "企业资料", "company-assets", "file", "正式企业资料统一出口", [
    child("company-documents", "公司资料", "company-documents", "公司介绍、会社概要等正式资料入口。"),
    child("company-core-assets", "集团核心资料", "company-core-assets", "集团核心经营、组织、AI与战略资料入口。"),
    child("company-brand-guidelines", "品牌规范", "company-brand-guidelines", "Logo、配色、视觉资产与使用规则。"),
    child("company-public-assets", "公开资料", "company-public-assets", "经确认允许对外提供的集团资料。")
  ]),
  group("company-external", "外部连接", "company-external", "external", "连接集团对外官网", [
    child("company-website", "美和集团官网 ↗", "company-website", "未来集团对外官网统一入口。", { status:"待确认" })
  ])
]);

export const MIWA_COMPANY_SUBTITLE = "美和集团内部的集团认知、战略方向、事业版图和组织发展的统一入口。";
export const MIWA_OVERVIEW_SUBTITLE = "一页理解美和集团的身份、理念、经营体系、事业版图、发展方向与成长历程。";

export const MIWA_COMPANY_PAGES = Object.freeze({
  company: Object.freeze({
    title:"美和概览", eyebrow:"MIWA GROUP", subtitle:MIWA_OVERVIEW_SUBTITLE, kind:"overview", status:"验证中"
  }),

  "company-introduction": Object.freeze({ title:"集团介绍", eyebrow:"WHO WE ARE", subtitle:"统一说明美和集团是谁、如何定位，以及公司与组织的基本事实。", kind:"group", status:"验证中" }),
  "company-positioning": Object.freeze({
    title:"集团定位", eyebrow:"GROUP POSITIONING", subtitle:"明确美和从真实经营出发、逐步形成多事业协同与AI原生经营体系的长期定位。", kind:"article", status:"验证中",
    sections:[
      { title:"当前理解", text:"美和从日本真实经营业务出发，持续积累商品、客户、供应商、渠道、供应链与组织能力，并以AIONE作为未来一体化经营基础设施。" },
      { title:"长期方向", text:"集团化、多事业化与人与AI协同不是为了扩大组织复杂度，而是为了让经过真实验证的方法、数据和能力能够跨事业复用。" }
    ]
  }),
  "company-summary": Object.freeze({
    title:"集团简介", eyebrow:"GROUP PROFILE", subtitle:"用简洁、稳定、可对内外复用的方式快速认识美和。", kind:"article", status:"待完善",
    sections:[{ title:"简介内容", text:"当前已有日本电商、日本批发、进出口、中国供应链、自有品牌与东京本地经营等真实业务基础。正式公司介绍正文将以已确认资料为准持续补充。" }]
  }),
  "company-profile": Object.freeze({ title:"会社概要", eyebrow:"COMPANY FACTS", subtitle:"统一管理公司名称、代表者、地址、成立时间、资本金、事业内容等事实型公司资料。", kind:"facts", status:"待补充" }),
  "company-organization": Object.freeze({ title:"集团组织", eyebrow:"ORGANIZATION", subtitle:"帮助成员理解集团、公司、事业、组织与岗位之间的基本关系。", kind:"article", status:"待完善", sections:[{title:"边界原则",text:"美和之家负责让成员看懂组织；人员、岗位、任职和人才数据的真实管理进入人才之家，避免重复维护。"}] }),

  "company-philosophy": Object.freeze({ title:"理念与文化", eyebrow:"PHILOSOPHY & CULTURE", subtitle:"沉淀美和集团原创的核心信念、行动准则与长期传承，形成所有成员共同理解和持续践行的精神基础。", kind:"group", status:"已有内容" }),
  "company-spirit": Object.freeze({ title:"美和灵魂", eyebrow:"WHY", subtitle:"定义美和为什么存在、相信什么，以及无论业务和时代如何变化都希望长期坚持的核心信念。", kind:"article", status:"已有内容待接入", sections:[{title:"正式内容接入",text:"美和灵魂已有原创内容。本页先锁定长期阅读与出版版式，正式正文应从既有确认内容接入，不在系统开发阶段重新发明。"}] }),
  "company-principles": Object.freeze({ title:"美和准则", eyebrow:"HOW", subtitle:"明确美和人在经营、管理、工作和判断中共同遵循的原则与行动标准。", kind:"article", status:"已有内容待接入", sections:[{title:"已形成的建设原则",text:"方向比速度重要。原则比方法重要。先把业务讲清楚，再让系统与AI理解业务。先形成标准，再扩大自动化。系统负责放大正确的方法，而不是放大混乱。"}] }),
  "company-heritage": Object.freeze({ title:"美和传承", eyebrow:"LEGACY", subtitle:"沉淀并延续值得长期保留的理念、经验、方法、组织记忆和经营智慧。", kind:"article", status:"已有内容待接入", sections:[{title:"传承对象",text:"未来持续沉淀创业经验、重要决策、真实案例、方法论、企业历史、原创品牌资产以及值得下一代继续坚持的经营智慧。"}] }),

  "company-strategy": Object.freeze({ title:"经营与战略", eyebrow:"MANAGEMENT & STRATEGY", subtitle:"展示美和如何经营、如何形成闭环，以及长期准备去哪里。", kind:"group", status:"验证中" }),
  "company-management-architecture": Object.freeze({ title:"美和原创AI经营架构", eyebrow:"MIWA ORIGINAL AI MANAGEMENT ARCHITECTURE", subtitle:"以真实经营为基础，连接经营目标、业务流程、数据规则、人、AI与管理决策的美和原创经营体系。", kind:"architecture", status:"验证中" }),
  "company-development-strategy": Object.freeze({ title:"发展战略", eyebrow:"DEVELOPMENT STRATEGY", subtitle:"承载经过正式确认的集团战略方向，不使用演示目标替代真实经营判断。", kind:"article", status:"待完善", sections:[{title:"当前原则",text:"先用AIONE跑通真实业务，再总结可复制的方法；先形成证据，再形成标准。"}] }),
  "company-development-plan": Object.freeze({ title:"发展规划", eyebrow:"3Y · 5Y · 10Y", subtitle:"承载美和集团3年、5年、10年发展规划，并以正式确认内容持续更新。", kind:"roadmap", status:"待确认" }),

  "company-global": Object.freeze({ title:"事业与全球", eyebrow:"BUSINESS & GLOBAL", subtitle:"展示美和集团在哪里经营、有哪些事业，以及未来如何形成跨区域协同。", kind:"group", status:"验证中" }),
  "company-business-map": Object.freeze({ title:"事业版图", eyebrow:"BUSINESS PORTFOLIO", subtitle:"立足真实业务，逐步构建美和集团多事业协同发展的经营版图。", kind:"business-map", status:"验证中" }),
  "company-global-layout": Object.freeze({ title:"全球布局", eyebrow:"GLOBAL FOOTPRINT", subtitle:"展示美和在不同国家、地区与供应链网络中的真实业务布局。", kind:"article", status:"待完善", sections:[{title:"当前已确认范围",text:"现阶段具有日本经营与中国供应链/进出口关系。其他国家和地区只在真实业务发生并确认后进入正式版图。"}] }),
  "company-locations": Object.freeze({ title:"公司与据点", eyebrow:"COMPANIES & LOCATIONS", subtitle:"统一展示公司主体、办公室、仓库和业务据点，并保持事实与版本可追溯。", kind:"facts", status:"待补充" }),

  "company-governance": Object.freeze({ title:"组织与治理", eyebrow:"GOVERNANCE", subtitle:"说明谁负责、如何治理，以及关键经营责任如何被长期承接。", kind:"group", status:"待完善" }),
  "company-governance-structure": Object.freeze({ title:"治理架构", eyebrow:"GOVERNANCE STRUCTURE", subtitle:"说明公司治理、经营层与事业责任之间的结构和边界。", kind:"article", status:"待完善" }),
  "company-leadership": Object.freeze({ title:"经营团队", eyebrow:"LEADERSHIP", subtitle:"展示经正式确认的关键经营角色、责任与组织关系。", kind:"article", status:"待补充" }),
  "company-compliance": Object.freeze({ title:"合规原则", eyebrow:"COMPLIANCE", subtitle:"说明法律、财务、信息安全、客户信息与商业伦理等集团级基本原则。", kind:"article", status:"待完善", sections:[{title:"职责边界",text:"美和之家说明原则与结构；具体制度、SOP和执行细则进入知识之家统一维护。"}] }),

  "company-brand-value": Object.freeze({ title:"品牌与价值", eyebrow:"BRAND & VALUE", subtitle:"展示美和企业识别、品牌体系与长期希望向员工、客户和社会传递的价值。", kind:"group", status:"验证中" }),
  "company-brand-system": Object.freeze({ title:"品牌体系", eyebrow:"BRAND SYSTEM", subtitle:"统一说明美和企业品牌、事业品牌与商品品牌之间的关系。", kind:"brands", status:"验证中" }),
  "company-image": Object.freeze({ title:"企业形象", eyebrow:"CORPORATE IDENTITY", subtitle:"管理美和企业视觉识别与创始人原创品牌资产，并明确正式、衍生与历史标识身份。", kind:"identity", status:"验证中" }),
  "company-responsibility": Object.freeze({ title:"社会责任", eyebrow:"RESPONSIBILITY", subtitle:"逐步沉淀美和对客户、员工、供应链、环境与社会的真实责任实践。", kind:"article", status:"待建设" }),

  "company-development": Object.freeze({ title:"发展与动态", eyebrow:"HISTORY & UPDATES", subtitle:"记录美和怎么走到今天，以及当前真正重要的集团级变化。", kind:"group", status:"验证中" }),
  "company-history": Object.freeze({ title:"发展历程", eyebrow:"MIWA HISTORY", subtitle:"按真实事实记录美和集团持续发展的历史，并形成长期可追溯的组织记忆。", kind:"history", status:"待完善" }),
  "company-milestones": Object.freeze({ title:"重要里程碑", eyebrow:"MILESTONES", subtitle:"只记录真正改变美和发展方向、组织能力或经营方式的重要节点。", kind:"history", status:"验证中" }),
  "company-news": Object.freeze({ title:"集团动态", eyebrow:"GROUP UPDATES", subtitle:"展示当前真正重要的集团级变化，不替代通知中心和工作之家。", kind:"article", status:"待建设" }),

  "company-assets": Object.freeze({ title:"企业资料", eyebrow:"CORPORATE ASSETS", subtitle:"统一管理美和集团正式资料、版本、权限、来源与对外可用范围。", kind:"assets", status:"验证中" }),
  "company-documents": Object.freeze({ title:"公司资料", eyebrow:"COMPANY DOCUMENTS", subtitle:"公司简介、会社概要及其他公司级正式资料统一入口。", kind:"assets", assetScope:"company", status:"待接入" }),
  "company-core-assets": Object.freeze({ title:"集团核心资料", eyebrow:"CORE GROUP ASSETS", subtitle:"集团核心经营、组织、AI、战略与方法资料的统一入口。", kind:"assets", assetScope:"core", status:"待接入" }),
  "company-brand-guidelines": Object.freeze({ title:"品牌规范", eyebrow:"BRAND GUIDELINES", subtitle:"统一管理Logo、企业配色、事业标识、使用规范与历史品牌资产。", kind:"assets", assetScope:"brand", status:"验证中" }),
  "company-public-assets": Object.freeze({ title:"公开资料", eyebrow:"PUBLIC ASSETS", subtitle:"只展示经过确认允许对外使用、下载和引用的集团资料。", kind:"assets", assetScope:"public", status:"待接入" }),

  "company-external": Object.freeze({ title:"外部连接", eyebrow:"EXTERNAL", subtitle:"连接美和集团对外官网及未来正式公开渠道。", kind:"group", status:"待确认" }),
  "company-website": Object.freeze({ title:"美和集团官网", eyebrow:"OFFICIAL WEBSITE", subtitle:"未来美和集团面向客户、合作伙伴、人才与社会公众的正式对外入口。", kind:"external", status:"待确认" })
});

export const MIWA_GROUP_CORE_ASSETS = Object.freeze([
  { id:"army-architecture", title:"美和集团现代企业军团架构总纲", type:"PPTX", version:"V0.1", visibility:"内部", status:"文件待接入", scope:"core" },
  { id:"army-overview", title:"美和集团现代企业军团总纲", type:"DOCX", version:"V0.1", visibility:"内部", status:"文件待接入", scope:"core" },
  { id:"army-staffing", title:"美和集团现代企业军团编制总表", type:"XLSX", version:"V0.1", visibility:"内部", status:"文件待接入", scope:"core" },
  { id:"command-map", title:"美和集团现代企业军团作战指挥关系图", type:"PDF", version:"V0.1", visibility:"内部", status:"文件待接入", scope:"core" },
  { id:"supplies-strategy", title:"美和集团军需与战略粮草体系", type:"DOCX", version:"V0.1", visibility:"内部", status:"文件待接入", scope:"core" },
  { id:"battle-loop", title:"美和集团现代企业军团标准作战流程与经营闭环", type:"PDF", version:"V0.1", visibility:"内部", status:"文件待接入", scope:"core" },
  { id:"ai-talent-army", title:"美和集团AI人才军团体系", type:"DOCX", version:"V0.1", visibility:"内部", status:"文件待接入", scope:"core" },
  { id:"intel-decision", title:"美和集团情报与决策体系", type:"DOCX", version:"V0.1", visibility:"内部", status:"文件待接入", scope:"core" },
  { id:"company-logo", title:"美和公司正式Logo", type:"IMAGE", version:"当前", visibility:"内外通用", status:"正式", scope:"brand", url:"./assets/brand/miwa-company-logo-preview.png" }
]);

export function getMiwaCompanyPage(routeId) {
  return MIWA_COMPANY_PAGES[routeId] || MIWA_COMPANY_PAGES.company;
}

export function getMiwaCompanyGroupForRoute(routeId) {
  return MIWA_COMPANY_NAVIGATION.find((entry) => entry.route === routeId || entry.children?.some((childEntry) => childEntry.route === routeId)) || null;
}
