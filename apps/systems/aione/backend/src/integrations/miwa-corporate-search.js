/*
 * MIWA Corporate Search Registry | Backend V1.9.27
 *
 * Deterministic retrieval layer for 美和AI.
 * The model never decides which Drive file is "latest" by itself.
 * AIONE registry resolves identity, current version, status, route and delivery path first.
 */
import { listMiwaDriveAssets } from "./miwa-drive-assets.js";

const CORE_SOURCE_LABEL = "美和之家 → 企业资料 → 集团核心资料";
const CONTENT_SOURCE_LABEL = "美和之家 → 理念与文化";
const STRATEGY_SOURCE_LABEL = "美和之家 → 经营与战略";

const CORE_METADATA = Object.freeze({
  "army-architecture": Object.freeze({
    title:"美和集团现代企业军团总架构", type:"PPTX", version:"V0.1", recordStatus:"构想/验证中",
    summary:"美和集团现代企业军团的总架构，覆盖最高统帅、指挥军、作战军、建设军、保障军与事业前线。",
    route:"company-management-architecture",
    aliases:["美和集团总架构","集团总架构","现代企业军团总架构","总架构","军团总架构"]
  }),
  "army-overview": Object.freeze({
    title:"美和集团现代企业军团总纲", type:"DOCX", version:"V0.1", recordStatus:"构想/验证中",
    summary:"现代企业军团总体说明与核心原则。", route:"company-management-architecture",
    aliases:["军团总纲","集团总纲","现代企业军团总纲"]
  }),
  "army-staffing": Object.freeze({
    title:"美和集团现代企业军团编制总表", type:"XLSX", version:"V0.1", recordStatus:"构想/验证中",
    summary:"现代企业军团编制与结构总表。", route:"company-management-architecture",
    aliases:["军团编制","编制总表","军团编制总表"]
  }),
  "command-map": Object.freeze({
    title:"美和集团现代企业军团作战指挥关系图", type:"PDF", version:"V0.1", recordStatus:"构想/验证中",
    summary:"最高统帅、指挥军、作战军、建设军、保障军与事业前线之间的指挥和协同关系。",
    route:"company-management-architecture",
    aliases:["作战指挥关系图","指挥关系图","作战指挥图","军团指挥关系"]
  }),
  "supplies-strategy": Object.freeze({
    title:"美和集团军需与战略粮草体系", type:"DOCX", version:"V0.1", recordStatus:"构想/验证中",
    summary:"把资金、商品、数字资源、数据和人才统一视为可持续经营资源。", route:"company-management-architecture",
    aliases:["军需体系","战略粮草","粮草体系","军需与战略粮草"]
  }),
  "battle-loop": Object.freeze({
    title:"美和集团现代企业军团标准作战流程与经营闭环", type:"PDF", version:"V0.1", recordStatus:"构想/验证中",
    summary:"战略→情报→参谋→粮草→准备→市场→执行→记录→复盘→再决策的十步经营闭环。",
    route:"company-management-architecture",
    aliases:["经营闭环","作战流程","标准作战流程","十步经营闭环","经营闭环PDF"]
  }),
  "ai-talent-army": Object.freeze({
    title:"美和集团AI人才军团体系", type:"DOCX", version:"V0.1", recordStatus:"构想/验证中",
    summary:"AI人才以稳定责任域定义身份，以真实工作形成能力和流程覆盖级。", route:"company-management-architecture",
    aliases:["AI人才军团体系","AI人才体系","AI军团","人工智能人才军团"]
  }),
  "intel-decision": Object.freeze({
    title:"美和集团情报与决策体系", type:"DOCX", version:"V0.1", recordStatus:"构想/验证中",
    summary:"把内部事实、正式资料、外部公开情报与一线反馈转化为经营情报与决策支持。",
    route:"company-management-architecture",
    aliases:["情报与决策体系","情报决策","决策体系"]
  }),
  "market-battle": Object.freeze({
    title:"美和集团宣传与市场作战体系", type:"DOCX", version:"V0.1", recordStatus:"构想/验证中",
    summary:"区分品牌宣传与市场作战，并把需求转化为商机、成交和长期客户价值。",
    route:"company-brand-system",
    aliases:["宣传体系","市场作战体系","宣传与市场作战"]
  }),
  "digital-logistics": Object.freeze({
    title:"美和集团数字后勤与基础设施体系", type:"DOCX", version:"V0.1", recordStatus:"构想/验证中",
    summary:"以Google Drive、GitHub、Google Cloud等形成资料、代码、数据、运行、安全、备份与恢复的数字底座。",
    route:"company-management-architecture",
    aliases:["数字后勤","基础设施体系","数字基础设施","数字后勤与基础设施"]
  })
});

