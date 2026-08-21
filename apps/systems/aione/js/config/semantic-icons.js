/* ========================================
   MIWA Semantic Icons｜美和セマンティックアイコン
   同じ意味の機能は必ず同じキーを使用する。
   正式な美和アイコン確定後は、この対応表だけを更新する。
======================================== */

const ICON_PATHS = Object.freeze({
  apps: '<rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect>',
  work: '<rect x="5" y="4" width="14" height="16" rx="2"></rect><path d="M8 9h8M8 13h5"></path>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18"></path>',
  category: '<path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z"></path>',
  product: '<path d="m4 7 8-4 8 4-8 4-8-4Z"></path><path d="m4 7v10l8 4 8-4V7"></path>',
  ai: '<path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z"></path><path d="m18 15 .9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15Z"></path>',
  analysis: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"></path>',
  shared: '<circle cx="7" cy="12" r="3"></circle><circle cx="17" cy="7" r="3"></circle><circle cx="17" cy="17" r="3"></circle><path d="m9.7 10.6 4.6-2.2M9.7 13.4l4.6 2.2"></path>',
  target: '<circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="4"></circle><path d="m12 12 7-7M16 5h3v3"></path>',
  people: '<circle cx="9" cy="8" r="3"></circle><circle cx="17" cy="10" r="2.5"></circle><path d="M3 20c.4-4 2.4-6 6-6s5.6 2 6 6M15 15c3.4 0 5.3 1.7 5.8 5"></path>',
  opportunity: '<path d="M9 18h6M10 21h4"></path><path d="M8 14.5A6 6 0 1 1 16 14.5c-1.1.8-1.5 1.6-1.5 2.5h-5c0-.9-.4-1.7-1.5-2.5Z"></path>',
  standard: '<path d="M5 3h11l3 3v15H5z"></path><path d="M15 3v4h4M8 11h8M8 15h8M8 7h3"></path>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"></ellipse><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"></path>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"></path><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"></path>',
  lifecycle: '<path d="M20 7V3l-2 2a8 8 0 1 0 1.5 10"></path><path d="M20 3h-4M12 7v5l3 2"></path>',
  file: '<path d="M6 3h8l4 4v14H6z"></path><path d="M14 3v5h4M9 12h6M9 16h6"></path>',
  profit: '<path d="M4 19h16M6 16l4-4 3 2 5-7"></path><path d="M15 7h3v3"></path>',
  talent: '<circle cx="12" cy="8" r="4"></circle><path d="M5 21c.5-5 3-7 7-7s6.5 2 7 7"></path><path d="m18 4 .7 1.7L20.5 6.5l-1.8.8L18 9l-.7-1.7-1.8-.8 1.8-.8L18 4Z"></path>',
  automation: '<rect x="5" y="6" width="14" height="12" rx="3"></rect><path d="M9 11h.01M15 11h.01M9 15h6M12 3v3"></path>',
  evidence: '<path d="M6 3h12v18H6z"></path><path d="M9 8h6M9 12h3M9 16l2 2 4-4"></path>',
  innovation: '<path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z"></path><path d="M5 17v4M3 19h4M19 16v3M17.5 17.5h3"></path>',
  shield: '<path d="M12 3 20 6v6c0 5-3.3 8-8 9-4.7-1-8-4-8-9V6l8-3Z"></path><path d="m8.5 12 2.2 2.2 4.8-5"></path>',
  store: '<path d="M4 9h16l-2-5H6L4 9Z"></path><path d="M5 9v11h14V9M9 20v-6h6v6"></path>',
  efficiency: '<circle cx="12" cy="12" r="8"></circle><path d="m12 12 4-4M12 5v2M5 12h2M17 12h2M12 17v2"></path>',
  erp: '<rect x="3" y="4" width="7" height="7" rx="1"></rect><rect x="14" y="4" width="7" height="7" rx="1"></rect><rect x="3" y="15" width="7" height="6" rx="1"></rect><path d="M17.5 15v6M14.5 18h6"></path>',
  finance: '<circle cx="12" cy="12" r="9"></circle><path d="M8 8h8M8 12h8M12 8v9M9 17h6"></path>',
  contract: '<path d="M6 3h9l3 3v15H6z"></path><path d="M15 3v4h3M9 11h6M9 15h3M14 17l1.5 1.5L19 15"></path>',
  brand: '<path d="m12 3 3 6 6 .8-4.5 4.5 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.8 9 9l3-6Z"></path>',
  knowledge: '<path d="M4 5c3-1 5-.5 8 1v15c-3-1.5-5-2-8-1V5ZM20 5c-3-1-5-.5-8 1v15c3-1.5 5-2 8-1V5Z"></path>',
  code: '<path d="m9 7-5 5 5 5M15 7l5 5-5 5M13 4l-2 16"></path>',
  sampling: '<path d="M9 3h6M10 3v5l-5 9a3 3 0 0 0 2.7 4h8.6A3 3 0 0 0 19 17l-5-9V3M8 15h8"></path>',
  procurement: '<path d="M4 4h11v16H4zM7 8h5M7 12h5"></path><path d="M15 12h6l-1 5h-4M17 20h.01M20 20h.01"></path>',
  design: '<rect x="3" y="4" width="18" height="15" rx="2"></rect><circle cx="8" cy="9" r="2"></circle><path d="m5 17 5-5 3 3 3-3 3 3"></path>',
  publishing: '<path d="m4 7 8-4 8 4-8 4-8-4Z"></path><path d="M4 7v10l8 4 8-4V7M12 11v10M17 15V9M14.5 11.5 17 9l2.5 2.5"></path>',
  operations: '<path d="M5 10v4M8 9l9-4v14l-9-4V9ZM8 15l2 6M20 9v6"></path>',
  orders: '<path d="M5 3h12v18H5zM8 7h6M8 11h6M8 15h4"></path><path d="m16 14 4-2v5l-4 2"></path>',
  service: '<path d="M5 13v-2a7 7 0 0 1 14 0v2"></path><rect x="3" y="12" width="4" height="6" rx="2"></rect><rect x="17" y="12" width="4" height="6" rx="2"></rect><path d="M19 18c0 2-2 3-5 3"></path>',
  search: '<circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path>',
  notification: '<path d="M18 8a6 6 0 0 0-12 0c0 6-2.5 6.5-3 8h18c-.5-1.5-3-2-3-8"></path><path d="M10 20h4"></path>',
  help: '<circle cx="12" cy="12" r="9"></circle><path d="M9.5 9.3a2.7 2.7 0 1 1 3.7 2.5c-.9.4-1.3 1-1.3 1.9"></path><path d="M12 17h.01"></path>',
  settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19 13.5v-3l-2-.6a6 6 0 0 0-.7-1.7l1-1.8-2.1-2.1-1.8 1a6 6 0 0 0-1.7-.7L11 2.5H8l-.6 2a6 6 0 0 0-1.7.7l-1.8-1-2.1 2.1 1 1.8a6 6 0 0 0-.7 1.7l-2 .6v3l2 .6a6 6 0 0 0 .7 1.7l-1 1.8 2.1 2.1 1.8-1a6 6 0 0 0 1.7.7l.6 2h3l.6-2a6 6 0 0 0 1.7-.7l1.8 1 2.1-2.1-1-1.8a6 6 0 0 0 .7-1.7l2-.6Z"></path>',
  chevronDown: '<path d="m8 10 4 4 4-4"></path>',
  external: '<path d="M14 5h5v5M19 5l-8 8"></path><path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"></path>',
  more: '<circle cx="5" cy="12" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle>'
});

export function renderSemanticIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((host) => {
    const paths = ICON_PATHS[host.dataset.icon];
    if (!paths || host.dataset.iconReady === "true") return;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = paths;
    host.replaceChildren(svg);
    host.dataset.iconReady = "true";
  });
}
