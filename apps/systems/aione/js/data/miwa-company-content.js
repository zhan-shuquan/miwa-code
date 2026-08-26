/* ========================================
   MIWA Company Content｜美和之家正式内容索引 V1.9.25
   目标：目录稳定、真实内容优先、来源可追溯；页面、PDF、美和AI未来共用同一内容定义。
======================================== */

import { getMiwaDriveAssetBinding } from "./miwa-google-drive-registry.js";

const child = (id, label, route, subtitle, options = {}) => Object.freeze({
  id, label, route, subtitle, icon: options.icon || "", status: options.status || "验证中"
});

const group = (id, label, route, icon, subtitle, children = []) => Object.freeze({
  id, label, route, icon, subtitle, children: Object.freeze(children)
});

const source = (title, version, date, status = "构想/验证中") => Object.freeze({ title, version, date, status });

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

const MODERN_CORPS_SOURCE = source("美和集团现代企业军团总架构", "V0.1", "2026-08-13");
const MODERN_CORPS_OVERVIEW_SOURCE = source("美和集团现代企业军团总纲", "V0.1", "2026-08-13");
const AI_TALENT_SOURCE = source("美和集团AI人才军团体系", "V0.1", "2026-08-13");
const INTEL_SOURCE = source("美和集团情报与决策体系", "V0.1", "2026-08-13");
const DIGITAL_LOGISTICS_SOURCE = source("美和集团数字后勤与基础设施体系", "V0.1", "2026-08-13");