const PAGE_RECORDS = Object.freeze([
  Object.freeze({ id:"page:company-spirit", kind:"page", title:"美和灵魂", route:"company-spirit", version:"V1.9.28", recordStatus:"验证中", visibility:"internal", current:true, sourceLabel:CONTENT_SOURCE_LABEL, summary:"定义美和为什么存在、相信什么，以及长期坚持的核心信念。", aliases:["美和灵魂","灵魂","核心信念"] }),
  Object.freeze({ id:"page:company-principles", kind:"page", title:"美和准则", route:"company-principles", version:"V1.9.28", recordStatus:"验证中", visibility:"internal", current:true, sourceLabel:CONTENT_SOURCE_LABEL, summary:"明确美和在经营、管理、工作和判断中共同遵循的原则与行动标准。", aliases:["美和准则","准则","行动准则"] }),
  Object.freeze({ id:"page:company-heritage", kind:"page", title:"美和传承", route:"company-heritage", version:"V1.9.28", recordStatus:"验证中", visibility:"internal", current:true, sourceLabel:CONTENT_SOURCE_LABEL, summary:"沉淀并延续值得长期保留的理念、经验、方法、组织记忆和经营智慧。", aliases:["美和传承","传承","组织记忆"] }),
  Object.freeze({ id:"page:company-management-architecture", kind:"page", title:"美和原创AI经营架构", route:"company-management-architecture", version:"V1.9.28", recordStatus:"验证中", visibility:"internal", current:true, sourceLabel:STRATEGY_SOURCE_LABEL, summary:"连接经营目标、业务流程、数据规则、人、AI与管理决策的美和原创经营体系。", aliases:["经营架构","AI经营架构","美和经营架构","433","四化三基石三属性"] }),
  Object.freeze({ id:"page:company-core-assets", kind:"page", title:"集团核心资料", route:"company-core-assets", version:"V1.9.28", recordStatus:"已接入", visibility:"internal", current:true, sourceLabel:"美和之家 → 企业资料", summary:"集团核心经营、组织、AI、战略与方法资料的统一入口。", aliases:["集团核心资料","核心资料","企业资料"] })
]);

