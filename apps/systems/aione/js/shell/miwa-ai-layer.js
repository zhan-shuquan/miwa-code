/* ========================================
   美和AI Layer｜AIONE独立智能能力层 V1.9.17 Context Router
   Frontend: 美和AI → AI工作区 → AI办公室
   Internal: AI Layer / Drawer / Workspace / AI Office
======================================== */
import { initAISecretaryClient } from "../ai/ai-secretary-client.js?v=20260826-v1.9.28-ai-context-capabilities";
import { buildAIONEAIContext, routeAIONEAIContext } from "../ai/ai-context-router.js";
import { getQuickIntentsForAIContext, recordQuickIntentUsage } from "../ai/ai-quick-intents.js";

const ENTRY_SELECTOR = "#desktop-miwa-ai-entry,#mobile-miwa-ai-entry";
// Legacy route-only suggestion tables were retired in V1.9.17.
// Capabilities now come from the context-aware AI Capability Registry.

let initialized = false;
let aiClientInitialized = false;
let globalBridgeInstalled = false;
let routeListenerInstalled = false;
let lastFocusedElement = null;
let pendingOpenSource = null;
let layerMountObserver = null;

function layer() { return document.getElementById("miwa-ai-layer"); }

const REQUIRED_LAYER_IDS = Object.freeze([
  "miwa-ai-current-context",
  "miwa-ai-current-route",
  "miwa-ai-suggestion-grid",
  "ai-secretary-runtime-status",
  "ai-secretary-thread",
  "miwa-ai-quick-intents",
  "ai-secretary-command-input",
  "ai-secretary-send"
]);

const LAYER_BODY_TEMPLATE = `
  <div class="miwa-ai-contextbar">
    <span class="miwa-ai-contextbar__label">当前上下文</span>
    <strong id="miwa-ai-current-context">当前页面</strong>
    <span class="miwa-ai-contextbar__route" id="miwa-ai-current-route">#/selection</span>
  </div>

  <div class="miwa-ai-panel__body">
    <section class="miwa-ai-recommendations" aria-labelledby="miwa-ai-recommendations-title">
      <div class="miwa-ai-section-heading">
        <div><span>按当前页面推荐</span><strong id="miwa-ai-recommendations-title">你可以让美和AI</strong></div>
        <small>能力随业务上下文动态变化</small>
      </div>
      <div class="miwa-ai-suggestion-grid" id="miwa-ai-suggestion-grid"></div>
    </section>

    <section class="miwa-ai-workarea" aria-label="美和AI工作区">
      <div class="miwa-ai-runtime-row">
        <span class="miwa-ai-runtime-dot" aria-hidden="true"></span>
        <span id="ai-secretary-runtime-status" data-tone="neutral">美和AI已就绪</span>
      </div>
      <div class="miwa-ai-thread" id="ai-secretary-thread" aria-live="polite">
        <article class="ai-secretary-message is-assistant miwa-ai-welcome">
          <strong>美和AI</strong>
          <div class="ai-secretary-message__body">已准备读取当前页面与业务上下文。你可以直接告诉我想分析、检查、生成或执行什么。</div>
        </article>
      </div>
      <div class="miwa-ai-proposals" id="ai-secretary-proposals"></div>
    </section>
  </div>

  <footer class="miwa-ai-composer-shell">
    <div class="miwa-ai-composer-tools">
      <button type="button" class="miwa-ai-composer-chip" data-miwa-ai-tool="attach" title="后续接入文件、商品、订单等对象">
        <span aria-hidden="true">＋</span><span>添加</span>
      </button>
      <span class="miwa-ai-composer-auto" title="能力由当前业务上下文自动匹配">
        <span aria-hidden="true">✦</span><span>能力自动匹配</span>
      </span>
      <div class="miwa-ai-quick-intents" id="miwa-ai-quick-intents" aria-label="常用能力"></div>
      <span class="miwa-ai-composer-context" id="miwa-ai-composer-context">当前页面</span>
    </div>
    <div class="miwa-ai-composer">
      <textarea id="ai-secretary-command-input" rows="1" placeholder="告诉美和AI你想做什么……" aria-label="给美和AI布置任务"></textarea>
      <button id="ai-secretary-send" class="miwa-ai-send" type="button" aria-label="发送给美和AI">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6.5 10.5 12 5l5.5 5.5"/></svg>
      </button>
    </div>
    <div class="miwa-ai-composer-foot">
      <span>美和AI可调用当前业务上下文；关键写入仍需人类确认。</span>
      <button type="button" data-miwa-ai-action="open-office">进入AI办公室 →</button>
    </div>
  </footer>`;

