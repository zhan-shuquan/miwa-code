/* ========================================
   AI Secretary Client｜美和AI独立能力层执行客户端 V1
   第一个真实验证者：会长兼董事长AI办公室。
======================================== */
import { getRouteDefinition } from "../config/route-registry.js";
import { resolveAIOfficeForIdentity } from "../config/ai-office-registry.js";
import { getCollaborationData, addTask } from "../data/collaboration-store.js";
import { getNotifications } from "../data/notification-store.js";
import { aioneApi, aioneDownload } from "../services/aione-api-client.js";
import { loadSelectionItems, getSelectionMetrics, getSelectionTypeCards, getSelectionFlowSteps } from "../data/selection-workbench-adapter.js";
import { buildAIONEAIContext } from "./ai-context-router.js";

const HISTORY_LIMIT = 12;
let initialized = false;
let office = null;
let lastProposals = [];

function currentIdentity() { return window.AIONEPreviewIdentity || {}; }
function text(value) { return String(value ?? "").trim(); }

function buildCurrentPageBusinessContext(route, aiContext) {
  if (aiContext?.object) {
    return {
      contextType: aiContext.page?.type || "business_object_detail",
      objectType: aiContext.object.type,
      objectId: aiContext.object.id,
      source: "aione_ai_context_router",
      generatedAt: new Date().toISOString(),
      business: aiContext.business,
      workbench: aiContext.workbench,
      state: aiContext.state,
      data: aiContext.data
    };
  }
  if (route?.id !== "selection") return aiContext ? {
    contextType: aiContext.page?.type || "aione_page",
    source: "aione_ai_context_router",
    generatedAt: new Date().toISOString(),
    business: aiContext.business,
    workbench: aiContext.workbench,
    state: aiContext.state,
    data: aiContext.data
  } : null;
  try {
    const items = loadSelectionItems();
    return {
      contextType: "selection_workbench",
      objectType: "product_opportunity",
      source: "aione_current_ui_data_source",
      generatedAt: new Date().toISOString(),
      metrics: getSelectionMetrics(items),
      types: getSelectionTypeCards(items).map(({ key, label, count }) => ({ key, label, count })),
      stages: getSelectionFlowSteps(items).map(({ key, label, count }) => ({ key, label, count })),
      opportunities: items.slice(0, 24).map((item) => ({
        id:item.id, name:item.name, type:item.type, stage:item.stage, stageName:item.stageName, owner:item.owner,
        platforms:item.platforms, time:item.time, cost:item.cost, info:item.info, rule:item.rule, ai:item.ai,
        elements:item.elements, result:item.result, source:item.source
      }))
    };
  } catch (error) {
    return { contextType:"selection_workbench", source:"aione_current_ui_data_source", available:false, reason:String(error?.message || error) };
  }
}

function buildSnapshot(options = {}) {
  const identity = currentIdentity();
  office = resolveAIOfficeForIdentity(identity);
  const collaboration = getCollaborationData();
  const notices = getNotifications();
  const route = getRouteDefinition();
  const aiContext = buildAIONEAIContext();
  const tasks = (collaboration.tasks || []).slice(0, 60).map((item) => ({
    id:item.id,title:item.title,status:item.status,priority:item.priority,assigneeId:item.assigneeId,assigneeName:item.assigneeName,
    creatorId:item.creatorId,creatorName:item.creatorName,dueDate:item.dueDate,workbench:item.workbench,source:item.source,createdAt:item.createdAt
  }));
  const events = (collaboration.events || []).slice(0, 40).map((item) => ({ id:item.id,title:item.title,date:item.date,time:item.time,type:item.type,description:item.description }));
  const notifications = notices.slice(0, 30).map((item) => ({ id:item.id,title:item.title,summary:item.summary,level:item.level,requiresAck:item.requiresAck,dueAt:item.dueAt,readAt:item.readAt,acknowledgedAt:item.acknowledgedAt }));
  return {
    currentTime: new Date().toISOString(),
    user: {
      personId: identity.subjectId || null,
      displayName: identity.displayName || "当前用户",
      primaryWorkIdentity: identity.primaryWorkIdentity || "待确认",
      positionGrade: identity.positionGrade || null,
      assignment: identity.workAssignment || {}
    },
    office,
    page: {
      routeId: route.id,
      title: route.title,
      hash: window.location.hash || "#/selection",
      aiContext,
      businessContext:buildCurrentPageBusinessContext(route, aiContext)
    },
    aiRequest: options.capabilityCode ? {
      capabilityCode: options.capabilityCode,
      capabilityLabel: options.capabilityLabel || null,
      routedBy: "aione_ai_context_router_v1"
    } : null,
    nineElements: ["目标","人","物","事","平台","时间","钱","信息","结果"],
    work: { tasks, suggestions:(collaboration.suggestions || []).slice(0, 20) },
    calendar: { events },
    notifications
  };
}

