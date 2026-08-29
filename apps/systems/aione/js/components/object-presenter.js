/* ========================================
   Object Presenter｜标准对象卡片与列表唯一渲染组件
   支持标准卡片与Rich Media卡片；页面只传字段/数据/动作配置。
======================================== */
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

function valueOf(field, item) {
  if (typeof field.value === "function") return field.value(item);
  return item?.[field.key];
}
function htmlOf(field, item) {
  if (typeof field.renderHtml === "function") return field.renderHtml(item);
  return esc(valueOf(field, item) ?? "—");
}
function actionHtml(action, item) {
  if (action.visible && !action.visible(item)) return "";
  const label = typeof action.label === "function" ? action.label(item) : action.label;
  const href = typeof action.href === "function" ? action.href(item) : action.href;
  if (href) return `<a href="${esc(href)}" ${action.external ? 'target="_blank" rel="noopener noreferrer"' : ""}>${esc(label || "打开")}</a>`;
  return `<button type="button" data-object-action="${esc(action.key || "action")}" data-object-id="${esc(item.id || "")}">${esc(label || "操作")}</button>`;
}
function visualHtml(item, options, title) {
  const image = options.image?.(item) || item.image || item.imageUrl || item.representativeImage?.url || "";
  if (image) return `<img src="${esc(image)}" alt="${esc(title)}" loading="lazy">`;
  const visual = options.visual?.(item) ?? String(title).slice(0, 2);
  return String(visual ?? "");
}

function renderRichCard(item, options = {}) {
  const fields = Array.isArray(options.fields) ? options.fields : [];
  const metaFields = Array.isArray(options.metaFields) ? options.metaFields : [];
  const actions = Array.isArray(options.actions) ? options.actions : [];
  const title = options.title?.(item) ?? item.name ?? item.title ?? "未命名";
  const type = options.type?.(item) ?? item.type ?? options.objectName ?? "对象";
  const state = options.state?.(item) ?? item.state ?? item.status ?? "待确认";
  const goal = options.goal?.(item) || "";
  const result = options.result?.(item) || null;
  return `<article class="miwa-object-card miwa-object-card--rich-media${options.focusId && String(options.focusId) === String(item.id) ? " is-focused" : ""}" data-object-id="${esc(item.id || "")}">
    <header class="miwa-object-card__rich-head"><h3 title="${esc(title)}">${esc(title)}</h3><span class="miwa-object-card__state">${esc(state)}</span></header>
    <div class="miwa-object-card__rich-identity">
      <div class="miwa-object-card__rich-visual">${visualHtml(item, options, title)}</div>
      <div class="miwa-object-card__rich-meta">
        <span class="miwa-object-card__type">${esc(type)}</span>
        ${metaFields.map((field) => `<div><span>${esc(field.label || "")}</span><strong title="${esc(valueOf(field, item) ?? "")}">${esc(valueOf(field, item) ?? "—")}</strong></div>`).join("")}
      </div>
    </div>
    ${goal ? `<div class="miwa-object-card__goal"><strong>目标：</strong><span>${esc(goal)}</span></div>` : ""}
    ${fields.length ? `<div class="miwa-object-card__facts">${fields.map((field) => `<div><span>${esc(field.label)}</span><strong title="${esc(valueOf(field, item) ?? "")}">${esc(valueOf(field, item) ?? "—")}</strong></div>`).join("")}</div>` : ""}
    ${result ? `<div class="miwa-object-card__result is-${esc(result.tone || "neutral")}"><span>${esc(result.label || "待形成")}</span>${result.reason ? `<p><strong>判断依据：</strong>${esc(result.reason)}</p>` : ""}</div>` : ""}
    ${actions.length ? `<footer>${actions.map((action) => actionHtml(action, item)).join("")}</footer>` : ""}
  </article>`;
}

function standardCardHtml(item, options = {}) {
  const fields = Array.isArray(options.fields) ? options.fields : [];
  const actions = Array.isArray(options.actions) ? options.actions : [];
  const title = options.title?.(item) ?? item.name ?? item.title ?? "未命名";
  const type = options.type?.(item) ?? item.type ?? options.objectName ?? "对象";
  const state = options.state?.(item) ?? item.state ?? item.status ?? "待确认";
  const summary = options.summary?.(item) || "";
  return `<article class="miwa-object-card${options.focusId && String(options.focusId) === String(item.id) ? " is-focused" : ""}" data-object-id="${esc(item.id || "")}">
    <header><div class="miwa-object-card__identity"><span class="miwa-object-card__visual">${visualHtml(item, options, title)}</span><div><span class="miwa-object-card__type">${esc(type)}</span><h3>${esc(title)}</h3></div></div><span class="miwa-object-card__state">${esc(state)}</span></header>
    ${fields.length ? `<div class="miwa-object-card__facts">${fields.map((field) => `<div><span>${esc(field.label)}</span><strong title="${esc(valueOf(field, item) ?? "")}">${esc(valueOf(field, item) ?? "—")}</strong></div>`).join("")}</div>` : ""}
    ${summary ? `<p class="miwa-object-card__summary">${esc(summary)}</p>` : ""}
    ${actions.length ? `<footer>${actions.map((action) => actionHtml(action, item)).join("")}</footer>` : ""}
  </article>`;
}

export function renderObjectCards(host, items = [], options = {}) {
  if (!host) return;
  const groups = Array.isArray(options.groups) && options.groups.length ? options.groups : null;
  const renderCard = (item) => options.variant === "rich-media" ? renderRichCard(item, options) : standardCardHtml(item, options);
  if (groups) {
    host.innerHTML = groups.map((group) => `<div class="miwa-object-group-heading"><strong>${esc(group.label || "未分组")}</strong><span>${Number(group.items?.length || 0)}</span></div>${(group.items || []).map(renderCard).join("")}`).join("");
    return;
  }
  host.innerHTML = items.map(renderCard).join("");
}

export function renderObjectList(head, body, items = [], options = {}) {
  if (!head || !body) return;
  const fields = Array.isArray(options.fields) ? options.fields : [];
  const actions = Array.isArray(options.actions) ? options.actions : [];
  const columnCount = fields.length + (actions.length ? 1 : 0);
  const rowHtml = (item) => `<tr data-object-id="${esc(item.id || "")}" class="${esc(options.rowClass?.(item) || "")}">${fields.map((field) => `<td class="${esc(field.className || "")}">${htmlOf(field, item)}</td>`).join("")}${actions.length ? `<td>${actions.map((action) => actionHtml(action, item)).join("")}</td>` : ""}</tr>`;
  head.innerHTML = `<tr>${fields.map((field) => `<th>${esc(field.label)}</th>`).join("")}${actions.length ? "<th>操作</th>" : ""}</tr>`;
  const groups = Array.isArray(options.groups) && options.groups.length ? options.groups : null;
  body.innerHTML = groups
    ? groups.map((group) => `<tr class="miwa-object-group-row"><td colspan="${columnCount}"><strong>${esc(group.label || "未分组")}</strong><span>${Number(group.items?.length || 0)}</span></td></tr>${(group.items || []).map(rowHtml).join("")}`).join("")
    : items.map(rowHtml).join("");
}
