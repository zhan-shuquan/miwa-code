import { aioneApi } from "../services/aione-api-client.js";
const base = "/api/v1/selection-workspace/pool";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export async function initSelectionPeople(host) {
  if (!document.getElementById("selection-workspace-css")) {
    const l = document.createElement("link");
    l.id = "selection-workspace-css";
    l.rel = "stylesheet";
    l.href = "./css/pages/selection-workspace.css";
    document.head.append(l);
  }
  const data = await aioneApi(base + "/people");
  host.innerHTML = `<section class="sw"><header class="sw-heading"><h1>员工货号前缀</h1><a href="#/product-home?view=pool">返回选品池</a></header><p data-message role="status"></p><section class="sw-card"><table><thead><tr><th>会员号</th><th>姓名</th><th>ERP人员档案</th><th>员工货号前缀</th></tr></thead><tbody>${data.people.map((p) => `<tr><td>${esc(p.id)}</td><td>${esc(p.display_name)}</td><td>${esc(p.erp?.name || "待关联")}</td><td>${esc(p.erp?.prefix || "待配置")}</td></tr>`).join("")}</tbody></table></section>${data.canEdit ? `<form class="sw-card"><h2>设置正式关联</h2><div class="sw-toolbar"><label>会员档案<select name="memberId" required><option value="">请选择</option>${data.people.map((p) => `<option value="${esc(p.id)}">${esc(p.display_name)} · ${esc(p.id)}</option>`).join("")}</select></label><label>ERP人员档案<select name="employeeId" required><option value="">请选择</option>${data.erpPeople.map((p) => `<option value="${esc(p.employeeId)}">${esc(p.name)} · ${esc(p.employeeId)}</option>`).join("")}</select></label><label>员工货号前缀<input name="prefix" required maxlength="9" pattern="[A-Za-z0-9_\-]+"></label><button class="sw-primary" type="submit">保存至ERP</button></div></form><section class="sw-card"><h2>同步状态</h2>${data.pending.map((p) => `<p>${esc(p.payload.memberId)} · ${esc(p.payload.prefix)} · ${esc({ queued: "待同步", processing: "同步中", succeeded: "已保存", failed: "失败" }[p.status])} ${esc(p.result?.message || "")}</p>`).join("") || "暂无设置请求"}<button data-refresh>刷新状态</button></section>` : ""}</section>`;
  host
    .querySelector("[data-refresh]")
    ?.addEventListener("click", () => initSelectionPeople(host));
  let requestKey = crypto.randomUUID();
  host.querySelector("form")?.addEventListener("input", () => {
    requestKey = crypto.randomUUID();
  });
  host.querySelector("form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("button");
    button.disabled = true;
    try {
      const body = {
        ...Object.fromEntries(new FormData(e.target)),
        requestKey,
      };
      await aioneApi(base + "/people/prefix", {
        method: "POST",
        body: JSON.stringify(body),
      });
      host.querySelector("[data-message]").textContent =
        "设置请求已保存，ERP处理后生效。";
    } catch (error) {
      host.querySelector("[data-message]").textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}
