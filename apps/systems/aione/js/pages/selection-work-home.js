import { aioneApi } from "../services/aione-api-client.js";
export async function initSelectionWorkHome(host) {
  host.innerHTML =
    '<section class="sw"><h1>工作台</h1><p>正在读取选品数据…</p></section>';
  try {
    const base = "/api/v1/selection-workspace";
    const [boot, all, drafts, submitted, tasks] = await Promise.all([
      aioneApi(base + "/bootstrap"),
      aioneApi(base + "/records?limit=5"),
      aioneApi(base + "/records?status=draft&limit=1"),
      aioneApi(base + "/records?status=submitted&limit=1"),
      aioneApi(base + "/pool/tasks"),
    ]);
    const e = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
    host.innerHTML = `<section class="sw"><h1>${boot.identity.admin ? "团队工作台" : "个人工作台"}</h1><p>选品记录 ${all.total} · 草稿 ${drafts.total} · 已提交ERP ${submitted.total}</p><p>提交数量不代表已上架数量；ERP正式上架结果尚未纳入本阶段测试。</p><div class="sw-toolbar"><a href="#/product-home?view=pool">选品池</a><a href="#/product-home?view=entry">新增选品</a><a href="#/product-home?view=list">${boot.identity.admin ? "团队选品" : "我的选品"}</a></div><h2>我的选品研究任务</h2>${tasks.items.map((t) => `<p><a href="${e(t.metadata.url)}">${e(t.title)}</a> · 负责人 ${e(t.owner_name || t.owner_person_id)}</p>`).join("") || "暂无待研究选品"}<h2>最近选品</h2>${all.items.map((r) => `<p><a href="#/product-home?view=entry&id=${encodeURIComponent(r.id)}">${e(r.data.item_name || r.data.item_code || "未命名草稿")}</a> · ${e(r.status)}</p>`).join("") || "<p>暂无选品记录</p>"}</section>`;
  } catch (error) {
    host.textContent = "工作台读取失败：" + error.message;
  }
}
