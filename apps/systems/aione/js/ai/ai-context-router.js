/* ========================================
   AIONE AI Context Router V1.1
   One 美和AI entry, context-matched business capabilities.
   Product Home centers resolve to 商品之家AI秘书 contexts.
======================================== */
import { getRouteDefinition, getRouteId, ROUTE_REGISTRY, WORKBENCH_ROUTES } from "../config/route-registry.js";
import { getPlatformContextSnapshot } from "../shell/platform-context.js";
import { getPreviewOpportunity } from "../data/preview-opportunities.js";
import { getCapabilitiesForAIContext } from "./ai-capability-registry.js?v=20260826-v1.9.30-work-execution-loop";
import { MIWA_BUSINESS_BY_ROUTE } from "../data/miwa-business-home-content.js";

const WORKBENCH_LABELS = Object.freeze(Object.fromEntries(
  WORKBENCH_ROUTES.map((id) => [id, ROUTE_REGISTRY[id]?.label || id])
));

const PRODUCT_CENTER_LABELS = Object.freeze({
  "brand-center":"品牌中心",
  "product-center":"商品中心",
  "attribute-center":"属性中心",
  "specification-center":"规格中心",
  "inventory-center":"库存中心",
  "asset-center":"资料中心",
  "template-center":"模板中心",
  "publish-center":"发布中心"
});

const productCapability = (code,label,description,prompt) => Object.freeze({code,label,description,prompt,intent:"analyze",writePolicy:"read_only",requiresObject:false});
const PRODUCT_AREA_CAPABILITIES = Object.freeze({
  "product-home": Object.freeze([
    productCapability("product_home.status","检查商品之家状态","检查九个章节之间的数据和流程缺口","作为商品之家AI秘书，检查当前商品之家各中心的数据、状态、责任和上下游关系；只基于已有事实，缺失内容标记待确认。"),
    productCapability("product_home.related","梳理商品关系","连接分类、品牌、属性、规格、库存、资料、模板与发布","作为商品之家AI秘书，梳理当前页面与商品之家其他中心的关联，指出缺失或重复定义。"),
    productCapability("product_home.next","生成下一步建议","把当前问题收敛成最少必要动作","结合商品之家当前上下文给出最少、明确、可执行的下一步；能规则化或自动化的单独标记。"),
    productCapability("product_home.handoff","准备跨中心交接","整理进入下一中心需要的事实","整理当前业务对象进入下一个商品中心环节所需的事实、状态、责任和缺口。")
  ]),
  "category-center": Object.freeze([
    productCapability("category.structure","检查分类体系","检查系统分类、店铺分类与映射结构","作为商品之家AI秘书，检查分类中心当前系统分类、店铺分类、分类映射是否存在层级、重复、缺失或异常。"),
    productCapability("category.mapping","检查分类映射","检查平台、海关与GS1辅助映射缺口","检查当前分类到平台分类、海关分类和GS1分类的映射需求；不确定代码必须标记待确认。"),
    productCapability("category.quality","检查分类质量","识别空分类、重复分类和不合理结构","基于当前分类中心真实上下文检查分类质量；不要虚构商品数量。"),
    productCapability("category.next","生成分类建议","形成少量可执行分类调整建议","结合当前分类树提出少量高价值调整建议，避免为了完整而增加分类。")
  ]),
  "brand-center": Object.freeze([
    productCapability("brand.completeness","检查品牌完整度","检查品牌事实、权利资料和渠道映射","作为商品之家AI秘书，检查当前品牌对象的名称、所有者、类型、主要分类、权利资料和渠道映射缺口。"),
    productCapability("brand.trademark","准备商标申请","整理商标申请前必须确认的资料","辅助准备当前品牌的商标申请：申请主体、商标形式、国家地区、指定商品/服务、近似检索、资料准备与人工确认；不要替代正式法律判断。"),
    productCapability("brand.mapping","检查品牌映射","识别各渠道品牌名称和外部ID差异","检查当前品牌在Rakuten、Amazon、批发等渠道的外部品牌名称、ID和状态差异。"),
    productCapability("brand.related","查找关联商品","梳理品牌与商品、分类、资料和渠道关系","梳理当前品牌关联的商品、分类、资料和发布渠道；避免复制同一品牌对象。")
  ])
});

function safeLocalJSON(key) {
  try { return JSON.parse(window.localStorage.getItem(key) || "null"); } catch (_) { return null; }
}

function readNodeValue(doc, id) {
  const node = doc?.getElementById?.(id);
  if (!node) return null;
  if ("value" in node) return String(node.value ?? "").trim();
  return String(node.textContent ?? "").trim();
}

function readNodeText(doc, id) {
  const node = doc?.getElementById?.(id);
  return node ? String(node.textContent ?? "").replace(/\s+/g, " ").trim() : null;
}

function getEmbeddedBusinessDocument() {
  const frame = document.querySelector(".route-business-frame iframe");
  if (!frame) return null;
  try { return frame.contentDocument || frame.contentWindow?.document || null; } catch (_) { return null; }
}

