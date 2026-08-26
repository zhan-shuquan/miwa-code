/* =========================================================
   AIONE Content Publication Master V1.0 | V1.9.31.2
   Shared behavior for content/recognition pages.
   ========================================================= */

const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));

export function setPublicationPageMode(enabled = true) {
  const value = enabled ? "publication" : "application";
  document.body.dataset.pageMode = value;
  const appBody = document.querySelector(".app-body");
  if (appBody) appBody.dataset.pageMode = value;
}

export function publicationToolbar({ title = "内容资料", meta = "A4横向｜出版模式" } = {}) {
  return `<div class="miwa-publication-toolbar" data-publication-toolbar>
    <div class="miwa-publication-toolbar__meta"><strong>${esc(title)}</strong><span>${esc(meta)}</span></div>
    <div class="miwa-publication-toolbar__actions">
      <button type="button" class="miwa-publication-export miwa-publication-export--secondary" data-publication-print>打印</button>
      <button type="button" class="miwa-publication-export" data-publication-pdf>导出PDF</button>
    </div>
  </div>`;
}

function startPrint() {
  window.requestAnimationFrame(() => window.print());
}

export function bindPublicationActions(root = document) {
  root.querySelectorAll("[data-publication-print],[data-publication-pdf]").forEach((button) => {
    if (button.dataset.publicationBound === "true") return;
    button.dataset.publicationBound = "true";
    button.addEventListener("click", startPrint);
  });
}
