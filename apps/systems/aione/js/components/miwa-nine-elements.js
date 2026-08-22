import { MIWA_NINE_ELEMENTS } from "../config/business-page-definitions.js";

/* ========================================
   MIWA 9 Elements｜美和9要素唯一组件
   固定顺序：目标｜人｜物｜事｜平台｜时间｜钱｜信息｜结果
   组件顺序不可按页面改变；解释与分析顺序可以灵活。
======================================== */
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

function knowledgeRoute(focus, anchor = "") {
  const query = new URLSearchParams();
  if (focus) query.set("focus", focus);
  if (anchor) query.set("anchor", anchor);
  return `#/knowledge-home?${query.toString()}`;
}

export function renderMiwaNineElements(host, options = {}) {
  if (!host) return;
  const context = options.context || "当前页面";
  host.classList.add("miwa-nine-elements");
  host.innerHTML = `
    <div class="miwa-nine-elements__head">
      <div>
        <div class="miwa-nine-elements__title-line">
          <h2>美和9要素</h2>
          <a class="miwa-nine-elements__method" href="${esc(knowledgeRoute("KNOW-MIWA-METHODOLOGY"))}" title="进入知识之家查看美和方法论">美和方法论</a>
        </div>
        <p>用于检查${esc(context)}是否具备完整经营依据，并逐步连接真实的时间、钱、事与结果数据。</p>
      </div>
      <span class="miwa-nine-elements__score">9 / 9</span>
    </div>
    <div class="miwa-nine-elements__grid">
      ${MIWA_NINE_ELEMENTS.map((item) => `<a href="${esc(knowledgeRoute("KNOW-MIWA-9", item.key))}" data-element="${esc(item.label)}" data-element-key="${esc(item.key)}" title="${esc(item.question)}">${esc(item.label)}</a>`).join("")}
    </div>`;
}
