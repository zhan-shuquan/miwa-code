/* ========================================
   Type Rail｜统一类型/分类横向组件
   页面只提供类型数据与动作配置，不复制卡片结构。
======================================== */
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

function resolve(value, item) {
  return typeof value === "function" ? value(item) : value;
}

export function renderTypeRail(host, items = [], options = {}) {
  if (!host) return;
  const rows = Array.isArray(items) ? items : [];
  const actions = Array.isArray(options.actions) ? options.actions : [];
  host.classList.add("miwa-horizontal-rail");
  host.dataset.visible = String(Math.min(Number(options.maxVisible || 3), Math.max(1, rows.length || 1)));
  host.innerHTML = rows.map((item, index) => {
    const key = String(item.key ?? item.value ?? item.label ?? "");
    const label = String(item.label ?? key);
    const description = String(item.description ?? "");
    const count = item.count ?? 0;
    const active = Boolean(item.active);
    const priority = item.priority ?? index < Number(options.priorityCount ?? 3);
    const itemActions = actions.filter((action) => !action.visible || resolve(action.visible, item));
    return `<article class="miwa-business-type-card${priority ? " is-priority" : ""}${active ? " is-active" : ""}" data-type-card="${esc(key)}">
      <button type="button" class="miwa-business-type-card__summary" data-type-rail-select="${esc(key)}" aria-pressed="${active ? "true" : "false"}">
        <span><strong>${esc(label)}</strong><small>${esc(description)}</small></span><b>${esc(count)}</b>
      </button>
      ${itemActions.length ? `<div class="miwa-business-type-card__actions">${itemActions.map((action) => {
        const disabled = Boolean(resolve(action.disabled, item));
        const actionLabel = resolve(action.label, item) || "操作";
        return `<button type="button" data-type-rail-action="${esc(action.key || "action")}" data-type-rail-key="${esc(key)}" ${disabled ? 'disabled aria-disabled="true"' : ""}>${esc(actionLabel)}</button>`;
      }).join("")}</div>` : ""}
    </article>`;
  }).join("");
}
