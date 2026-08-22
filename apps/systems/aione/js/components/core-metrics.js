/* ========================================
   Core Metrics｜核心指标统一组件
======================================== */
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

export function renderCoreMetrics(host, items = [], options = {}) {
  if (!host) return;
  const rows = Array.isArray(items) ? items : [];
  host.classList.add("miwa-horizontal-rail");
  host.dataset.visible = String(Math.min(options.maxVisible || 6, Math.max(1, rows.length || 1)));
  host.innerHTML = rows.map((item) => `<article class="miwa-core-metric"><span>${esc(item.label)}</span><strong>${esc(item.value)}</strong></article>`).join("");
}