export const MIWA_COMPANY_PAGES = Object.freeze({
  company: Object.freeze({
    title:"美和概览", eyebrow:"MIWA GROUP", subtitle:MIWA_OVERVIEW_SUBTITLE, kind:"overview", status:"V1真实内容接入中"
  }),

  "company-introduction": Object.freeze({ title:"集团介绍", eyebrow:"WHO WE ARE", subtitle:"统一说明美和集团是谁、如何定位，以及公司与组织的基本事实。", kind:"group", status:"验证中" }),
  "company-positioning": Object.freeze({
    title:"集团定位", eyebrow:"GROUP POSITIONING", subtitle:"明确美和从真实经营出发、逐步形成多事业协同与AI原生经营体系的长期定位。", kind:"article", status:"已有真实内容",
    sections:[
      { title:"从真实经营出发", text:"美和从日本真实经营业务出发，持续积累商品、客户、供应商、渠道、供应链与组织能力，并以AIONE作为当前第一个真实业务实验场和一体化经营基础设施。" },
      { title:"多事业与集团化", text:"集团化、多事业化不是为了扩大组织复杂度，而是让经过真实业务验证的方法、数据、知识、AI能力和基础设施能够跨事业复用，降低重复建设与协同成本。" },
      { title:"AI时代的执行体系", text:"AI不是替代企业方向与最终责任，而是把分析、执行、生成、检查、协调和自动化能力组织成可验证、可复用、可调度的长期经营能力；重大经营责任仍由明确的人类负责人承担。" }
    ],
    sources:[MODERN_CORPS_OVERVIEW_SOURCE, AI_TALENT_SOURCE]
  }),
  "company-summary": Object.freeze({
    title:"集团简介", eyebrow:"GROUP PROFILE", subtitle:"用简洁、稳定、可对内外复用的方式快速认识美和。", kind:"article", status:"已有真实基础",
    sections:[
      { title:"当前业务基础", text:"美和当前具有日本电商、日本批发、中国供应链与进出口、自有品牌及东京本地经营等真实业务基础，并持续围绕商品、客户、供应商、渠道、履约与经营管理积累能力。" },
      { title:"正在建设的经营体系", text:"AIONE正在作为美和方法论第一个真实业务实验场，验证业务闭环、数据、规则、人和AI协同，以及自动化是否真正减少人工、提高质量并形成可复制方法。" }
    ]
  }),
  "company-profile": Object.freeze({ title:"会社概要", eyebrow:"COMPANY FACTS", subtitle:"统一管理公司名称、代表者、地址、成立时间、资本金、事业内容等事实型公司资料。", kind:"facts", status:"待补充事实" }),
  "company-organization": Object.freeze({
    title:"集团组织", eyebrow:"ORGANIZATION", subtitle:"帮助成员理解集团、公司、事业、组织与岗位之间的基本关系。", kind:"article", status:"已有原则",
    sections:[
      {title:"组织边界",text:"美和之家负责让成员看懂集团与事业的组织关系；人员、岗位、任职和人才数据的真实管理进入人才之家，避免重复维护。"},
      {title:"能力群与经营前线",text:"集团共享能力优先复用，不为每个事业机械复制一套总部；事业承担客户价值和经营结果，集团共享参谋、情报、工程、AI、军需、人才和安全等能力。"}
    ],
    sources:[MODERN_CORPS_OVERVIEW_SOURCE]
  }),

  "company-philosophy": Object.freeze({ title:"理念与文化", eyebrow:"PHILOSOPHY & CULTURE", subtitle:"沉淀美和集团原创的核心信念、行动准则与长期传承，形成所有成员共同理解和持续践行的精神基础。", kind:"group", status:"已有内容" }),
  "company-spirit": Object.freeze({
    title:"美和灵魂", eyebrow:"WHY", subtitle:"定义美和为什么存在、相信什么，以及无论业务和时代如何变化都希望长期坚持的核心信念。", kind:"article", status:"真实内容已接入",
    sections:[
      {title:"核心定义",text:"美和灵魂代表美和长期形成的内在价值取向、做事初心与精神内核。它不是营销口号，而是业务、组织、系统和AI不断变化时仍然用于判断方向的内在依据。"},
      {title:"经营中的体现",text:"重视真实业务、真实的人、长期价值、责任和持续改善。先把事实与业务讲清楚，再让系统和AI放大正确的方法，而不是用技术放大混乱。"},
      {title:"在AIONE中的实践",text:"AIONE以真实业务闭环作为验证基础：流程、数据、规则、AI和自动化最终都必须服务经营结果，并且留下可追溯证据，接受真实使用的持续检验。"}
    ]
  }),
  "company-principles": Object.freeze({
    title:"美和准则", eyebrow:"HOW", subtitle:"明确美和人在经营、管理、工作和判断中共同遵循的原则与行动标准。", kind:"article", status:"真实内容已接入",
    sections:[
      {title:"建设与经营标准",text:"真实、清晰、稳定、可验证、可维护、可扩展、可交接，是美和长期建设系统与经营方法的重要标准。"},
      {title:"长期做事原则",text:"方向比速度重要。原则比方法重要。先把业务讲清楚，再让系统与AI理解业务。先形成标准，再扩大自动化。系统负责放大正确的方法，而不是放大混乱。"},
      {title:"四化实践",text:"一体化、标准化、流程化、自动化，是把业务做清楚、做稳定并逐步提高执行效率的四项核心实践准则。能够由规则、函数或API稳定完成的工作，优先使用确定性自动化。"}
    ]
  }),
  "company-heritage": Object.freeze({
    title:"美和传承", eyebrow:"LEGACY", subtitle:"沉淀并延续值得长期保留的理念、经验、方法、组织记忆和经营智慧。", kind:"article", status:"真实内容已接入",
    sections:[
      {title:"传承什么",text:"创业经验、重要决策、真实案例、方法论、企业历史、原创品牌资产、正式知识、规则、数据、代码以及值得下一代继续坚持的经营智慧，都应逐步形成可追溯的长期资产。"},
      {title:"如何传承",text:"通过正式知识、规则、代码、数据、Skill、AI人才履历与正式文档形成可理解、可调用、可交接的资产，避免公司能力长期停留在个人经验、聊天记录或临时文件中。"},
      {title:"真实的早期资产",text:"美和公司及多个事业的原创视觉标识在生成式AI普及以前已经由创始人自主设计并形成体系。今天的任务不是重做历史，而是明确主标识、事业标识、衍生标识与历史标识的身份并长期保存。"}
    ]
  }),

  "company-strategy": Object.freeze({ title:"经营与战略", eyebrow:"MANAGEMENT & STRATEGY", subtitle:"展示美和如何经营、如何形成闭环，以及长期准备去哪里。", kind:"group", status:"已有核心内容" }),
  "company-management-architecture": Object.freeze({
    title:"美和原创AI经营架构", eyebrow:"MIWA ORIGINAL AI MANAGEMENT ARCHITECTURE", subtitle:"以真实经营为基础，连接经营目标、业务流程、数据规则、人、AI与管理决策的美和原创经营体系。", kind:"architecture", status:"真实内容已接入",
    sources:[MODERN_CORPS_SOURCE, MODERN_CORPS_OVERVIEW_SOURCE, INTEL_SOURCE, DIGITAL_LOGISTICS_SOURCE]
  }),
  "company-development-strategy": Object.freeze({
    title:"发展战略", eyebrow:"DEVELOPMENT STRATEGY", subtitle:"承载经过正式确认的集团战略方向，不使用演示目标替代真实经营判断。", kind:"article", status:"已有核心原则",
    sections:[
      {title:"先实战，再复制",text:"先用AIONE跑通真实业务，再总结可复制的方法；先形成证据，再形成标准。AIONE是美和方法论第一个真实业务实验场和系统建设验证项目。"},
      {title:"共享能力优先复用",text:"事业负责真实客户价值和经营结果；集团共享能力优先复用，不为每个事业机械重复建立参谋、工程、AI、情报和数字基础设施。"},
      {title:"AI时代的组织方向",text:"执行主体既有人也有AI。专业AI围绕稳定责任域纵向做深，跨专业AI负责横向统筹；先扩能力，后增人才，最终经营责任和重大授权仍由明确的人类负责人承担。"}
    ],
    sources:[MODERN_CORPS_OVERVIEW_SOURCE, AI_TALENT_SOURCE]
  }),
  "company-development-plan": Object.freeze({ title:"发展规划", eyebrow:"3Y · 5Y · 10Y", subtitle:"承载美和集团3年、5年、10年发展规划，并以正式确认内容持续更新。", kind:"roadmap", status:"正式目标待确认" }),

  "company-global": Object.freeze({ title:"事业与全球", eyebrow:"BUSINESS & GLOBAL", subtitle:"展示美和集团在哪里经营、有哪些事业，以及未来如何形成跨区域协同。", kind:"group", status:"已有真实基础" }),
  "company-business-map": Object.freeze({
    title:"事业版图", eyebrow:"BUSINESS PORTFOLIO", subtitle:"立足真实业务，逐步构建美和集团多事业协同发展的经营版图。", kind:"business-map", status:"真实内容已接入",
    sources:[MODERN_CORPS_SOURCE, MODERN_CORPS_OVERVIEW_SOURCE]
  }),
  "company-global-layout": Object.freeze({
    title:"全球布局", eyebrow:"GLOBAL FOOTPRINT", subtitle:"展示美和在不同国家、地区与供应链网络中的真实业务布局。", kind:"article", status:"已有真实基础",
    sections:[
      {title:"当前已确认范围",text:"现阶段具有日本经营与中国供应链、进出口关系。其他国家和地区只在真实业务发生并确认后进入正式版图。"},
      {title:"未来原则",text:"全球布局不是先画地图再填业务，而是以公司主体、真实客户、供应链、仓储、合作网络和经营结果作为证据逐步形成。"}
    ]
  }),
  "company-locations": Object.freeze({ title:"公司与据点", eyebrow:"COMPANIES & LOCATIONS", subtitle:"统一展示公司主体、办公室、仓库和业务据点，并保持事实与版本可追溯。", kind:"facts", status:"待补充事实" }),

  "company-governance": Object.freeze({ title:"组织与治理", eyebrow:"GOVERNANCE", subtitle:"说明谁负责、如何治理，以及关键经营责任如何被长期承接。", kind:"group", status:"已有原则" }),
  "company-governance-structure": Object.freeze({
    title:"治理架构", eyebrow:"GOVERNANCE STRUCTURE", subtitle:"说明公司治理、经营层与事业责任之间的结构和边界。", kind:"article", status:"已有原则",
    sections:[
      {title:"最终责任",text:"AI可以扩大判断和执行能力，但不能取代最高战略责任。集团级重大决策、关键规则、重大异常、风险判断和最终经营结果必须有明确的人类负责人。"},
      {title:"责任中心",text:"能力群、责任中心、事业前线和AI人才需要清楚区分。组织是否形成正式部门，应由真实工作量、责任边界和长期规模决定，而不是由页面或系统模块机械决定。"}
    ],
    sources:[MODERN_CORPS_OVERVIEW_SOURCE]
  }),
  "company-leadership": Object.freeze({ title:"经营团队", eyebrow:"LEADERSHIP", subtitle:"展示经正式确认的关键经营角色、责任与组织关系。", kind:"article", status:"待补充正式资料" }),
  "company-compliance": Object.freeze({
    title:"合规原则", eyebrow:"COMPLIANCE", subtitle:"说明法律、财务、信息安全、客户信息与商业伦理等集团级基本原则。", kind:"article", status:"已有原则",
    sections:[
      {title:"职责边界",text:"美和之家说明原则与结构；具体制度、SOP和执行细则进入知识之家统一维护。"},
      {title:"数字治理",text:"权限、备份、审计与人工接管机制从系统设计阶段进入；数据、资料和代码必须保持正式来源、权限边界和版本可追溯。"}
    ],
    sources:[DIGITAL_LOGISTICS_SOURCE]
  }),

  "company-brand-value": Object.freeze({ title:"品牌与价值", eyebrow:"BRAND & VALUE", subtitle:"展示美和企业识别、品牌体系与长期希望向员工、客户和社会传递的价值。", kind:"group", status:"已有真实资产" }),
  "company-brand-system": Object.freeze({ title:"品牌体系", eyebrow:"BRAND SYSTEM", subtitle:"统一说明美和企业品牌、事业品牌与商品品牌之间的关系。", kind:"brands", status:"已有真实资产" }),
  "company-image": Object.freeze({ title:"企业形象", eyebrow:"CORPORATE IDENTITY", subtitle:"管理美和企业视觉识别与创始人原创品牌资产，并明确正式、衍生与历史标识身份。", kind:"identity", status:"正式Logo已接入" }),
  "company-responsibility": Object.freeze({ title:"社会责任", eyebrow:"RESPONSIBILITY", subtitle:"逐步沉淀美和对客户、员工、供应链、环境与社会的真实责任实践。", kind:"article", status:"待建设" }),

  "company-development": Object.freeze({ title:"发展与动态", eyebrow:"HISTORY & UPDATES", subtitle:"记录美和怎么走到今天，以及当前真正重要的集团级变化。", kind:"group", status:"已有真实节点" }),
  "company-history": Object.freeze({ title:"发展历程", eyebrow:"MIWA HISTORY", subtitle:"按真实事实记录美和集团持续发展的历史，并形成长期可追溯的组织记忆。", kind:"history", status:"真实节点已接入" }),
  "company-milestones": Object.freeze({ title:"重要里程碑", eyebrow:"MILESTONES", subtitle:"只记录真正改变美和发展方向、组织能力或经营方式的重要节点。", kind:"history", status:"真实节点已接入" }),
  "company-news": Object.freeze({
    title:"集团动态", eyebrow:"GROUP UPDATES", subtitle:"展示当前真正重要的集团级变化，不替代通知中心和工作之家。", kind:"article", status:"真实内容已接入",
    sections:[
      {title:"当前阶段",text:"AIONE正在从系统建设驱动阶段转向真实经营驱动阶段。2026年9月起优先让全员进入真实业务使用，业务、逻辑、结构与体验优化优先于视觉微调。"},
      {title:"当前建设重点",text:"先完成核心Header二级空间的基础内容和真实路由，再由员工真实使用推动系统迭代；美和之家作为首个内容型空间母版已经进入真实内容接入阶段。"}
    ]
  }),

  "company-assets": Object.freeze({ title:"企业资料", eyebrow:"CORPORATE ASSETS", subtitle:"统一管理美和集团正式资料、版本、权限、来源与对外可用范围。", kind:"assets", status:"真实资料索引与Google Drive原件已接入" }),
  "company-documents": Object.freeze({ title:"公司资料", eyebrow:"COMPANY DOCUMENTS", subtitle:"公司简介、会社概要及其他公司级正式资料统一入口。", kind:"assets", assetScope:"company", status:"原件待逐步绑定" }),
  "company-core-assets": Object.freeze({ title:"集团核心资料", eyebrow:"CORE GROUP ASSETS", subtitle:"集团核心经营、组织、AI、战略与方法资料的统一入口。", kind:"assets", assetScope:"core", status:"Google Drive原件已绑定" }),
  "company-brand-guidelines": Object.freeze({ title:"品牌规范", eyebrow:"BRAND GUIDELINES", subtitle:"统一管理Logo、企业配色、事业标识、使用规范与历史品牌资产。", kind:"assets", assetScope:"brand", status:"正式Logo已接入" }),
  "company-public-assets": Object.freeze({ title:"公开资料", eyebrow:"PUBLIC ASSETS", subtitle:"只展示经过确认允许对外使用、下载和引用的集团资料。", kind:"assets", assetScope:"public", status:"待确认公开范围" }),

  "company-external": Object.freeze({ title:"外部连接", eyebrow:"EXTERNAL", subtitle:"连接美和集团对外官网及未来正式公开渠道。", kind:"group", status:"待确认" }),
  "company-website": Object.freeze({ title:"美和集团官网", eyebrow:"OFFICIAL WEBSITE", subtitle:"未来美和集团面向客户、合作伙伴、人才与社会公众的正式对外入口。", kind:"external", status:"待确认" })
});

