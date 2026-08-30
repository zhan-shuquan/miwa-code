/* ========================================
   AIONE Tabs｜统一横向视图切换
   同一对象／同一页面结构的类型、来源、互动维度使用。
   视觉由 aione-ui-foundation.css 统一控制。
======================================== */

const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;"
}[char]));

export function renderAioneTabs({ items = [], active = "", ariaLabel = "视图切换", dataAttribute = "aione-tab" } = {}) {
  const normalized = items.map((entry) => typeof entry === "string" ? { key: entry, label: entry } : entry);
  return `<div class="aione-tabs" role="tablist" aria-label="${esc(ariaLabel)}">
    ${normalized.map((entry, index) => {
      const key = String(entry.key ?? entry.label ?? index);
      const selected = active ? key === active : index === 0;
      const count = Number.isFinite(Number(entry.count)) ? `<span class="aione-tab__count">${Number(entry.count)}</span>` : "";
      return `<button class="aione-tab${selected ? " is-active" : ""}" type="button" role="tab" aria-selected="${selected ? "true" : "false"}" data-${esc(dataAttribute)}="${esc(key)}">${esc(entry.label ?? key)}${count}</button>`;
    }).join("")}
  </div>`;
}

export function setAioneTabsActive(root, active, selector = "[role='tab']") {
  if (!root) return;
  root.querySelectorAll(selector).forEach((button) => {
    const key = button.dataset.aioneTab ?? button.getAttribute("data-aione-tab") ?? "";
    const selected = key === active;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", selected ? "true" : "false");
  });
}