function renderStatus(message, tone = "neutral") {
  const node = document.getElementById("ai-secretary-runtime-status");
  if (!node) return;
  node.textContent = message;
  node.dataset.tone = tone;
}

function renderRuntimeStatus(status = {}) {
  const node = document.getElementById("ai-secretary-runtime-status");
  if (!node) return;
  node.dataset.provider = status.provider || "";
  node.dataset.model = status.model || "";
  node.dataset.runtimeMode = status.mode || "";
  if (status.mode === "openai") {
    renderStatus("美和AI已就绪", "success");
    return;
  }
  if (status.mode === "aione") {
    renderStatus("美和AI已就绪｜企业资料检索", "success");
    return;
  }
  if (status.liveRequested && status.fallbackReason === "provider_not_configured") {
    renderStatus("美和AI待完成运行配置", "preview");
    return;
  }
  renderStatus("美和AI预演环境已就绪", "preview");
}

function appendInlineMarkdown(parent, value) {
  const parts = String(value || "").split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  parts.forEach((part) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      const strong = document.createElement("strong");
      strong.textContent = part.slice(2, -2);
      parent.append(strong);
    } else {
      parent.append(document.createTextNode(part));
    }
  });
}

function renderMarkdownLite(host, content) {
  const lines = String(content || "").replace(/\r\n?/g, "\n").split("\n");
  let list = null;
  let listType = null;
  const flushList = () => { list = null; listType = null; };
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushList();
      const spacer = document.createElement("div");
      spacer.className = "ai-secretary-markdown-spacer";
      host.append(spacer);
      continue;
    }
    const heading = line.match(/^#{1,4}\s+(.+)$/);
    if (heading) {
      flushList();
      const h = document.createElement("h4");
      appendInlineMarkdown(h, heading[1]);
      host.append(h);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || ordered) {
      const type = ordered ? "ol" : "ul";
      if (!list || listType !== type) {
        list = document.createElement(type);
        listType = type;
        host.append(list);
      }
      const li = document.createElement("li");
      appendInlineMarkdown(li, (ordered || bullet)[1]);
      list.append(li);
      continue;
    }
    flushList();
    const paragraph = document.createElement("p");
    appendInlineMarkdown(paragraph, line);
    host.append(paragraph);
  }
}

function appendMessage(role, content, meta = "") {
  const thread = document.getElementById("ai-secretary-thread");
  if (!thread) return;
  const item = document.createElement("article");
  item.className = `ai-secretary-message is-${role}`;
  const label = document.createElement("strong");
  label.textContent = role === "user" ? "我" : "美和AI";
  const body = document.createElement("div");
  body.className = "ai-secretary-message__body";
  if (role === "assistant") renderMarkdownLite(body, content);
  else body.textContent = content;
  item.append(label, body);
  if (meta) { const small = document.createElement("small"); small.textContent = meta; item.append(small); }
  thread.append(item);
  while (thread.children.length > HISTORY_LIMIT) thread.firstElementChild?.remove();
  thread.scrollTop = thread.scrollHeight;
}

function assetMeta(item = {}) {
  return [item.type || (item.kind === "page" ? "AIONE内容" : "资料"), item.version, item.recordStatus].filter(Boolean).join("｜");
}

