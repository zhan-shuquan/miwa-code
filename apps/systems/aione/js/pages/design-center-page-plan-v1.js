const PAGE_TYPES = [
  { code:"hero", name:"主图", required:true, output:"1000×1000", status:"ready", fields:["品牌","套数/双数","适用尺码","长度/类型","第一卖点","第二卖点"], assets:["SKU图","白底商品图","模特/实拍参考"], note:"已接入标签卡、卖点绑定、布局微调和主图设计任务。" },
  { code:"sku", name:"SKU / 颜色图", required:true, output:"1000×1000", status:"planned", fields:["实际颜色/花型","套数/组合关系","SKU关系"], assets:["SKU图","白底图"], note:"重点保证真实颜色、花型、套数组合，不生成不存在的变体。" },
  { code:"white_bg", name:"白底商品图", required:true, output:"1000×1000", status:"planned", fields:["商品主体","实际颜色/花型"], assets:["产品图","SKU图"], note:"用于主图、发布和后续设计的标准商品主体素材。" },
  { code:"model", name:"模特 / 穿着图", required:false, output:"1000×1500", status:"planned", fields:["适用人群","季节","长度/类型","搭配方向"], assets:["产品图","实拍图","SKU图"], note:"可由AI标准化模特角度，但商品颜色、花型、长度和结构必须忠于实物。" },
  { code:"material", name:"材质 / 质地图", required:true, output:"1000×1500", status:"planned", fields:["已确认材质","材质特征文案"], assets:["细节图","产品图"], note:"只有已确认材质事实才可进入正式文案；没有事实时保留待确认。" },
  { code:"size", name:"尺寸 / 尺码图", required:true, output:"1000×1500", status:"fallback", fields:["适用尺码","实测尺寸（如有）"], assets:["平铺图","产品图"], note:"有实测值时显示完整尺寸；没有实测值时只显示真实支持尺码，不允许AI推断数字。" },
  { code:"spec", name:"商品仕様图", required:true, output:"1000×1500", status:"planned", fields:["品番","材质","适用尺码","颜色","季节","套数","生产信息"], assets:["产品图","SKU图"], note:"作为结构化事实页，优先确定性排版，不依赖AI自由生成文字。" },
  { code:"detail", name:"细节 / 结构图", required:false, output:"1000×1500", status:"planned", fields:["已确认结构卖点","局部说明"], assets:["细节图","产品图"], note:"用于袜口、脚跟、脚尖、缝制、纹理等真实结构展示。" }
];

const STATUS_LABELS = { ready:"可操作", planned:"待接入", fallback:"可降级" };

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[ch]));
}

function ensureStyles() {
  if (document.getElementById("dc-page-plan-styles")) return;
  const style = document.createElement("style");
  style.id = "dc-page-plan-styles";
  style.textContent = `
    .dc-page-plan{border-color:#dfe5e1;background:linear-gradient(180deg,#fff,#fbfcfb)}
    .dc-page-plan__intro{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:14px}
    .dc-page-plan__intro h2{font-size:18px;margin:0 0 4px}.dc-page-plan__intro p{margin:0;color:var(--dc-muted);font-size:13px;line-height:1.6}
    .dc-page-plan__legend{display:flex;gap:7px;flex-wrap:wrap}.dc-page-plan__legend span{font-size:11px;border:1px solid var(--dc-line);border-radius:999px;padding:5px 8px;background:#fff}
    .dc-page-plan-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    .dc-page-plan-card{border:1px solid var(--dc-line);border-radius:12px;background:#fff;padding:13px;display:flex;flex-direction:column;min-height:235px}
    .dc-page-plan-card__head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.dc-page-plan-card__head strong{display:block;font-size:14px}.dc-page-plan-card__head span{display:block;color:var(--dc-muted);font-size:10px;margin-top:3px}
    .dc-page-plan-status{font-style:normal;font-size:10px;font-weight:800;padding:4px 7px;border-radius:999px;background:#f1f3f2;color:#66706b;white-space:nowrap}.dc-page-plan-status--ready{background:var(--dc-green-soft);color:var(--dc-green)}.dc-page-plan-status--fallback{background:#fff6df;color:#8a5b00}
    .dc-page-plan-card__meta{margin-top:10px}.dc-page-plan-card__meta b{display:block;font-size:10px;color:#7a827e;margin-bottom:3px}.dc-page-plan-card__meta span{font-size:11px;line-height:1.55;color:#343a37}
    .dc-page-plan-card p{font-size:11px;color:var(--dc-muted);line-height:1.55;margin:10px 0 12px}.dc-page-plan-card__foot{margin-top:auto;display:flex;justify-content:space-between;gap:8px;align-items:center}.dc-page-plan-card__foot>span{font-size:10px;font-weight:800;color:#66706b}
    @media(max-width:1120px){.dc-page-plan-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:720px){.dc-page-plan-grid{grid-template-columns:1fr}.dc-page-plan__intro{flex-direction:column}}
  `;
  document.head.appendChild(style);
}

