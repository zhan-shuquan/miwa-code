/* ========================================
   MIWA Contextual Aside｜当前上下文辅助区
   不承载AI核心能力；只展示当前对象、关键状态、风险、关联信息与必要说明。
   V1.9.31.3: supports low-density contextual page actions in lower zone.
======================================== */

const STATES = new Set(["hidden", "light", "standard"]);

function normalizeItems(items = []) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 4).map((item) => ({
    label: String(item?.label || item?.title || "关联信息"),
    value: String(item?.value || item?.text || item?.summary || ""),
    detail: String(item?.detail || ""),
    tone: item?.tone === "risk" ? "risk" : "neutral",
    route: item?.route ? String(item.route) : ""
  })).filter((item) => item.value || item.detail);
}

function normalizeActions(actions = []) {
  if (!Array.isArray(actions)) return [];
  return actions.slice(0, 3).map((action) => ({
    label: String(action?.label || "操作"),
    event: action?.event ? String(action.event) : "",
    route: action?.route ? String(action.route) : "",
    tone: action?.tone === "primary" ? "primary" : "secondary"
  })).filter((action) => action.event || action.route);
}

function inferState(payload = {}) {
  if (STATES.has(payload.state)) return payload.state;
  const items = normalizeItems(payload.items);
  const actions = normalizeActions(payload.actions);
  if (!payload.title && !payload.summary && !payload.text && items.length === 0 && actions.length === 0) return "hidden";
  return items.length > 0 || actions.length > 0 ? "standard" : "light";
}

function renderItems(host, items) {
  if (!host) return;
  host.replaceChildren();
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "context-aside-item";
    card.dataset.tone = item.tone;

    const label = document.createElement("span");
    label.className = "context-aside-item__label";
    label.textContent = item.label;
    card.append(label);

    if (item.value) {
      const value = document.createElement("strong");
      value.textContent = item.value;
      card.append(value);
    }

    if (item.detail) {
      const detail = document.createElement("p");
      detail.textContent = item.detail;
      card.append(detail);
    }

    if (item.route) {
      const link = document.createElement("a");
      link.href = item.route.startsWith("#/") ? item.route : `#/${item.route}`;
      link.textContent = "查看 →";
      card.append(link);
    }

    host.append(card);
  });
}

function renderActions(host, actions) {
  if (!host) return;
  host.replaceChildren();
  host.hidden = actions.length === 0;
  actions.forEach((action) => {
    const control = action.route ? document.createElement("a") : document.createElement("button");
    control.className = "context-aside-action";
    control.dataset.tone = action.tone;
    control.textContent = action.label;
    if (action.route) {
      control.href = action.route.startsWith("#/") ? action.route : `#/${action.route}`;
    } else {
      control.type = "button";
      control.addEventListener("click", () => window.dispatchEvent(new CustomEvent(action.event)));
    }
    host.append(control);
  });
}

export function initAside(config = {}) {
  const appBody = document.querySelector(".app-body");
  const kicker = document.getElementById("aside-kicker");
  const title = document.getElementById("aside-title");
  const summary = document.getElementById("aside-summary");
  const itemsHost = document.getElementById("aside-items");
  const actionsHost = document.getElementById("aside-actions");

  const apply = (payload = {}) => {
    const merged = { ...config, ...payload };
    const state = inferState(merged);
    const items = normalizeItems(merged.items);
    const actions = normalizeActions(merged.actions);

    if (appBody) appBody.dataset.asideState = state;
    if (kicker) kicker.textContent = merged.kicker || "当前上下文";
    if (title) title.textContent = merged.title || "当前页面";
    if (summary) summary.textContent = merged.summary || merged.text || merged.content || "";
    renderItems(itemsHost, items);
    renderActions(actionsHost, actions);
  };

  apply(config);
  window.addEventListener("aione:page-aside-context", (event) => apply(event.detail || {}));
  window.AIONEContextAside = Object.freeze({ setContext: apply });
}