function getMissingLayerIds() {
  return REQUIRED_LAYER_IDS.filter((id) => !document.getElementById(id));
}

function repairLayerStructure() {
  const root = layer();
  if (!root) return false;
  const panel = root.querySelector(".miwa-ai-panel");
  if (!panel) {
    console.error("[美和AI] Layer Panel不存在，无法自愈正文结构。");
    return false;
  }

  const missing = getMissingLayerIds();
  if (!missing.length) return true;

  console.warn("[美和AI] 检测到Layer正文结构不完整，启动自愈重建：", missing);
  panel.querySelectorAll(".miwa-ai-contextbar,.miwa-ai-panel__body,.miwa-ai-composer-shell,[data-miwa-ai-fallback]").forEach((node) => node.remove());
  panel.insertAdjacentHTML("beforeend", LAYER_BODY_TEMPLATE);
  root.dataset.miwaAiRepaired = "true";
  root.dataset.miwaAiRepairVersion = "v1.9.10";

  const remaining = getMissingLayerIds();
  if (remaining.length) {
    console.error("[美和AI] Layer正文自愈后仍缺少节点：", remaining);
    return false;
  }
  return true;
}

function getCurrentContext() {
  const hash = window.location.hash || "#/selection";
  try {
    return buildAIONEAIContext(hash);
  } catch (error) {
    console.warn("[美和AI] 当前Route解析失败，使用安全上下文。", error);
    return { routeId:"selection", title:"当前页面", hash, displayRoute:"当前页面", business:null, workbench:null, page:{type:"unknown"}, object:null, data:null };
  }
}

function validateLayerDOM() {
  // V1.9.10：组件注入若只留下Header，不再要求用户刷新；先在本地自愈重建正文。
  if (repairLayerStructure()) return true;
  const missing = getMissingLayerIds();
  console.error("[美和AI] Layer结构不完整且自愈失败：", missing);
  const panel = layer()?.querySelector(".miwa-ai-panel");
  if (panel && !panel.querySelector("[data-miwa-ai-fallback]")) {
    const fallback = document.createElement("div");
    fallback.dataset.miwaAiFallback = "true";
    fallback.style.cssText = "margin:16px;padding:14px;border:1px solid #ecc6c2;border-radius:10px;background:#fff6f5;color:#8f2d28;font-size:12px;line-height:1.7";
    fallback.textContent = "美和AI界面结构自愈失败。请关闭后重新打开；AI Backend与既有执行接口未被删除。";
    panel.append(fallback);
  }
  return false;
}

function suggestionPrompt(capability, context) {
  const subject = context.object?.id ? `${context.object.label || "业务对象"}${context.object.id}` : context.title;
  return `${capability.prompt}\n\n当前对象：${subject}。请使用AIONE已经提供的当前业务上下文与系统计算结果；不确定的事实标记待确认，不要自行编造。`;
}

function renderQuickIntents(context) {
  const host = document.getElementById("miwa-ai-quick-intents");
  if (!host) return;
  const items = getQuickIntentsForAIContext(context).slice(0, 5);
  host.replaceChildren(...items.map((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "miwa-ai-quick-intent";
    button.dataset.quickIntent = item.code;
    button.innerHTML = `<span aria-hidden="true">${item.icon || "✦"}</span><b>${item.label}</b>`;
    button.title = item.placeholder || item.label;
    button.addEventListener("click", () => {
      host.querySelectorAll(".miwa-ai-quick-intent").forEach((node) => node.classList.toggle("is-active", node === button));
      recordQuickIntentUsage(item.code, context);
      window.dispatchEvent(new CustomEvent("aione:miwa-ai-quick-intent", { detail:item }));
    });
    return button;
  }));
}

function renderContext() {
  if (!layer()) return;
  const { context, capabilities } = routeAIONEAIContext(getCurrentContext());
  const contextNode = document.getElementById("miwa-ai-current-context");
  const routeNode = document.getElementById("miwa-ai-current-route");
  const composerContext = document.getElementById("miwa-ai-composer-context");
  const contextLabel = context.object?.id
    ? `${context.workbench?.label || context.title} · ${context.object.label || "业务对象"}`
    : context.title;
  if (contextNode) contextNode.textContent = contextLabel;
  if (routeNode) routeNode.textContent = context.displayRoute || context.hash;
  if (composerContext) composerContext.textContent = context.object?.id || context.workbench?.label || context.title;
  renderQuickIntents(context);
  const host = document.getElementById("miwa-ai-suggestion-grid");
  if (!host) return;
  host.replaceChildren(...capabilities.map((capability, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "miwa-ai-suggestion";
    button.dataset.miwaAiPrompt = suggestionPrompt(capability, context);
    button.dataset.miwaAiCapability = capability.code;
    button.dataset.miwaAiCapabilityLabel = capability.label;
    button.innerHTML = `<span class="miwa-ai-suggestion__icon">${String(index + 1).padStart(2,"0")}</span><span class="miwa-ai-suggestion__copy"><strong>${capability.label}</strong><span>${capability.description}</span></span>`;
    return button;
  }));
}

