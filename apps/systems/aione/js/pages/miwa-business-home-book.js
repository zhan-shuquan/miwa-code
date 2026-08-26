/* ========================================
   MIWA Business Home | Strategic Book Main V1.9.31.1
   Content pages use an A4-landscape-like reading canvas.
   Business execution pages remain SaaS-oriented elsewhere.
======================================== */

import { getRouteId } from "../config/route-registry.js";
import { setCurrentBusinessSpace } from "../shell/platform-context.js";
import { initMiwaBusinessHome as initLegacyBusinessHome } from "./miwa-business-home.js?v=20260826-v1.9.31-business-home";
import {
  MIWA_BUSINESS_HOME_SUBTITLE,
  MIWA_BUSINESSES
} from "../data/miwa-business-home-content.js";

const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));

function bookFooter(pageNo) {
  return `<div class="miwa-business-book-footer"><span>\u4e8b\u4e1a\u4e4b\u5bb6\uff5c\u6218\u7565\u5185\u5bb9\u7248</span><b>${String(pageNo).padStart(2,"0")}</b></div>`;
}

function enterAction(item) {
  if (!item.spaceId) return "";
  return `<button type="button" class="miwa-business-book-action" data-business-enter="${esc(item.spaceId)}">\u8fdb\u5165\u4e8b\u4e1a</button>`;
}

function bookBusinessCard(item, index) {
  const flow = item.flow?.length ? `<p class="miwa-business-book-card__flow">${item.flow.slice(0, 4).map((step) => esc(step)).join(" / ")}${item.flow.length > 4 ? " / ..." : ""}</p>` : "";
  return `<article class="miwa-business-book-card" data-accent="${(index % 5) + 1}">
    <div class="miwa-business-book-card__meta"><span>${esc(item.tagline)}</span><b>${esc(item.stage)}</b></div>
    <h3>${esc(item.name)}</h3>
    <p>${esc(item.description)}</p>
    ${flow}
    <div class="miwa-business-book-card__actions"><a href="#/${esc(item.route)}">\u4e8b\u4e1a\u8bf4\u660e \u2192</a>${enterAction(item)}</div>
  </article>`;
}

function capabilityCard(index, title, text, links) {
  return `<article class="miwa-business-book-capability" data-accent="${index}">
    <h3>${title}</h3><p>${text}</p><div>${links.map(([label,route]) => `<a href="#/${route}">${label}</a>`).join("")}</div>
  </article>`;
}

function coverHtml() {
  return `<section class="miwa-business-cover miwa-business-print-page miwa-business-book-cover">
    <div class="miwa-business-cover__rule"></div>
    <div class="miwa-business-cover__copy">
      <span class="miwa-business-cover__eyebrow">MIWA GROUP BUSINESS</span>
      <h1>\u96c6\u56e2\u4e8b\u4e1a</h1>
      <p>${esc(MIWA_BUSINESS_HOME_SUBTITLE)}</p>
      <div class="miwa-business-cover__statement">\u771f\u5b9e\u4e1a\u52a1\u4f18\u5148 \u00b7 \u4e8b\u4e1a\u72ec\u7acb\u7ecf\u8425 \u00b7 \u96c6\u56e2\u80fd\u529b\u5171\u4eab \u00b7 \u4ebaAI\u534f\u540c</div>
    </div>
    <div class="miwa-business-cover__footer"><span>\u7f8e\u548cAIONE\u4e00\u4f53\u5316\u5de5\u4f5c\u5e73\u53f0\uff5c\u4e8b\u4e1a\u4e4b\u5bb6</span><b>2026.08</b></div>
  </section>`;
}