const driveAssetFields = (assetId) => {
  const binding = getMiwaDriveAssetBinding(assetId);
  if (!binding) return {};
  return {
    storage:binding.storage,
    provider:binding.provider,
    driveFileId:binding.fileId,
    driveFolderId:binding.folderId,
    driveFolderName:binding.folderName,
    url:binding.viewUrl,
    downloadPath:binding.downloadPath,
    boundAt:binding.boundAt
  };
};

export const MIWA_GROUP_CORE_ASSETS = Object.freeze([
  {
    id:"army-architecture", title:"美和集团现代企业军团总架构", type:"PPTX", version:"V0.1", visibility:"内部",
    status:"资料已确认 · Google Drive原件已绑定", recordStatus:"构想/验证中", sourceDate:"2026-08-13", scope:"core",
    fileName:"00_美和集团现代企业军团总架构_V0.1.pptx",
    ...driveAssetFields("army-architecture"),
    summary:"AI时代企业执行与作战指挥总架构：最高统帅、四大军种、情报与粮草、AI人才、数字后勤、事业军团和标准作战闭环。",
    contentRoute:"company-management-architecture"
  },
  {
    id:"army-overview", title:"美和集团现代企业军团总纲", type:"DOCX", version:"V0.1", visibility:"内部",
    status:"资料已确认 · Google Drive原件已绑定", recordStatus:"构想/验证中", sourceDate:"2026-08-13", scope:"core",
    fileName:"01_美和集团现代企业军团总纲_V0.1.docx",
    ...driveAssetFields("army-overview"),
    summary:"集团级执行体系总纲，明确最高责任、四条底层作战原则、四大军种、数字后勤、AI人才和组织编制原则。",
    contentRoute:"company-management-architecture"
  },
  {
    id:"army-staffing", title:"美和集团现代企业军团编制总表", type:"XLSX", version:"V0.1", visibility:"内部",
    status:"资料已确认 · Google Drive原件已绑定", recordStatus:"构想/验证中", sourceDate:"2026-08-13", scope:"core",
    fileName:"02_美和集团现代企业军团编制总表_V0.1.xlsx",
    ...driveAssetFields("army-staffing"),
    summary:"现代企业军团责任域、组织编制和能力配置的结构化总表。",
    contentRoute:"company-organization"
  },
  {
    id:"command-map", title:"美和集团现代企业军团作战指挥关系图", type:"PDF", version:"V0.1", visibility:"内部",
    status:"资料已确认 · Google Drive原件已绑定", recordStatus:"构想/验证中", sourceDate:"2026-08-13", scope:"core",
    fileName:"03_美和集团现代企业军团作战指挥关系图_V0.1.pdf",
    ...driveAssetFields("command-map"),
    summary:"一页看清最高统帅、指挥军、作战军、建设军、保障军与事业前线之间的指挥和协同关系。",
    contentRoute:"company-management-architecture"
  },
  {
    id:"supplies-strategy", title:"美和集团军需与战略粮草体系", type:"DOCX", version:"V0.1", visibility:"内部",
    status:"资料已确认 · Google Drive原件已绑定", recordStatus:"构想/验证中", sourceDate:"2026-08-13", scope:"core",
    fileName:"04_美和集团军需与战略粮草体系_V0.1.docx",
    ...driveAssetFields("supplies-strategy"),
    summary:"把资金、商品、数字资源、数据和人才统一视为可持续经营资源，强调行动前先确认可持续保障能力。"
  },
  {
    id:"battle-loop", title:"美和集团现代企业军团标准作战流程与经营闭环", type:"PDF", version:"V0.1", visibility:"内部",
    status:"资料已确认 · Google Drive原件已绑定", recordStatus:"构想/验证中", sourceDate:"2026-08-13", scope:"core",
    fileName:"05_美和集团现代企业军团标准作战流程与经营闭环_V0.1.pdf",
    ...driveAssetFields("battle-loop"),
    summary:"战略→情报→参谋→粮草→准备→市场→执行→记录→复盘→再决策的十步经营闭环。",
    contentRoute:"company-management-architecture"
  },
  {
    id:"ai-talent-army", title:"美和集团AI人才军团体系", type:"DOCX", version:"V0.1", visibility:"内部",
    status:"资料已确认 · Google Drive原件已绑定", recordStatus:"构想/验证中", sourceDate:"2026-08-13", scope:"core",
    fileName:"06_美和集团AI人才军团体系_V0.1.docx",
    ...driveAssetFields("ai-talent-army"),
    summary:"AI人才以稳定责任域定义身份，以真实工作形成能力和流程覆盖级；可派驻、可验证、可追责，最终经营责任由人承担。"
  },
  {
    id:"intel-decision", title:"美和集团情报与决策体系", type:"DOCX", version:"V0.1", visibility:"内部",
    status:"资料已确认 · Google Drive原件已绑定", recordStatus:"构想/验证中", sourceDate:"2026-08-13", scope:"core",
    fileName:"07_美和集团情报与决策体系_V0.1.docx",
    ...driveAssetFields("intel-decision"),
    summary:"把内部事实、正式资料、外部公开情报与一线反馈转化为可验证、可解释、可行动的经营情报与决策支持。",
    contentRoute:"company-management-architecture"
  },
  {
    id:"market-battle", title:"美和集团宣传与市场作战体系", type:"DOCX", version:"V0.1", visibility:"内部",
    status:"资料已确认 · Google Drive原件已绑定", recordStatus:"构想/验证中", sourceDate:"2026-08-13", scope:"core",
    fileName:"08_美和集团宣传与市场作战体系_V0.1.docx",
    ...driveAssetFields("market-battle"),
    summary:"区分品牌宣传与市场作战：宣传建立认知和信任，市场作战把需求转化为商机、成交和长期客户价值。",
    contentRoute:"company-brand-system"
  },
  {
    id:"digital-logistics", title:"美和集团数字后勤与基础设施体系", type:"DOCX", version:"V0.1", visibility:"内部",
    status:"资料已确认 · Google Drive原件已绑定", recordStatus:"构想/验证中", sourceDate:"2026-08-13", scope:"core",
    fileName:"09_美和集团数字后勤与基础设施体系_V0.1.docx",
    ...driveAssetFields("digital-logistics"),
    summary:"以Google Drive、GitHub、Google Cloud等形成资料、代码、数据、运行、安全、备份与恢复的数字底座。",
    contentRoute:"company-management-architecture"
  },
  {
    id:"company-logo", title:"美和公司正式Logo", type:"IMAGE", version:"当前", visibility:"内外通用",
    status:"正式", recordStatus:"正式", sourceDate:"早期原创", scope:"brand",
    fileName:"miwa-company-logo-preview.png",
    summary:"由创始人在生成式AI普及以前自主设计的美和公司核心视觉识别资产。当前使用白底正式版本，保持结构、比例与红绿关系不变。",
    url:"./assets/brand/miwa-company-logo-preview.png",
    contentRoute:"company-image"
  }
]);

