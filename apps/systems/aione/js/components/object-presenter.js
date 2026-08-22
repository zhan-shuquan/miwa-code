/* ========================================
   Object Presenter｜标准对象卡片与列表唯一渲染组件
======================================== */
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

function valueOf(field, item) {
  if (typeof field.value === "function") return field.value(item);
  return item?.[field.key];
}
function actionHtml(action, item) {
  if (action.visible && !action.visible(item)) return "";
  const label = typeof action.label === "function" ? action.label(item) : action.label;
  const href = typeof action.href === "function" ? action.href(item) : action.href;
  if (href) return `<a href="${esc(href)}" ${action.external ? 'target="_blank" rel="noopener noreferrer"' : ""}>${esc(label || "打开")}</a>`;
  return `<button type="button" data-object-action="${esc(action.key || "action")}" data-object-id="${esc(item.id || "")}">${esc(label || "操作")}</button>`;
}

export function renderObjectCards(host, items = [], options = {}) {
  if (!host) return;
  const fields = Array.isArray(options.fields) ? options.fields : [];
  const actions = Array.isArray(options.actions) ? options.actions : [];
  host.innerHTML = items.map((item) => {
    const title = options.title?.(item) ?? item.name ?? item.title ?? "未命名";
    const type = options.type?.(item) ?? item.type ?? options.objectName ?? "对象";
    const state = options.state?.(item) ?? item.state ?? item.status ?? "待确认";
    const visual = options.visual?.(item) ?? String(title).slice(0, 2);
    const summary = options.summary?.(item) || "";
    return `<article class="miwa-object-card${options.focusId && String(options.focusId) === String(item.id) ? " is-focused" : ""}" data-object-id="${esc(item.id || "")}">
      <header><div class="miwa-object-card__identity"><span class="miwa-object-card__visual">${visual}</span><div><span class="miwa-object-card__type">${esc(type)}</span><h3>${esc(title)}</h3></div></div><span class="miwa-object-card__state">${esc(state)}</span></header>
      ${fields.length ? `<div class="miwa-object-card__facts">${fields.map((field) => `<div><span>${esc(field.label)}</span><strong title="${esc(valueOf(field, item) ?? "")}">${esc(valueOf(field, item) ?? "—")}</strong></div>`).join("")}</div>` : ""}
      ${summary ? `<p class="miwa-object-card__summary">${esc(summary)}</p>` : ""}
      ${actions.length ? `<footer>${actions.map((action) => actionHtml(action, item)).join("")}</footer>` : ""}
    </article>`;
  }).join("");
}

export function renderObjectList(head, body, items = [], options = {}) {
  if (!head || !body) return;
  const fields = Array.isArray(options.fields) ? options.fields : [];
  const actions = Array.isArray(options.actions) ? options.actions : [];
  head.innerHTML = `<tr>${fields.map((field) => `<th>${esc(field.label)}</th>`).join("")}${actions.length ? "<th>操作</th>" : ""}</tr>`;
  body.innerHTML = items.map((item) => `<tr data-object-id="${esc(item.id || "")}">${fields.map((field) => `<td>${esc(valueOf(field, item) ?? "—")}</td>`).join("")}${actions.length ? `<td>${actions.map((action) => actionHtml(action, item)).join("")}</td>` : ""}</tr>`).join("");
}