async function downloadAssetResult(item, button = null) {
  if (!item?.downloadPath) return;
  const originalText = button?.textContent || "下载原件";
  if (button) { button.disabled = true; button.textContent = "下载中…"; }
  try {
    const result = await aioneDownload(item.downloadPath, { fileName:item.sourceName || item.title || "download" });
    if (button) button.textContent = "已下载";
    appendMessage("assistant", `原件已通过AIONE安全下载：${result.fileName}`, "共享云盘安全交付");
  } catch (error) {
    if (button) { button.disabled = false; button.textContent = originalText; }
    appendMessage("assistant", `原件下载失败：${error.message}`, "未下载");
  }
}

function renderAssetResults(items = [], requestedAction = "search") {
  if (!Array.isArray(items) || !items.length) return;
  const thread = document.getElementById("ai-secretary-thread");
  if (!thread) return;

  const wrapper = document.createElement("article");
  wrapper.className = "ai-secretary-message is-assistant ai-secretary-asset-results";
  const label = document.createElement("strong");
  label.textContent = items.length > 1 ? `资料结果｜${items.length}项` : "资料结果";
  const list = document.createElement("div");
  list.className = "ai-secretary-asset-list";

  items.forEach((item) => {
    const card = document.createElement("section");
    card.className = "ai-secretary-asset-card";

    const title = document.createElement("b");
    title.className = "ai-secretary-asset-card__title";
    title.textContent = item.title || "未命名资料";

    const meta = document.createElement("span");
    meta.className = "ai-secretary-asset-card__meta";
    meta.textContent = assetMeta(item);

    const source = document.createElement("span");
    source.className = "ai-secretary-asset-card__source";
    source.textContent = item.sourceLabel ? `来源：${item.sourceLabel}` : "来源：美和之家";

    const actions = document.createElement("div");
    actions.className = "ai-secretary-asset-card__actions";

    if (item.route) {
      const contentButton = document.createElement("button");
      contentButton.type = "button";
      contentButton.textContent = "查看内容";
      contentButton.addEventListener("click", () => { window.location.hash = `#/${item.route}`; });
      actions.append(contentButton);
    }

    if (item.sourceUrl) {
      const originalButton = document.createElement("button");
      originalButton.type = "button";
      originalButton.textContent = "查看原件 ↗";
      originalButton.addEventListener("click", () => window.open(item.sourceUrl, "_blank", "noopener,noreferrer"));
      actions.append(originalButton);
    }

    if (item.downloadable && item.downloadPath) {
      const downloadButton = document.createElement("button");
      downloadButton.type = "button";
      downloadButton.className = "is-primary";
      downloadButton.textContent = "下载原件";
      downloadButton.addEventListener("click", () => downloadAssetResult(item, downloadButton));
      actions.append(downloadButton);
    }

    card.append(title, meta, source, actions);
    list.append(card);
  });

  wrapper.append(label, list);
  thread.append(wrapper);
  while (thread.children.length > HISTORY_LIMIT) thread.firstElementChild?.remove();
  thread.scrollTop = thread.scrollHeight;

  if (requestedAction === "download" && items.length === 1 && items[0]?.downloadPath) {
    const autoButton = wrapper.querySelector(".ai-secretary-asset-card__actions .is-primary");
    downloadAssetResult(items[0], autoButton);
  }
}

function renderProposals(proposals = []) {
  lastProposals = proposals;
  const host = document.getElementById("ai-secretary-proposals");
  if (!host) return;
  host.replaceChildren();
  proposals.forEach((proposal, index) => {
    const card = document.createElement("article");
    card.className = "ai-secretary-proposal";
    const title = document.createElement("strong");
    title.textContent = proposal.label || "待确认动作";
    const detail = document.createElement("p");
    detail.textContent = proposal.summary || proposal.title || "AI建议执行一项AIONE写入动作。";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "确认执行";
    button.addEventListener("click", () => confirmProposal(index, button));
    card.append(title, detail, button);
    host.append(card);
  });
}

function materializeLocalConfirmedAction(result, snapshot) {
  if (result?.previewLocalAction?.type !== "create_work_item") return result;
  const action = result.previewLocalAction.payload || {};
  const created = addTask({
    title:action.title,
    description:action.description||"",
    dueDate:action.dueAt?.slice?.(0,10)||"",
    priority:action.priority||"normal",
    workbench:snapshot?.page?.routeId || "",
    route:snapshot?.page?.hash || "",
    source:"ai-secretary-confirmed-local"
  });
  result.localWorkItemId = created?.id || null;
  return result;
}

