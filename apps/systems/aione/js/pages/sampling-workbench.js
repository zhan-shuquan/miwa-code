import { getPreviewOpportunities } from "../data/preview-opportunities.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openSamplingRecord(recordId) {
  window.location.hash = `/sampling/opportunity/${encodeURIComponent(recordId)}?mode=edit`;
}

export function initSamplingWorkbench() {
  const host = document.getElementById("sampling-opportunity-list");
  const count = document.getElementById("sampling-opportunity-count");
  if (!host) return;

  const opportunities = getPreviewOpportunities();
  if (count) count.textContent = `${opportunities.length} 件`;

  host.innerHTML = opportunities.map((item) => `
    <article class="sampling-opportunity-card">
      <div class="sampling-opportunity-card__copy">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.id)} · ${escapeHtml(item.stageName || "商品机会")}</span>
        <small>${escapeHtml(item.info || "等待进入测样验证")}</small>
      </div>
      <button type="button" data-sampling-record="${escapeHtml(item.id)}">进入测样</button>
    </article>
  `).join("");

  host.querySelectorAll("[data-sampling-record]").forEach((button) => {
    button.addEventListener("click", () => openSamplingRecord(button.dataset.samplingRecord));
  });
}