function ensureAIClient() {
  if (aiClientInitialized) return true;
  try {
    initAISecretaryClient();
    aiClientInitialized = true;
    return true;
  } catch (error) {
    console.error("[美和AI] AI执行Client初始化失败：", error);
    const status = document.getElementById("ai-secretary-runtime-status");
    if (status) {
      status.textContent = "AI执行Client初始化失败｜界面仍可使用，请检查Backend/API配置";
      status.dataset.tone = "error";
    }
    return false;
  }
}

function publishPublicAPI() {
  window.MIWAAI = Object.freeze({ open:openLayer, close:closeLayer, toggleWorkspace, openOffice, getContext:getCurrentContext, init:initMiwaAILayer });
}

function ensureLayerInitialized() {
  const root = layer();
  if (!root) return false;
  if (!validateLayerDOM()) return false;
  renderContext();
  if (!routeListenerInstalled) {
    routeListenerInstalled = true;
    window.addEventListener("hashchange", renderContext);
  }
  initialized = true;
  root.dataset.miwaAiInitialized = "true";
  publishPublicAPI();
  return true;
}

function setOpenState(open) {
  const root = layer();
  if (!root) return false;
  root.hidden = !open;
  document.body.classList.toggle("miwa-ai-open", open);
  document.querySelectorAll(ENTRY_SELECTOR).forEach((button) => {
    button.classList.toggle("is-active", open);
    button.setAttribute("aria-expanded", String(open));
  });
  if (open) {
    if (!ensureLayerInitialized()) return false;
    ensureAIClient();
    root.dataset.ready = "true";
    requestAnimationFrame(() => root.querySelector(".miwa-ai-panel__body")?.scrollTo({ top:0 }));
    setTimeout(() => document.getElementById("ai-secretary-command-input")?.focus(), 20);
  } else if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus({ preventScroll:true });
  }
  return true;
}

function waitForLayerAndOpen(source) {
  pendingOpenSource = source;
  const host = document.getElementById("miwa-ai-layer-host");
  if (!host) {
    console.error("[美和AI] 独立Layer Host不存在，无法打开。", { source });
    return;
  }
  if (layerMountObserver) return;
  layerMountObserver = new MutationObserver(() => {
    if (!layer()) return;
    layerMountObserver?.disconnect();
    layerMountObserver = null;
    const nextSource = pendingOpenSource || source;
    pendingOpenSource = null;
    openLayer(nextSource);
  });
  layerMountObserver.observe(host, { childList:true, subtree:true });
  setTimeout(() => {
    if (!layerMountObserver) return;
    layerMountObserver.disconnect();
    layerMountObserver = null;
    console.error("[美和AI] 等待独立Layer组件超时。请确认组件是否加载成功。", { source });
  }, 2500);
}

function openLayer(source = "global-header") {
  lastFocusedElement = document.activeElement;
  const root = layer();
  if (!root) {
    waitForLayerAndOpen(source);
    return false;
  }

  // V1.9.9：打开动作绝不能被Context、推荐能力或AI Client初始化失败阻断。
  // 先保证用户看到独立Layer，再做增强初始化。
  root.hidden = false;
  root.dataset.mode = "drawer";
  root.dataset.hardOpen = root.dataset.hardOpen || "module";
  document.body.classList.add("miwa-ai-open");
  document.querySelectorAll(ENTRY_SELECTOR).forEach((button) => {
    button.classList.add("is-active");
    button.setAttribute("aria-expanded", "true");
  });

  // Hard Bridge已经把外壳打开；此处立即保证正文/Composer存在，再做AI增强。
  repairLayerStructure();

  let enhanced = false;
  try {
    enhanced = ensureLayerInitialized();
    if (enhanced) { ensureAIClient(); window.AIONEAISecretary?.refreshStatus?.(); }
  } catch (error) {
    console.error("[美和AI] 增强初始化失败；Layer保持打开。", error);
  }

  root.dataset.ready = enhanced ? "true" : "fallback";
  requestAnimationFrame(() => root.querySelector(".miwa-ai-panel__body")?.scrollTo({ top:0 }));
  setTimeout(() => document.getElementById("ai-secretary-command-input")?.focus(), 20);
  window.dispatchEvent(new CustomEvent("aione:miwa-ai-open", { detail:{ source, mode:"drawer", context:getCurrentContext(), enhanced } }));
  return true;
}