function presentConfirmationResult(result, snapshot) {
  materializeLocalConfirmedAction(result, snapshot);
  appendMessage(
    "assistant",
    result?.message || "Confirmed action completed.",
    result?.persisted ? "\u5df2\u7531\u4eba\u786e\u8ba4\uff5c\u6b63\u5f0f\u6570\u636e\u5e93\u5df2\u5199\u5165" : "\u5df2\u7531\u4eba\u786e\u8ba4\uff5c\u672c\u5730AIONE\u5df2\u5199\u5165"
  );
  renderProposals([]);
}

async function confirmProposal(index, button) {
  const proposal = lastProposals[index];
  if (!proposal) return;
  button.disabled = true;
  try {
    const snapshot = buildSnapshot();
    const result = await aioneApi("/api/v1/ai-secretary/confirm", {
      method:"POST",
      body:JSON.stringify({ officeCode:office.code, proposalId:proposal.id || null, proposal, contextSnapshot:snapshot })
    });
    presentConfirmationResult(result, snapshot);
    button.textContent = "\u5df2\u6267\u884c";
  } catch (error) {
    button.disabled = false;
    appendMessage("assistant", `\u786e\u8ba4\u6267\u884c\u5931\u8d25\uff1a${error.message}`, "\u672a\u5199\u5165");
  }
}

async function sendCommand(command, options = {}) {
  const value = text(command);
  if (!value) return;
  const button = document.getElementById("ai-secretary-send");
  const input = document.getElementById("ai-secretary-command-input");
  appendMessage("user", value);
  if (button) button.disabled = true;
  renderStatus("美和AI正在读取上下文并组织执行…", "working");
  try {
    const snapshot = buildSnapshot(options);
    const result = await aioneApi("/api/v1/ai-secretary/execute", { method:"POST", body:JSON.stringify({ objective:value, officeCode:office.code, contextSnapshot:snapshot }) });
    if (result.confirmationResult) {
      presentConfirmationResult(result.confirmationResult, snapshot);
    } else {
      appendMessage("assistant", result.answer || result.message || "美和AI已完成本轮分析。");
      renderAssetResults(result.assetResults || [], result.requestedAssetAction || "search");
      renderProposals(result.proposals || []);
    }
    renderRuntimeStatus(result);
  } catch (error) {
    appendMessage("assistant", `美和AI暂时无法执行：${error.message}`, "检查Backend/API配置");
    renderStatus("美和AI Backend未连接或配置不完整。", "error");
  } finally {
    if (button) button.disabled = false;
    if (input) input.focus();
  }
}

async function loadRuntimeStatus() {
  try {
    const status = await aioneApi("/api/v1/ai-secretary/status");
    renderRuntimeStatus(status);
  } catch (_) {
    renderStatus("美和AI运行服务未连接", "error");
  }
}

function syncOfficeIdentity() {
  const identity = currentIdentity();
  office = resolveAIOfficeForIdentity(identity);
  document.querySelectorAll("[data-ai-office-name]").forEach((node) => node.textContent = office.name);
  document.querySelector("[data-ai-office-link]")?.setAttribute("href", "#/ai-office");
}

export function initAISecretaryClient() {
  if (initialized) return;
  initialized = true;
  syncOfficeIdentity();
  const input = document.getElementById("ai-secretary-command-input");
  const send = document.getElementById("ai-secretary-send");
  send?.addEventListener("click", () => sendCommand(input?.value || ""));
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendCommand(input.value);
    }
  });
  document.querySelectorAll("[data-ai-secretary-prompt]").forEach((button) => button.addEventListener("click", () => {
    const prompt = button.dataset.aiSecretaryPrompt || button.textContent;
    if (input) input.value = prompt;
    sendCommand(prompt);
  }));
  window.addEventListener("hashchange", syncOfficeIdentity);
  loadRuntimeStatus();
  window.AIONEAISecretary = Object.freeze({ sendCommand, buildSnapshot, refreshStatus:loadRuntimeStatus, getOffice:() => office });
}