export function getMiwaCompanyPage(routeId) {
  return MIWA_COMPANY_PAGES[routeId] || MIWA_COMPANY_PAGES.company;
}

export function getMiwaCompanyGroupForRoute(routeId) {
  return MIWA_COMPANY_NAVIGATION.find((entry) => entry.route === routeId || entry.children?.some((childEntry) => childEntry.route === routeId)) || null;
}

export function getMiwaCompanySearchRecords() {
  const pageRecords = Object.entries(MIWA_COMPANY_PAGES).map(([route, page]) => Object.freeze({
    id:`page:${route}`, kind:"page", route, title:page.title, subtitle:page.subtitle || "", status:page.status || "验证中",
    visibility:"内部", version:"V1.9.26", current:true,
    text:[page.title, page.subtitle, ...(page.sections || []).flatMap((section) => [section.title, section.text])].filter(Boolean).join(" ")
  }));
  const assetRecords = MIWA_GROUP_CORE_ASSETS.map((asset) => Object.freeze({
    id:`asset:${asset.id}`, kind:"asset", route:asset.contentRoute || "", title:asset.title, subtitle:asset.summary || "",
    status:asset.status, visibility:asset.visibility, version:asset.version, current:true,
    sourceId:asset.driveFileId || asset.id, sourceType:asset.storage || "aione", sourceUrl:asset.url || "", downloadPath:asset.downloadPath || "",
    sourceFolderId:asset.driveFolderId || "", sourceName:asset.fileName || asset.title,
    text:[asset.title, asset.summary, asset.fileName, asset.type, asset.recordStatus, asset.provider, asset.driveFolderName].filter(Boolean).join(" ")
  }));
  return Object.freeze([...pageRecords, ...assetRecords]);
}