function closeLayer() {
  const root = layer();
  if (!root || root.hidden) return false;
  setOpenState(false);
  window.dispatchEvent(new CustomEvent("aione:miwa-ai-close", { detail:{ context:getCurrentContext() } }));
  return true;
}

function toggleWorkspace() {
  const root = layer();
  if (!root) return;
  const workspace = root.dataset.mode !== "workspace";
  root.dataset.mode = workspace ? "workspace" : "drawer";
  const button = document.getElementById("miwa-ai-expand");
  if (button) {
    button.title = workspace ? "收回美和AI快捷层" : "展开AI工作区";
    button.setAttribute("aria-label", button.title);
  }
  window.dispatchEvent(new CustomEvent("aione:miwa-ai-mode-change", { detail:{ mode:root.dataset.mode, context:getCurrentContext() } }));
}

function openOffice() {
  closeLayer();
  window.location.hash = "#/ai-office";
}

function handleDelegatedClick(event) {
  const entry = event.target.closest?.(ENTRY_SELECTOR);
  if (entry) {
    event.preventDefault();
    openLayer(entry.id.startsWith("mobile") ? "mobile-header" : "desktop-header");
    return;
  }
  const actionTarget = event.target.closest?.("[data-miwa-ai-action]");
  const action = actionTarget?.dataset.miwaAiAction;
  if (action === "close") { event.preventDefault(); closeLayer(); return; }
  if (action === "toggle-workspace") { event.preventDefault(); toggleWorkspace(); return; }
  if (action === "open-office") { event.preventDefault(); openOffice(); return; }
  const suggestion = event.target.closest?.("[data-miwa-ai-prompt]");
  if (suggestion) {
    event.preventDefault();
    ensureLayerInitialized();
    ensureAIClient();
    const prompt = suggestion.dataset.miwaAiPrompt || suggestion.textContent.trim();
    const capabilityCode = suggestion.dataset.miwaAiCapability || null;
    const capabilityLabel = suggestion.dataset.miwaAiCapabilityLabel || null;
    const input = document.getElementById("ai-secretary-command-input");
    if (input) input.value = prompt;
    window.AIONEAISecretary?.sendCommand(prompt, { capabilityCode, capabilityLabel });
    return;
  }
  const tool = event.target.closest?.("[data-miwa-ai-tool]");
  if (tool) {
    event.preventDefault();
    const status = document.getElementById("ai-secretary-runtime-status");
    if (status) {
      status.textContent = "添加入口已预留；业务能力由美和AI自动匹配。";
      status.dataset.tone = "preview";
    }
  }
}

function installGlobalEntryBridge() {
  if (globalBridgeInstalled) return;
  globalBridgeInstalled = true;
  document.addEventListener("click", handleDelegatedClick, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !layer()?.hidden) {
      event.preventDefault();
      closeLayer();
    }
  });
  publishPublicAPI();
}

export function initMiwaAILayer() {
  installGlobalEntryBridge();
  if (initialized && layer()) {
    renderContext();
    return true;
  }
  return ensureLayerInitialized();
}

// 模块加载即安装入口桥：不依赖Header首次绑定或其他Shell模块初始化顺序。
installGlobalEntryBridge();

/* ============================================================
   V1.9.22 AI COMPOSER AUTO RESIZE
   ============================================================ */
const AIONE_AI_COMPOSER_MIN_HEIGHT = 72;
const AIONE_AI_COMPOSER_MAX_HEIGHT = 160;

function resizeAioneAiComposerInput(input) {
  if (!(input instanceof HTMLTextAreaElement)) return;

  input.style.height = "auto";

  const contentHeight = input.scrollHeight;
  const nextHeight = Math.min(
    Math.max(contentHeight, AIONE_AI_COMPOSER_MIN_HEIGHT),
    AIONE_AI_COMPOSER_MAX_HEIGHT
  );

  input.style.height = `${nextHeight}px`;
  input.style.overflowY =
    contentHeight > AIONE_AI_COMPOSER_MAX_HEIGHT ? "auto" : "hidden";
}

document.addEventListener("input", (event) => {
  const input = event.target;

  if (input?.id === "ai-secretary-command-input") {
    resizeAioneAiComposerInput(input);
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest?.("#ai-secretary-send")) return;

  setTimeout(() => {
    const input = document.getElementById("ai-secretary-command-input");
    if (input) resizeAioneAiComposerInput(input);
  }, 0);
});

/* V1.9.22 AI COMPOSER AUTO RESIZE END */