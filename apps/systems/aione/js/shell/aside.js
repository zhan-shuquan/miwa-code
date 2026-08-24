/* ========================================
   MIWA Contextual Aside｜当前上下文辅助区
   不承载AI核心能力；只展示当前对象、关键状态、风险、关联信息与必要说明。
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

function inferState(payload = {}) {
  if (STATES.has(payload.state)) return payload.state;
  const items = normalizeItems(payload.items);
  if (!payload.title && !payload.summary && !payload.text && items.length === 0) return "hidden";
  return items.length > 0 ? "standard" : "light";
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

export function initAside(config = {}) {
  const appBody = document.querySelector(".app-body");
  const kicker = document.getElementById("aside-kicker");
  const title = document.getElementById("aside-title");
  const summary = document.getElementById("aside-summary");
  const itemsHost = document.getElementById("aside-items");

  const apply = (payload = {}) => {
    const merged = { ...config, ...payload };
    const state = inferState(merged);
    const items = normalizeItems(merged.items);

    if (appBody) appBody.dataset.asideState = state;
    if (kicker) kicker.textContent = merged.kicker || "当前上下文";
    if (title) title.textContent = merged.title || "当前页面";
    if (summary) summary.textContent = merged.summary || merged.text || merged.content || "";
    renderItems(itemsHost, items);
  };

  apply(config);
  window.addEventListener("aione:page-aside-context", (event) => apply(event.detail || {}));
  window.AIONEContextAside = Object.freeze({ setContext: apply });
}
