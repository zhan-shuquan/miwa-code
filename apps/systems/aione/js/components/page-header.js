/* ========================================
   Page Header｜二级页面统一页头组件
======================================== */
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

export function renderPageHeader(host, options = {}) {
  if (!host) return null;
  const actions = Array.isArray(options.actions) ? options.actions : [];
  host.innerHTML = `
    <section class="miwa-level2-head" aria-labelledby="${esc(options.titleId || "miwa-level2-page-title")}">
      <div class="miwa-level2-head__identity">
        <span class="miwa-level2-head__icon" aria-hidden="true">${esc(options.icon || "美")}</span>
        <div>
          <h1 id="${esc(options.titleId || "miwa-level2-page-title")}">${esc(options.title || "二级页面")}</h1>
          <p>${esc(options.description || "")}</p>
        </div>
      </div>
      <div class="miwa-level2-head__actions">
        ${actions.map((action) => {
          if (action.href) return `<a class="miwa-level2-head__button${action.primary ? " is-primary" : ""}" href="${esc(action.href)}" data-page-action="${esc(action.key || "")}">${esc(action.label || "操作")}</a>`;
          return `<button type="button" class="miwa-level2-head__button${action.primary ? " is-primary" : ""}" data-page-action="${esc(action.key || "")}" ${action.disabled ? 'disabled aria-disabled="true"' : ""}>${esc(action.label || "操作")}</button>`;
        }).join("")}
      </div>
    </section>`;
  return host.firstElementChild;
}
