/* ========================================
   Level-2 Block｜二级页面标准区块容器
   未调用不生成DOM；可选Rail按钮、状态、数量。
======================================== */
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

export function createLevel2Block(parent, options = {}) {
  if (!parent || options.enabled === false) return null;
  const section = document.createElement("section");
  section.className = `miwa-level2-block${options.className ? ` ${options.className}` : ""}`;
  if (options.id) section.id = options.id;

  const headingId = options.headingId || `${options.id || `miwa-block-${Date.now()}`}-title`;
  const accessory = options.count !== undefined
    ? `<span class="miwa-level2-count" data-block-count>${esc(options.count)}</span>`
    : options.status
      ? `<span class="miwa-level2-status${options.locked ? " is-locked" : ""}">${esc(options.status)}</span>`
      : options.railTarget
        ? `<div class="miwa-rail-actions" aria-label="左右滚动"><button type="button" data-rail-scroll="prev" data-rail-target="${esc(options.railTarget)}" aria-label="向左">‹</button><button type="button" data-rail-scroll="next" data-rail-target="${esc(options.railTarget)}" aria-label="向右">›</button></div>`
        : "";

  section.innerHTML = `
    <div class="miwa-level2-block__head">
      <div><h2 id="${esc(headingId)}">${esc(options.title || "")}</h2>${options.description ? `<p>${esc(options.description)}</p>` : ""}</div>
      ${accessory}
    </div>
    <div class="${esc(options.bodyClass || "miwa-level2-block__body")}" ${options.bodyId ? `id="${esc(options.bodyId)}"` : ""} data-block-body></div>`;
  section.setAttribute("aria-labelledby", headingId);
  parent.appendChild(section);
  return { section, body: section.querySelector("[data-block-body]"), count: section.querySelector("[data-block-count]") };
}
