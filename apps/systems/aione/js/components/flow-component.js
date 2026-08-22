/* ========================================
   Flow Component｜统一流程组件
======================================== */
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));

export function renderFlow(host, steps = []) {
  if (!host) return;
  const rows = Array.isArray(steps) ? steps : [];
  host.classList.add("miwa-business-flow");
  host.innerHTML = rows.map((step, index) => `<span class="miwa-business-flow__step"><small>${String(index + 1).padStart(2, "0")}</small>${esc(typeof step === "string" ? step : step?.label || "")}</span>`).join("");
}