function parseOpportunityRoute(hash = window.location.hash) {
  const match = String(hash || "").match(/^#\/(selection|sampling)\/opportunity\/([^?]+)/);
  if (!match) return null;
  return { workbenchId: match[1], objectType:"product_opportunity", objectId:decodeURIComponent(match[2]) };
}

function parseProductArea(hash = window.location.hash, routeId = getRouteId(hash)) {
  if (routeId === "category-home") return { id:"category-center", label:"分类中心", homeId:"product-home", homeLabel:"商品之家" };
  if (routeId !== "product-home") return null;
  const raw = String(hash || "");
  const query = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
  const centerId = new URLSearchParams(query).get("center");
  if (centerId && PRODUCT_CENTER_LABELS[centerId]) return { id:centerId, label:PRODUCT_CENTER_LABELS[centerId], homeId:"product-home", homeLabel:"商品之家" };
  return { id:"product-home", label:"商品之家", homeId:"product-home", homeLabel:"商品之家" };
}

function resolveWorkbench(routeId, route) {
  if (WORKBENCH_LABELS[routeId]) return { id:routeId, label:WORKBENCH_LABELS[routeId] };
  let parent = route?.parent;
  while (parent) {
    if (WORKBENCH_LABELS[parent]) return { id:parent, label:WORKBENCH_LABELS[parent] };
    parent = ROUTE_REGISTRY[parent]?.parent || null;
  }
  return null;
}

function getCurrentUserContext() {
  const identity = window.AIONEPreviewIdentity || {};
  const permissions = window.AIONEPreviewPermissionContext || {};
  return {
    personId: identity.subjectId || null,
    displayName: identity.displayName || "当前用户",
    workIdentity: identity.primaryWorkIdentity || null,
    assignmentId: permissions.assignmentId || null,
    permissions
  };
}

function getOpportunityDetailData(objectId) {
  const doc = getEmbeddedBusinessDocument();
  const item = getPreviewOpportunity(objectId);
  const draft = safeLocalJSON(`aione:selection:draft:${objectId}`);
  const workflow = safeLocalJSON(`aione:selection:workflow:${objectId}`);
  const sourceData = safeLocalJSON(`aione:selection:source-data:${objectId}`);

  const sourceUrl = readNodeValue(doc, "selection-record-source") || draft?.fields?.["selection-record-source"] || item?.sourceUrl || "";
  const productName = readNodeValue(doc, "selection-record-name") || draft?.fields?.["selection-record-name"] || item?.name || "";
  const selectionType = readNodeValue(doc, "selection-record-selection-type") || draft?.selectionType || item?.type || "";
  const owner = readNodeText(doc, "selection-record-owner") || draft?.owner || item?.owner || "";
  const entryStatus = readNodeText(doc, "selection-record-entry-status") || item?.stageName || "待确认";

  const pricing = {
    purchaseUnit: readNodeValue(doc, "pricing-purchase-unit"), currency: readNodeValue(doc, "pricing-currency"), unitsPerSale: readNodeValue(doc, "pricing-units-per-sale"), unitWeight: readNodeValue(doc, "pricing-unit-weight"),
    totalCost: readNodeText(doc, "pricing-total-cost"), recommendedPrice: readNodeText(doc, "pricing-recommended-price"), finalPrice: readNodeText(doc, "pricing-final-price"), finalProfit: readNodeText(doc, "pricing-final-profit"), finalMargin: readNodeText(doc, "pricing-final-margin"),
    contributionProfit: readNodeText(doc, "pricing-profitability-profit"), contributionMargin: readNodeText(doc, "pricing-profitability-margin"), grossMargin: readNodeText(doc, "pricing-gross-margin"), marginJudge: readNodeText(doc, "pricing-margin-status"), grossMarginJudge: readNodeText(doc, "pricing-gross-status")
  };
  const shipping = { length:readNodeValue(doc,"pricing-shipping-length"), width:readNodeValue(doc,"pricing-shipping-width"), height:readNodeValue(doc,"pricing-shipping-height"), recommendedTier:readNodeText(doc,"selection-shipping-recommended"), confirmedDeliveryFee:readNodeText(doc,"selection-confirmed-delivery-fee") };
  const sampleState = workflow?.sampleState || null;
  const finalDecision = workflow?.finalDecisionSnapshot || null;
  const currentStage = item?.stage || (workflow?.lastPricingResult ? "decision" : "data");
  const currentStageName = item?.stageName || (workflow?.lastPricingResult ? "上架判断" : "数据录入");
  const sourceFacts = sourceData?.sourceUrl && sourceData.sourceUrl === sourceUrl ? sourceData.product : null;

  return {
    source:"aione_current_opportunity_context", generatedAt:new Date().toISOString(),
    opportunity:{ id:objectId,name:productName||"待确认",selectionType:selectionType||"待确认",owner:owner||"待确认",stage:currentStage,stageName:currentStageName,entryStatus,sourcePlatform:item?.source||"待确认",sourceUrl:sourceUrl||"待确认",result:item?.result||"待形成" },
    pricing, shipping, sourceFacts,
    sampling: sampleState ? { status:sampleState.status||"not_started",conclusion:sampleState.conclusion||null,measuredWeight:sampleState.measuredWeight||null,weightEffective:Boolean(sampleState.weightEffective),issueSeverity:sampleState.issueSeverity||null,issueTags:sampleState.issueTags||null,issueDescription:sampleState.issueDescription||null,handlingRequirement:sampleState.handlingRequirement||null,completedAt:sampleState.completedAt||null } : {status:"not_started"},
    decision: finalDecision ? {result:finalDecision.result||null,decisionBy:finalDecision.decisionBy||null,decisionAt:finalDecision.decisionAt||null,manualOverrideReason:finalDecision.manualOverrideReason||null}:null,
    dataCompleteness:{hasProductName:Boolean(productName),hasSourceUrl:Boolean(sourceUrl),hasSourceApiFacts:Boolean(sourceFacts),hasPricingResult:Boolean(workflow?.lastPricingResult),hasFinalDecision:Boolean(finalDecision),hasSamplingEvidence:sampleState?.status==="completed"}
  };
}

export function buildAIONEAIContext(hash = window.location.hash) {
  const routeId = getRouteId(hash);
  const route = getRouteDefinition(hash);
  const platform = getPlatformContextSnapshot();
  const businessHomeItem = MIWA_BUSINESS_BY_ROUTE[routeId] || null;
  const isBusinessHomeContext = routeId === "business-home" || String(routeId || "").startsWith("business-");
  const opportunityRoute = parseOpportunityRoute(hash);
  const productArea = parseProductArea(hash, routeId);
  const activeWork = String(routeId || "").startsWith("work") ? (window.AIONEWorkExecutionContext || null) : null;
  const defaultWorkbench = resolveWorkbench(routeId, route);
  const workbench = opportunityRoute
    ? { id:opportunityRoute.workbenchId, label:WORKBENCH_LABELS[opportunityRoute.workbenchId] || opportunityRoute.workbenchId }
    : productArea ? { id:productArea.id, label:productArea.label } : defaultWorkbench;

  const object = activeWork?.workItem?.id ? { type:"work_item", id:activeWork.workItem.id, label:"工作事项" }
    : opportunityRoute ? { type:opportunityRoute.objectType,id:opportunityRoute.objectId,label:"商品机会" } : null;

  const pageType = activeWork?.workItem?.id ? "work_item_execution_detail" : opportunityRoute ? (opportunityRoute.workbenchId === "sampling" ? "sampling_opportunity_detail" : "selection_opportunity_detail") : productArea ? "product_home_center" : (workbench ? "workbench_page" : "platform_page");
  const data = object?.type === "work_item" ? activeWork : object?.type === "product_opportunity" ? getOpportunityDetailData(object.id) : productArea ? {home:productArea.homeLabel,center:productArea.label,centerId:productArea.id} : null;
  const title = object?.type === "work_item" ? `工作之家 · ${activeWork?.workItem?.title || object.id}` : object ? `${workbench?.label || route.title} · ${object.label} ${object.id}` : productArea ? productArea.label : route?.title || "当前页面";
  const displayRoute = object?.type === "work_item" ? `${activeWork?.workItem?.status || "当前状态"} · ${activeWork?.workItem?.title || object.id}` : object ? `${data?.opportunity?.stageName || "当前状态"} · ${object.id}` : productArea ? `商品之家 · ${productArea.label}` : (workbench?.label || platform.businessLabel || route?.title || "当前页面");

  return {
    version:"1.1", routeId, title, hash:String(hash || "#/selection"), displayRoute,
    assistant:{ id:productArea?"product-home-secretary":"miwa-ai", label:productArea?"商品之家AI秘书":"美和AI", scope:productArea?"product-home":"global" },
    company:{id:"miwa-group",label:"美和集团"},
    business:isBusinessHomeContext ? (businessHomeItem ? {id:businessHomeItem.id,label:businessHomeItem.name,shortLabel:businessHomeItem.name.replace(/^美和/,"")||businessHomeItem.name}:{id:null,label:"事业之家",shortLabel:"事业"}) : {id:platform.businessSpaceId||null,label:platform.businessLabel||"待确认事业",shortLabel:platform.businessShortLabel||platform.businessLabel||"事业"},
    workbench, page:{type:pageType,routeId,title:productArea?.label || route?.title || title}, object,
    state:object?.type === "work_item" ? (activeWork?.workItem?.status || null) : (data?.opportunity?.stage || null), user:getCurrentUserContext(), data
  };
}

export function routeAIONEAIContext(context = buildAIONEAIContext()) {
  const scoped = PRODUCT_AREA_CAPABILITIES[context?.workbench?.id];
  return { context, capabilities: scoped || getCapabilitiesForAIContext(context) };
}
