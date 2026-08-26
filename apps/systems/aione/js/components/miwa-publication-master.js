/* =========================================================
   AIONE Digital Publication Master V1.1 | V1.9.31.3
   Scope: content / recognition pages only.
   Model: space = book, level-1 directory = chapter, level-2 = section,
   content = page, odd chapter remainder = chapter summary.
   正式规则：空间即书，目录即章，子目录即节，内容即页，奇数余页优先用于章总结。
   ========================================================= */

const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
const MOBILE_TOOLS_ID = "miwa-publication-mobile-tools";
let eventsBound = false;

export const MIWA_PUBLICATION_META = Object.freeze({
  series: "美和集团经营管理系列",
  seriesEn: "MIWA GROUP MANAGEMENT SERIES",
  platform: "美和AIONE一体化工作平台",
  version: "V1.0"
});

function removeMobileTools() {
  document.getElementById(MOBILE_TOOLS_ID)?.remove();
}

function ensureMobileTools() {
  if (document.getElementById(MOBILE_TOOLS_ID)) return;
  const host = document.createElement("div");
  host.id = MOBILE_TOOLS_ID;
  host.className = "miwa-publication-mobile-tools";
  host.innerHTML = `
    <button type="button" data-publication-print>打印</button>
    <button type="button" class="is-primary" data-publication-pdf>导出PDF</button>
  `;
  document.body.append(host);
}

export function setPublicationPageMode(enabled = true) {
  const value = enabled ? "publication" : "application";
  document.body.dataset.pageMode = value;
  const appBody = document.querySelector(".app-body");
  if (appBody) appBody.dataset.pageMode = value;
  if (enabled) ensureMobileTools();
  else removeMobileTools();
}

// Legacy compatibility only. New publication pages keep actions out of Main.
export function publicationToolbar() {
  return "";
}

function startPrint() {
  window.requestAnimationFrame(() => window.print());
}

function bindGlobalPublicationEvents() {
  if (eventsBound) return;
  eventsBound = true;
  window.addEventListener("aione:publication:print", startPrint);
  window.addEventListener("aione:publication:pdf", startPrint);
}

export function bindPublicationActions(root = document) {
  bindGlobalPublicationEvents();
  const scope = root === document ? document : root;
  scope.querySelectorAll("[data-publication-print],[data-publication-pdf]").forEach((button) => {
    if (button.dataset.publicationBound === "true") return;
    button.dataset.publicationBound = "true";
    button.addEventListener("click", startPrint);
  });
  document.querySelectorAll(`#${MOBILE_TOOLS_ID} [data-publication-print],#${MOBILE_TOOLS_ID} [data-publication-pdf]`).forEach((button) => {
    if (button.dataset.publicationBound === "true") return;
    button.dataset.publicationBound = "true";
    button.addEventListener("click", startPrint);
  });
}

export function configurePublicationAside({
  kicker = "出版资料",
  title = "当前内容",
  summary = "按书籍结构阅读；屏幕双页展开，PDF按A4纵向单页输出。",
  bookTitle = "内容资料",
  chapter = "概览",
  version = MIWA_PUBLICATION_META.version,
  date = "2026.08"
} = {}) {
  window.dispatchEvent(new CustomEvent("aione:page-aside-context", { detail: {
    state: "standard",
    kicker,
    title,
    text: summary,
    items: [
      { label: "当前书册", value: bookTitle, detail: `${chapter}｜${version}｜${date}` }
    ],
    actions: [
      { label: "打印", event: "aione:publication:print", tone: "secondary" },
      { label: "导出 PDF", event: "aione:publication:pdf", tone: "primary" }
    ]
  }}));
}