function renderPagePlanCard(type) {
  return `<article class="dc-page-plan-card" data-page-type="${escapeHtml(type.code)}">
    <div class="dc-page-plan-card__head"><div><strong>${escapeHtml(type.name)}</strong><span>${escapeHtml(type.output)}</span></div><em class="dc-page-plan-status dc-page-plan-status--${escapeHtml(type.status)}">${escapeHtml(STATUS_LABELS[type.status] || type.status)}</em></div>
    <div class="dc-page-plan-card__meta"><b>需要字段</b><span>${escapeHtml(type.fields.join(" · "))}</span></div>
    <div class="dc-page-plan-card__meta"><b>需要素材</b><span>${escapeHtml(type.assets.join(" · "))}</span></div>
    <p>${escapeHtml(type.note)}</p>
    <div class="dc-page-plan-card__foot"><span>${type.required ? "通用必备" : "按分类/商品启用"}</span>${type.code === "hero" ? '<button type="button" class="dc-button dc-button--primary" data-action="jump-hero">进入设计</button>' : '<button type="button" class="dc-button" disabled>待接入</button>'}</div>
  </article>`;
}

function createSection() {
  const section = document.createElement("section");
  section.className = "dc-card dc-page-plan";
  section.dataset.ui = "page-plan";
  section.innerHTML = `<div class="dc-page-plan__intro"><div><h2>图片设计规划</h2><p>先确定这件商品需要设计哪些图片、每张图读取哪些字段、使用哪些素材。主图已经可操作，其余类型按同一底层逐张接入。</p></div><div class="dc-page-plan__legend"><span>字段来自 Product Truth</span><span>素材来自 01 / 02 / 03</span><span>设计中心只管呈现</span></div></div><div class="dc-page-plan-grid" data-ui="page-plan-grid"></div>`;
  return section;
}

export function initDesignCenterPagePlan() {
  const root = document.querySelector("[data-design-center-root]");
  if (!root) return;
  ensureStyles();
  let section = root.querySelector('[data-ui="page-plan"]');
  if (!section) {
    section = createSection();
    const summary = root.querySelector('[data-ui="product-summary"]');
    summary?.insertAdjacentElement("afterend", section);
  }
  const host = section.querySelector('[data-ui="page-plan-grid"]');
  if (host) host.innerHTML = PAGE_TYPES.map(renderPagePlanCard).join("");
  section.querySelector('[data-action="jump-hero"]')?.addEventListener("click", () => {
    const heroHeading = [...root.querySelectorAll("h2")].find((node) => node.textContent.includes("1:1 主图设计"));
    heroHeading?.closest(".dc-card")?.scrollIntoView({ behavior:"smooth", block:"start" });
  });
}

export { PAGE_TYPES };
