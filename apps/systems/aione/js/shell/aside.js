/* ========================================
   MIWA Aside｜補助可変情報の初期化
======================================== */

export function initAside(config = {}) {
  const card = document.getElementById("aside-context-card");
  const title = document.getElementById("aside-title");
  const content = document.getElementById("aside-content");

  if (card) card.hidden = false;
  if (title && config.title) title.textContent = config.title;
  if (content && config.content) content.textContent = config.content;
}