function driveViewUrl(fileId) {
  return `https://drive.google.com/open?id=${encodeURIComponent(fileId)}`;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\u3000]+/g, "")
    .replace(/[，。！？、,.!?;；:：()（）\[\]【】「」『』'"“”‘’_-]+/g, "");
}

function visibleToActor(item, requestContext = {}) {
  if (item.visibility === "public" || item.visibility === "both") return true;
  return Boolean(requestContext.personId);
}

function typeFromMime(mimeType = "") {
  const value = String(mimeType || "").toLowerCase();
  if (value.includes("presentation")) return "PPTX";
  if (value.includes("wordprocessing")) return "DOCX";
  if (value.includes("spreadsheet")) return "XLSX";
  if (value.includes("pdf")) return "PDF";
  return "FILE";
}

export function listMiwaCorporateRecords(requestContext = {}) {
  const driveById = new Map(listMiwaDriveAssets().map((item) => [item.assetId, item]));
  const assets = Object.entries(CORE_METADATA).map(([assetId, meta]) => {
    const drive = driveById.get(assetId);
    if (!drive) return null;
    return Object.freeze({
      id:`asset:${assetId}`,
      assetId,
      kind:"asset",
      title:meta.title,
      summary:meta.summary,
      type:meta.type || typeFromMime(drive.mimeType),
      mimeType:drive.mimeType,
      version:meta.version,
      recordStatus:meta.recordStatus,
      visibility:drive.visibility === "internal" ? "internal" : drive.visibility,
      current:Boolean(drive.current),
      route:meta.route || "company-core-assets",
      sourceLabel:CORE_SOURCE_LABEL,
      sourceName:drive.fileName,
      sourceUrl:driveViewUrl(drive.fileId),
      downloadPath:`/api/v1/drive-assets/${encodeURIComponent(assetId)}/download`,
      downloadable:Boolean(drive.downloadable),
      aliases:meta.aliases || []
    });
  }).filter(Boolean);
  return [...PAGE_RECORDS, ...assets].filter((item) => visibleToActor(item, requestContext));
}

function scoreRecord(record, rawQuery) {
  const query = normalize(rawQuery);
  if (!query) return 0;
  const title = normalize(record.title);
  const summary = normalize(record.summary);
  const sourceName = normalize(record.sourceName);
  const aliases = (record.aliases || []).map(normalize);
  const queryCore = query.replace(/(请|帮我|把|一下|最新|当前|正式|给我|发我|打开|查看|下载|查找|搜索|找|关于|有哪些|相关|资料|文件|内容|文档|哪里|在哪|所有|全部|的)/g, "");
  let score = 0;
  if (title === query) score += 120;
  if (title && query.includes(title)) score += 90;
  if (query && title.includes(query)) score += 80;
  if (queryCore.length >= 2 && title.includes(queryCore)) score += 88;
  for (const alias of aliases) {
    if (!alias) continue;
    if (alias === query) score += 110;
    else if (query.includes(alias)) score += 85;
    else if (alias.includes(query)) score += 65;
    if (queryCore.length >= 2 && alias.includes(queryCore)) score += 82;
  }
  if (sourceName && query.includes(sourceName.replace(/v\d+[._-]?\d*/g, ""))) score += 50;

  const tokens = String(rawQuery || "")
    .normalize("NFKC")
    .split(/[\s，。！？、,.!?;；:：()（）\[\]【】「」『』'"“”‘’_\/-]+/)
    .map(normalize)
    .filter((token) => token.length >= 2 && !["最新","当前","正式","资料","文件","原件","给我","一下","打开","查看","下载","哪里","在哪","有哪些","所有","全部"].includes(token));
  for (const token of tokens) {
    if (title.includes(token)) score += 24;
    if (aliases.some((alias) => alias.includes(token))) score += 20;
    if (summary.includes(token)) score += 7;
    if (sourceName.includes(token)) score += 8;
  }
  if (record.current) score += 8;
  return score;
}

export function searchMiwaCorporateRecords(query, options = {}) {
  const requestContext = options.requestContext || {};
  const kind = options.kind || "all";
  const type = String(options.type || "").trim().toUpperCase();
  const limit = Math.max(1, Math.min(Number(options.limit || 8), 20));
  return listMiwaCorporateRecords(requestContext)
    .filter((item) => kind === "all" || item.kind === kind)
    .filter((item) => !type || item.type === type)
    .map((item) => ({ item, score:scoreRecord(item, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || Number(b.item.current) - Number(a.item.current) || a.item.title.localeCompare(b.item.title, "zh-CN"))
    .slice(0, limit)
    .map(({ item, score }) => ({ ...item, score }));
}

const SPECIFIC_TERMS = [
  "集团总架构","现代企业军团","军团总纲","编制总表","指挥关系图","战略粮草","经营闭环","ai人才","情报与决策","市场作战","数字后勤",
  "美和灵魂","美和准则","美和传承","经营架构","集团核心资料"
];
const GENERAL_ASSET_WORD = /(资料|文件|原件|文档|pdf|pptx?|docx?|xlsx?|表格|报告)/i;
const GENERAL_ACTION_WORD = /(找|搜索|查|打开|查看|下载|给我|发我|在哪里|在哪|有哪些|列出|全部|所有|最新)/i;

export function resolveMiwaCorporateIntent(objective = "") {
  const text = String(objective || "").normalize("NFKC");
  const normalized = normalize(text);
  const hasSpecific = SPECIFIC_TERMS.some((term) => normalized.includes(normalize(term)));
  const hasAction = GENERAL_ACTION_WORD.test(text);
  const hasGeneral = GENERAL_ASSET_WORD.test(text) && hasAction;
  const relatedQuery = /(相关|关于).{0,24}(资料|文件|内容|文档)|有什么.{0,12}(资料|文件|内容)/i.test(text);
  // Mentioning a corporate concept is not enough: only explicit find/open/download/list/latest requests
  // or an explicit "what related documents" request are intercepted deterministically.
  // "经营架构有什么可以优化" remains normal model analysis.
  if (!(hasSpecific && hasAction) && !hasGeneral && !relatedQuery) return null;

  const requestedAction = /下载/.test(text) ? "download" : /(打开|查看原件)/.test(text) ? "open" : /(有哪些|列出|全部|所有)/.test(text) ? "list" : "search";
  const resultMode = requestedAction === "list" ? "list" : relatedQuery ? "related" : "single";
  const kind = /美和灵魂|美和准则|美和传承/.test(text) ? "all" : /集团核心资料/.test(text) && requestedAction === "list" ? "asset" : "all";
  const type = /pdf/i.test(text) ? "PDF" : /pptx?|幻灯|演示/i.test(text) ? "PPTX" : /docx?|word/i.test(text) ? "DOCX" : /xlsx?|excel|表格/i.test(text) ? "XLSX" : "";
  return Object.freeze({ requestedAction, resultMode, kind, type, query:text, currentOnly:/最新|当前|正式/.test(text) });
}

function publicRecord(record) {
  const { aliases, score, ...rest } = record;
  return rest;
}

export function executeMiwaCorporateRetrieval(objective, requestContext = {}) {
  const intent = resolveMiwaCorporateIntent(objective);
  if (!intent) return null;

  let items;
  if (intent.requestedAction === "list" && /集团核心资料|核心资料/.test(intent.query)) {
    items = listMiwaCorporateRecords(requestContext)
      .filter((item) => item.kind === "asset")
      .filter((item) => !intent.type || item.type === intent.type)
      .filter((item) => !intent.currentOnly || item.current)
      .slice(0, 20)
      .map(publicRecord);
  } else {
    const candidateLimit = intent.resultMode === "related" ? 5 : 8;
    const candidates = searchMiwaCorporateRecords(intent.query, { requestContext, kind:intent.kind, type:intent.type, limit:candidateLimit })
      .filter((item) => !intent.currentOnly || item.current);
    items = (intent.resultMode === "single" ? candidates.slice(0, 1) : candidates.slice(0, 5)).map(publicRecord);
  }

  const first = items[0] || null;
  let answer;
  if (!items.length) {
    answer = "没有在当前有权限的美和正式内容索引中找到匹配资料。请换一个资料名称或关键词；我不会从不确定的文件中自行猜测。";
  } else if (intent.requestedAction === "list") {
    answer = `已找到 ${items.length} 项当前可访问的美和集团核心资料。资料卡已按AIONE正式索引返回；版本、状态和原件入口以卡片为准。`;
  } else if (intent.resultMode === "related") {
    answer = `已找到 ${items.length} 项与当前问题最相关的美和集团资料，并按相关度与当前版本状态排序。`;
  } else {
    answer = [
      "已找到当前索引中最匹配的资料：",
      `**《${first.title}》**`,
      `${first.type || "内容页"}｜${first.version || "当前"}｜${first.recordStatus || "状态待确认"}`,
      `来源：${first.sourceLabel || "美和之家"}`,
      first.current ? "这是当前索引中的有效版本。" : "该记录不是当前版本，请谨慎使用。"
    ].join("\n");
  }

  return Object.freeze({ intent, items, answer });
}
