/* ========================================
   Flow Component｜统一流程组件
   支持静态流程、可点击筛选、节点数量与当前状态。
======================================== */
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

export function renderFlow(host, steps = [], options = {}) {
  if (!host) return;
  const rows = Array.isArray(steps) ? steps : [];
  const activeKey = options.activeKey ?? "";
  host.classList.add("miwa-business-flow");
  host.innerHTML = rows.map((raw, index) => {
    const step = typeof raw === "string" ? { label: raw } : (raw || {});
    const label = step.label || "";
    const key = String(step.key ?? index);
    const active = Boolean(step.active) || (activeKey !== "" && String(activeKey) === key);
    const count = step.count;
    const clickable = Boolean(step.clickable || options.clickable);
    const tag = clickable ? "button" : "span";
    const attrs = clickable ? `type="button" data-flow-key="${esc(key)}" aria-pressed="${active ? "true" : "false"}"` : "";
    return `<${tag} class="miwa-business-flow__step${active ? " is-active" : ""}" ${attrs}><small>${String(index + 1).padStart(2, "0")}</small><span>${esc(label)}</span>${count !== undefined ? `<b>${esc(count)}</b>` : ""}</${tag}>`;
  }).join("");
}
