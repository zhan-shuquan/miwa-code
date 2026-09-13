const PAGE_TYPES = [
  {
    code: "hero",
    name: "主图",
    required: true,
    output: "1000×1000",
    status: "ready",
    fields: ["品牌","套数/双数","适用尺码","长度/类型","第一卖点","第二卖点"],
    assets: ["SKU图","白底商品图","模特/实拍参考"],
    note: "已接入标签卡、卖点绑定、布局微调和主图设计任务。"
  },
  {
    code: "sku",
    name: "SKU / 颜色图",
    required: true,
    output: "1000×1000",
    status: "planned",
    fields: ["实际颜色/花型","套数/组合关系","SKU关系"],
    assets: ["SKU图","白底图"],
    note: "重点保证真实颜色、花型、套数组合，不生成不存在的变体。"
  },
  {
    code: "white_bg",
    name: "白底商品图",
    required: true,
    output: "1000×1000",
    status: "planned",
    fields: ["商品主体","实际颜色/花型"],
    assets: ["产品图","SKU图"],
    note: "用于主图、发布和后续设计的标准商品主体素材。"
  },
  {
    code: "model",
    name: "模特 / 穿着图",
    required: false,
    output: "1000×1500",
    status: "planned",
    fields: ["适用人群","季节","长度/类型","搭配方向"],
    assets: ["产品图","实拍图","SKU图"],
    note: "可由AI标准化模特角度，但商品颜色、花型、长度和结构必须忠于实物。"
  },
  {
    code: "material",
    name: "材质 / 质地图",
    required: true,
    output: "1000×1500",
    status: "planned",
    fields: ["已确认材质","材质特征文案"],
    assets: ["细节图","产品图"],
    note: "只有已确认材质事实才可进入正式文案；没有事实时保留待确认。"
  },
  {
    code: "size",
    name: "尺寸 / 尺码图",
    required: true,
    output: "1000×1500",
    status: "fallback",
    fields: ["适用尺码","实测尺寸（如有）"],
    assets: ["平铺图","产品图"],
    note: "有实测值时显示完整尺寸；没有实测值时只显示真实支持尺码，不允许AI推断数字。"
  },
  {
    code: "spec",
    name: "商品仕様图",
    required: true,
    output: "1000×1500",
    status: "planned",
    fields: ["品番","材质","适用尺码","颜色","季节","套数","生产信息"],
    assets: ["产品图","SKU图"],
    note: "作为结构化事实页，优先确定性排版，不依赖AI自由生成文字。"
  },
  {
    code: "detail",
    name: "细节 / 结构图",
    required: false,
    output: "1000×1500",
    status: "planned",
    fields: ["已确认结构卖点","局部说明"],
    assets: ["细节图","产品图"],
    note: "用于袜口、脚跟、脚尖、缝制、纹理等真实结构展示。"
  }
];

const STATUS_LABELS = {
  ready: "可操作",
  planned: "待接入",
  fallback: "可降级"
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[ch]));
}

function renderPagePlanCard(type) {
  const fieldText = type.fields.join(" · ");
  const assetText = type.assets.join(" · ");
  return `<article class="dc-page-plan-card" data-page-type="${escapeHtml(type.code)}">
    <div class="dc-page-plan-card__head">
      <div><strong>${escapeHtml(type.name)}</strong><span>${escapeHtml(type.output)}</span></div>
      <em class="dc-page-plan-status dc-page-plan-status--${escapeHtml(type.status)}">${escapeHtml(STATUS_LABELS[type.status] || type.status)}</em>
    </div>
    <div class="dc-page-plan-card__meta"><b>字段</b><span>${escapeHtml(fieldText)}</span></div>
    <div class="dc-page-plan-card__meta"><b>素材</b><span>${escapeHtml(assetText)}</span></div>
    <p>${escapeHtml(type.note)}</p>
    <div class="dc-page-plan-card__foot">
      <span>${type.required ? "通用必备" : "按分类/商品启用"}</span>
      ${type.code === "hero" ? '<button type="button" class="dc-button dc-button--primary" data-action="jump-hero">进入主图设计</button>' : '<button type="button" class="dc-button" disabled>下一阶段接入</button>'}
    </div>
  </article>`;
}

export function initDesignCenterPagePlan() {
  const root = document.querySelector("[data-design-center-root]");
  const host = root?.querySelector('[data-ui="page-plan-grid"]');
  if (!host) return;
  host.innerHTML = PAGE_TYPES.map(renderPagePlanCard).join("");
  root.querySelector('[data-action="jump-hero"]')?.addEventListener("click", () => {
    root.querySelector('[data-section="hero-design"]')?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

export { PAGE_TYPES };