function overviewHtml() {
  const current = MIWA_BUSINESSES.filter((item) => item.category === "current");
  const restart = MIWA_BUSINESSES.filter((item) => item.category === "restart");
  const incubating = MIWA_BUSINESSES.filter((item) => item.category === "incubating");
  const core = [...current, ...restart];

  return `<article class="miwa-business-publication miwa-business-book">
    ${coverHtml()}

    <section class="miwa-business-sheet miwa-business-print-page miwa-business-book-page">
      <div class="miwa-business-book-topline"><span>01｜\u4e3a\u4ec0\u4e48\u9700\u8981\u4e8b\u4e1a\u4e4b\u5bb6</span><b>02</b></div>
      <h2>\u4e0d\u662f\u628a\u6240\u6709\u4e8b\u4e1a\u585e\u8fdb\u4e00\u4e2a\u7cfb\u7edf\uff0c\u800c\u662f\u8ba9\u96c6\u56e2\u770b\u6e05\u201c\u5728\u54ea\u91cc\u7ecf\u8425\u3001\u600e\u4e48\u8fdb\u5165\u3001\u5982\u4f55\u5171\u4eab\u80fd\u529b\u201d</h2>
      <p class="miwa-business-book-lead">\u4e8b\u4e1a\u4e4b\u5bb6\u8d1f\u8d23\u4e8b\u4e1a\u8ba4\u77e5\u3001\u4e8b\u4e1a\u7248\u56fe\u3001\u7ecf\u8425\u72b6\u6001\u4e0e\u8fdb\u5165\u8def\u5f84\uff1b\u8fdb\u5165\u5177\u4f53\u4e8b\u4e1a\u540e\uff0c\u518d\u7531\u5bf9\u5e94\u5de5\u4f5c\u53f0\u627f\u8f7d\u771f\u5b9e\u4e1a\u52a1\u6267\u884c\u3002</p>
      <div class="miwa-business-book-columns miwa-business-book-columns--3">
        <article><span>01</span><h3>\u4e8b\u4e1a\u72ec\u7acb\u7ecf\u8425</h3><p>\u6bcf\u4e2a\u4e8b\u4e1a\u6709\u81ea\u5df1\u7684\u5ba2\u6237\u4ef7\u503c\u3001\u7ecf\u8425\u95ed\u73af\u548c\u6700\u7ec8\u8d23\u4efb\uff0c\u4e0d\u56e0\u5171\u4eab\u7cfb\u7edf\u800c\u6df7\u6210\u4e00\u4e2a\u6d41\u7a0b\u3002</p></article>
        <article><span>02</span><h3>\u96c6\u56e2\u80fd\u529b\u5171\u4eab</h3><p>\u4eba\u624d\u3001AI\u3001\u5ba2\u6237\u3001\u4f9b\u5e94\u5546\u3001\u5546\u54c1\u3001\u8d22\u52a1\u3001\u77e5\u8bc6\u548c\u6570\u5b57\u57fa\u7840\u8bbe\u65bd\u6309\u9700\u8de8\u4e8b\u4e1a\u590d\u7528\u3002</p></article>
        <article><span>03</span><h3>\u771f\u5b9e\u9636\u6bb5\u7ba1\u7406</h3><p>\u6b63\u5f0f\u7ecf\u8425\u3001\u65e2\u6709\u57fa\u7840\u3001\u57f9\u80b2\u4e0e\u672a\u6765\u65b9\u5411\u5fc5\u987b\u533a\u5206\uff0c\u4e0d\u628a\u89c4\u5212\u4e2d\u7684\u4e8b\u4e1a\u5305\u88c5\u6210\u5df2\u7ecf\u6210\u719f\u3002</p></article>
      </div>
      <div class="miwa-business-conclusion">\u4e8b\u4e1a\u4e4b\u5bb6\u56de\u7b54\u201c\u96c6\u56e2\u6709\u54ea\u4e9b\u4e8b\u4e1a\u3001\u73b0\u5728\u5728\u54ea\u91cc\u3001\u6211\u8981\u8fdb\u5165\u54ea\u91cc\u201d\uff1b\u5177\u4f53\u4e8b\u4e1a\u8d1f\u8d23\u628a\u7ecf\u8425\u76ee\u6807\u53d8\u6210\u7ed3\u679c\u3002</div>
      ${bookFooter(2)}
    </section>

    <section class="miwa-business-sheet miwa-business-print-page miwa-business-book-page">
      <div class="miwa-business-book-topline"><span>02｜\u96c6\u56e2\u4e8b\u4e1a\u7248\u56fe</span><b>03</b></div>
      <h2>\u4e8b\u4e1a\u4e0d\u662f\u5b64\u7acb\u9879\u76ee\uff0c\u800c\u662f\u96c6\u56e2\u80fd\u529b\u5171\u540c\u652f\u6491\u7684\u7ecf\u8425\u524d\u7ebf</h2>
      <p class="miwa-business-book-lead">\u6bcf\u4e2a\u4e8b\u4e1a\u72ec\u7acb\u627f\u62c5\u5ba2\u6237\u4ef7\u503c\u4e0e\u7ecf\u8425\u7ed3\u679c\uff0c\u540c\u65f6\u5171\u4eab\u96c6\u56e2\u957f\u671f\u80fd\u529b\u4e0e\u6570\u5b57\u5e95\u5ea7\u3002</p>
      <div class="miwa-business-book-statline"><span>${MIWA_BUSINESSES.length}\u4e2a\u4e8b\u4e1a\u65b9\u5411</span><span>${current.length}\u4e2a\u6b63\u5f0f\u7ecf\u8425</span><span>${restart.length}\u4e2a\u65e2\u6709\u4e1a\u52a1\u57fa\u7840</span></div>
      <div class="miwa-business-book-businesses miwa-business-book-businesses--3">${core.map((item,index) => bookBusinessCard(item,index)).join("")}</div>
      <div class="miwa-business-conclusion">\u96c6\u56e2\u4e8b\u4e1a\u4e0d\u662f\u51e0\u4e2a\u5b64\u7acb\u9879\u76ee\uff0c\u800c\u662f\u4e00\u7ec4\u5171\u4eab\u80fd\u529b\u652f\u6491\u4e0b\u7684\u7ecf\u8425\u524d\u7ebf\u3002</div>
      ${bookFooter(3)}
    </section>

    <section class="miwa-business-sheet miwa-business-print-page miwa-business-book-page">
      <div class="miwa-business-book-topline"><span>03｜\u57f9\u80b2\u4e0e\u89c4\u5212</span><b>04</b></div>
      <h2>\u683c\u5c40\u53ef\u4ee5\u5927\uff0c\u5efa\u8bbe\u5fc5\u987b\u811a\u8e0f\u5b9e\u5730</h2>
      <p class="miwa-business-book-lead">\u57f9\u80b2\u4e8b\u4e1a\u53ea\u9501\u5b9a\u65b9\u5411\uff0c\u4e0d\u7528\u672a\u6765\u60f3\u8c61\u586b\u6ee1\u5f53\u524d\u9875\u9762\u3002</p>
      <div class="miwa-business-book-businesses miwa-business-book-businesses--5">${incubating.map((item,index) => bookBusinessCard(item,index)).join("")}</div>
      <div class="miwa-business-conclusion">\u4e8b\u4e1a\u53ef\u4ee5\u4e0d\u65ad\u589e\u52a0\uff0c\u4f46\u96c6\u56e2\u5171\u4eab\u80fd\u529b\u3001\u7ecf\u8425\u539f\u5219\u548c\u6570\u5b57\u5e95\u5ea7\u5e94\u6301\u7eed\u590d\u7528\u3002</div>
      ${bookFooter(4)}
    </section>

    <section class="miwa-business-sheet miwa-business-print-page miwa-business-book-page">
      <div class="miwa-business-book-topline"><span>04｜\u5171\u4eab\u5173\u7cfb</span><b>05</b></div>
      <h2>\u4e8b\u4e1a\u627f\u62c5\u7ecf\u8425\u7ed3\u679c\uff0c\u96c6\u56e2\u5171\u4eab\u957f\u671f\u80fd\u529b</h2>
      <p class="miwa-business-book-lead">\u5171\u4eab\u80fd\u529b\u670d\u52a1\u591a\u4e2a\u4e8b\u4e1a\uff0c\u4f46\u6bcf\u4e2a\u4e8b\u4e1a\u4ecd\u72ec\u7acb\u627f\u62c5\u5ba2\u6237\u4ef7\u503c\u3001\u7ecf\u8425\u7ed3\u679c\u4e0e\u6700\u7ec8\u8d23\u4efb\u3002</p>
      <div class="miwa-business-book-capabilities">
        ${capabilityCard(1,"\u4eba\u624d/AI","\u4eba\u3001AI\u3001\u80fd\u529b\u4e0e\u7ec4\u7ec7",[["\u4eba\u624d\u4e4b\u5bb6","talent-home"],["AI\u4e4b\u5bb6","ai-home"]])}
        ${capabilityCard(2,"\u5ba2\u6237/\u4f9b\u5e94\u5546","\u5ba2\u6237\u4ef7\u503c\u4e0e\u4f9b\u5e94\u5173\u7cfb",[["\u5ba2\u6237\u4e4b\u5bb6","customer-home"],["\u4f9b\u5e94\u5546\u4e4b\u5bb6","supplier-home"]])}
        ${capabilityCard(3,"\u5546\u54c1/\u54c1\u724c","\u5546\u54c1\u4e3b\u6570\u636e\u4e0e\u54c1\u724c\u8d44\u4ea7",[["\u5546\u54c1\u4e4b\u5bb6","product-home"]])}
        ${capabilityCard(4,"\u8d22\u52a1/\u6570\u636e","\u8d22\u52a1\u53e3\u5f84\u3001\u7ecf\u8425\u6570\u636e\u4e0e\u8bc1\u636e",[["\u8d22\u52a1\u4e4b\u5bb6","finance-home"],["\u5206\u6790\u4e4b\u5bb6","analysis"]])}
        ${capabilityCard(5,"\u77e5\u8bc6/\u6570\u5b57\u5e73\u53f0","\u6807\u51c6\u3001SOP\u3001\u8d44\u6599\u3001\u7cfb\u7edf\u4e0e\u57fa\u7840\u8bbe\u65bd",[["\u77e5\u8bc6\u4e4b\u5bb6","knowledge-home"]])}
      </div>
      <div class="miwa-business-operating-rule"><b>\u5e95\u5c42\u539f\u5219</b><span>\u5148\u660e\u786e\u7ecf\u8425\u76ee\u6807\u4e0e\u4e1a\u52a1\u95ed\u73af\uff0c\u518d\u786e\u8ba4\u80fd\u529b\u4e0e\u8d23\u4efb\uff0c\u518d\u5224\u65ad\u7531\u4eba\u3001AI\u3001\u81ea\u52a8\u5316\u3001\u96c6\u56e2\u5171\u4eab\u80fd\u529b\u6216\u5916\u90e8\u8d44\u6e90\u627f\u62c5\u3002</span></div>
      ${bookFooter(5)}
    </section>
  </article>`;
}

export async function initMiwaBusinessHome() {
  const routeId = getRouteId();
  if (routeId !== "business-home") return initLegacyBusinessHome();
  const root = document.getElementById("miwa-business-home-entry");
  if (!root) return;
  root.innerHTML = overviewHtml();
  root.querySelectorAll("[data-business-enter]").forEach((button) => button.addEventListener("click", () => {
    const spaceId = button.dataset.businessEnter;
    if (!spaceId) return;
    setCurrentBusinessSpace(spaceId, { navigate:true, reason:"business-home-book" });
  }));
  window.dispatchEvent(new CustomEvent("aione:page-aside-context", { detail:{
    state:"light", kicker:"\u4e8b\u4e1a\u4e4b\u5bb6", title:"\u4e8b\u4e1a\u6982\u89c8", text:MIWA_BUSINESS_HOME_SUBTITLE
  }}));
}
