/* ========================================
   AIONE AI Context Router V1.0
   One 美和AI entry, context-matched business capabilities.
   User does not choose AI talent, AI job, model or provider.
======================================== */
import { getRouteDefinition, getRouteId, ROUTE_REGISTRY, WORKBENCH_ROUTES } from "../config/route-registry.js";
import { getPlatformContextSnapshot } from "../shell/platform-context.js";
import { getPreviewOpportunity } from "../data/preview-opportunities.js";
import { getCapabilitiesForAIContext } from "./ai-capability-registry.js?v=20260826-v1.9.30-work-execution-loop";

const WORKBENCH_LABELS = Object.freeze(Object.fromEntries(
  WORKBENCH_ROUTES.map((id) => [id, ROUTE_REGISTRY[id]?.label || id])
));

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
    purchaseUnit: readNodeValue(doc, "pricing-purchase-unit"),
    currency: readNodeValue(doc, "pricing-currency"),
    unitsPerSale: readNodeValue(doc, "pricing-units-per-sale"),
    unitWeight: readNodeValue(doc, "pricing-unit-weight"),
    totalCost: readNodeText(doc, "pricing-total-cost"),
    recommendedPrice: readNodeText(doc, "pricing-recommended-price"),
    finalPrice: readNodeText(doc, "pricing-final-price"),
    finalProfit: readNodeText(doc, "pricing-final-profit"),
    finalMargin: readNodeText(doc, "pricing-final-margin"),
    contributionProfit: readNodeText(doc, "pricing-profitability-profit"),
    contributionMargin: readNodeText(doc, "pricing-profitability-margin"),
    grossMargin: readNodeText(doc, "pricing-gross-margin"),
    marginJudge: readNodeText(doc, "pricing-margin-status"),
    grossMarginJudge: readNodeText(doc, "pricing-gross-status")
  };

  const shipping = {
    length: readNodeValue(doc, "pricing-shipping-length"),
    width: readNodeValue(doc, "pricing-shipping-width"),
    height: readNodeValue(doc, "pricing-shipping-height"),
    recommendedTier: readNodeText(doc, "selection-shipping-recommended"),
    confirmedDeliveryFee: readNodeText(doc, "selection-confirmed-delivery-fee")
  };

  const sampleState = workflow?.sampleState || null;
  const finalDecision = workflow?.finalDecisionSnapshot || null;
  const currentStage = item?.stage || (workflow?.lastPricingResult ? "decision" : "data");
  const currentStageName = item?.stageName || (workflow?.lastPricingResult ? "上架判断" : "数据录入");
  const sourceFacts = sourceData?.sourceUrl && sourceData.sourceUrl === sourceUrl ? sourceData.product : null;

  return {
    source: "aione_current_opportunity_context",
    generatedAt: new Date().toISOString(),
    opportunity: {
      id: objectId,
      name: productName || "待确认",
      selectionType: selectionType || "待确认",
      owner: owner || "待确认",
      stage: currentStage,
      stageName: currentStageName,
      entryStatus,
      sourcePlatform: item?.source || "待确认",
      sourceUrl: sourceUrl || "待确认",
      result: item?.result || "待形成"
    },
    pricing,
    shipping,
    sourceFacts,
    sampling: sampleState ? {
      status: sampleState.status || "not_started",
      conclusion: sampleState.conclusion || null,
      measuredWeight: sampleState.measuredWeight || null,
      weightEffective: Boolean(sampleState.weightEffective),
      issueSeverity: sampleState.issueSeverity || null,
      issueTags: sampleState.issueTags || null,
      issueDescription: sampleState.issueDescription || null,
      handlingRequirement: sampleState.handlingRequirement || null,
      completedAt: sampleState.completedAt || null
    } : { status:"not_started" },
    decision: finalDecision ? {
      result: finalDecision.result || null,
      decisionBy: finalDecision.decisionBy || null,
      decisionAt: finalDecision.decisionAt || null,
      manualOverrideReason: finalDecision.manualOverrideReason || null
    } : null,
    dataCompleteness: {
      hasProductName: Boolean(productName),
      hasSourceUrl: Boolean(sourceUrl),
      hasSourceApiFacts: Boolean(sourceFacts),
      hasPricingResult: Boolean(workflow?.lastPricingResult),
      hasFinalDecision: Boolean(finalDecision),
      hasSamplingEvidence: sampleState?.status === "completed"
    }
  };
}

export function buildAIONEAIContext(hash = window.location.hash) {
  const routeId = getRouteId(hash);
  const route = getRouteDefinition(hash);
  const platform = getPlatformContextSnapshot();
  const opportunityRoute = parseOpportunityRoute(hash);
  const activeWork = String(routeId || "").startsWith("work") ? (window.AIONEWorkExecutionContext || null) : null;
  const defaultWorkbench = resolveWorkbench(routeId, route);
  const workbench = opportunityRoute
    ? { id:opportunityRoute.workbenchId, label:WORKBENCH_LABELS[opportunityRoute.workbenchId] || opportunityRoute.workbenchId }
    : defaultWorkbench;

  const object = activeWork?.workItem?.id ? {
    type:"work_item",
    id:activeWork.workItem.id,
    label:"工作事项"
  } : opportunityRoute ? {
    type: opportunityRoute.objectType,
    id: opportunityRoute.objectId,
    label: "商品机会"
  } : null;

  const pageType = activeWork?.workItem?.id
    ? "work_item_execution_detail"
    : opportunityRoute
      ? (opportunityRoute.workbenchId === "sampling" ? "sampling_opportunity_detail" : "selection_opportunity_detail")
      : (workbench ? "workbench_page" : "platform_page");
  const data = object?.type === "work_item"
    ? activeWork
    : object?.type === "product_opportunity" ? getOpportunityDetailData(object.id) : null;
  const title = object?.type === "work_item"
    ? `工作之家 · ${activeWork?.workItem?.title || object.id}`
    : object
      ? `${workbench?.label || route.title} · ${object.label} ${object.id}`
      : route?.title || "当前页面";
  const displayRoute = object?.type === "work_item"
    ? `${activeWork?.workItem?.status || "当前状态"} · ${activeWork?.workItem?.title || object.id}`
    : object
      ? `${data?.opportunity?.stageName || "当前状态"} · ${object.id}`
      : (workbench?.label || platform.businessLabel || route?.title || "当前页面");

  return {
    version: "1.0",
    routeId,
    title,
    hash: String(hash || "#/selection"),
    displayRoute,
    company: { id:"miwa-group", label:"美和集团" },
    business: {
      id: platform.businessSpaceId || null,
      label: platform.businessLabel || "待确认事业",
      shortLabel: platform.businessShortLabel || platform.businessLabel || "事业"
    },
    workbench,
    page: { type:pageType, routeId, title:route?.title || title },
    object,
    state: object?.type === "work_item" ? (activeWork?.workItem?.status || null) : (data?.opportunity?.stage || null),
    user: getCurrentUserContext(),
    data
  };
}

export function routeAIONEAIContext(context = buildAIONEAIContext()) {
  return {
    context,
    capabilities: getCapabilitiesForAIContext(context)
  };
}