export function publicationCover({
  title,
  englishTitle = "",
  eyebrow = MIWA_PUBLICATION_META.seriesEn,
  series = MIWA_PUBLICATION_META.series,
  subtitle = "",
  statement = "",
  bookLabel = "内容资料",
  version = MIWA_PUBLICATION_META.version,
  date = "2026.08",
  visualHtml = "",
  pageNumber = 1
} = {}) {
  return `<section class="miwa-publication-page miwa-publication-page--cover" data-book-page data-page-number="${pageNumber}" data-page-side="single">
    <div class="miwa-publication-cover__brand"><span>${esc(series)}</span><b>${esc(eyebrow)}</b></div>
    <div class="miwa-publication-cover__copy">
      <span class="miwa-publication-cover__kicker">${esc(bookLabel)}</span>
      <h1>${esc(title)}</h1>
      ${englishTitle ? `<div class="miwa-publication-cover__english">${esc(englishTitle)}</div>` : ""}
      ${subtitle ? `<p>${esc(subtitle)}</p>` : ""}
      ${statement ? `<div class="miwa-publication-cover__statement">${esc(statement)}</div>` : ""}
    </div>
    <div class="miwa-publication-cover__visual ${visualHtml ? "has-visual" : "is-empty"}" data-publication-icon-slot>
      ${visualHtml || `<span class="miwa-publication-cover__visual-placeholder">MIWA</span>`}
    </div>
    <div class="miwa-publication-cover__footer"><span>${esc(MIWA_PUBLICATION_META.platform)}｜${esc(bookLabel)}</span><b>${esc(version)}｜${esc(date)}</b></div>
  </section>`;
}

export function publicationPage({
  pageNumber,
  section = "",
  title = "",
  lead = "",
  content = "",
  conclusion = "",
  bookLabel = "内容资料",
  version = MIWA_PUBLICATION_META.version,
  side = "auto",
  className = ""
} = {}) {
  const resolvedSide = side === "auto" ? (Number(pageNumber) % 2 === 0 ? "left" : "right") : side;
  return `<section class="miwa-publication-page miwa-publication-page--content ${className}" data-book-page data-page-number="${pageNumber}" data-page-side="${esc(resolvedSide)}">
    <div class="miwa-publication-page__topline"><span>${esc(section)}</span><b>${String(pageNumber).padStart(2, "0")}</b></div>
    ${title ? `<h2>${esc(title)}</h2>` : ""}
    ${lead ? `<p class="miwa-publication-page__lead">${esc(lead)}</p>` : ""}
    <div class="miwa-publication-page__body">${content}</div>
    ${conclusion ? `<div class="miwa-publication-page__conclusion">${esc(conclusion)}</div>` : ""}
    <div class="miwa-publication-page__footer"><span>${esc(MIWA_PUBLICATION_META.series)}｜${esc(bookLabel)} ${esc(version)}</span><b>${String(pageNumber).padStart(2, "0")}</b></div>
  </section>`;
}

export function publicationChapterSummary({
  pageNumber,
  chapter = "本章总结",
  title = "这一章，需要记住什么",
  points = [],
  next = "",
  bookLabel = "内容资料",
  version = MIWA_PUBLICATION_META.version
} = {}) {
  const pointHtml = points.slice(0, 5).map((item, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><p>${esc(item)}</p></article>`).join("");
  const content = `<div class="miwa-publication-summary-list">${pointHtml}</div>${next ? `<div class="miwa-publication-summary-next"><span>下一章</span><strong>${esc(next)}</strong></div>` : ""}`;
  return publicationPage({ pageNumber, section: chapter, title, content, bookLabel, version, className: "miwa-publication-page--summary" });
}

export function publicationSpread(leftPage, rightPage, label = "") {
  return `<div class="miwa-publication-spread" data-publication-spread${label ? ` data-spread-label="${esc(label)}"` : ""}>${leftPage}${rightPage}</div>`;
}

export function publicationSingle(pageHtml) {
  return `<div class="miwa-publication-single" data-publication-single>${pageHtml}</div>`;
}

export function validatePublicationPages(root = document) {
  window.requestAnimationFrame(() => {
    root.querySelectorAll(".miwa-publication-page[data-book-page]").forEach((page) => {
      const overflow = page.scrollHeight > page.clientHeight + 2;
      page.dataset.pageOverflow = overflow ? "true" : "false";
      if (overflow && window.matchMedia("(min-width:1100px)").matches) {
        console.warn(`[AIONE出版母版] 第${page.dataset.pageNumber || "?"}页内容超出书页高度。`);
      }
    });
  });
}
