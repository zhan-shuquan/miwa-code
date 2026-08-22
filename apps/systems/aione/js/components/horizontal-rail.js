/* ========================================
   MIWA Horizontal Rail｜统一横向滑动组件
   类型、核心指标、辅助机动区、相关内容共用同一滚动机制。
======================================== */

export function scrollHorizontalRail(track, direction = 1) {
  if (!track) return;
  const amount = Math.max(260, track.clientWidth * 0.88);
  track.scrollBy({ left: direction * amount, behavior: "smooth" });
}

export function bindHorizontalRails(root = document) {
  if (!root) return;
  root.querySelectorAll("[data-rail-scroll]").forEach((button) => {
    if (button.dataset.railBound === "true") return;
    button.dataset.railBound = "true";
    button.addEventListener("click", () => {
      const targetId = button.dataset.railTarget;
      const track = targetId ? root.querySelector(`#${CSS.escape(targetId)}`) || document.getElementById(targetId) : null;
      const direction = button.dataset.railScroll === "prev" ? -1 : 1;
      scrollHorizontalRail(track, direction);
    });
  });
}
