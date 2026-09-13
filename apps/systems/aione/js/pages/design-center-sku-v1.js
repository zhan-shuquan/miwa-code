import { aioneApi } from "../services/aione-api-client.js";

const TEMPLATE_ID = "dtpl_unified_sku_color_square_v1";
const PAGE_TYPE = "sku";
let localSnapshotSpec = null;

function text(value) { return String(value ?? "").trim(); }
function escapeHtml(value) { return text(value).replace(/[&<>'"]/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch])); }
function productRef() { return new URLSearchParams(window.location.search).get("product") || "MH0000002"; }
function isSnapshot() { return new URLSearchParams(window.location.search).get("snapshot") === "1"; }

function sectionMarkup() {
  return `<section class="dc-card" data-section="sku-design">
    <div class="dc-section-head">
      <div><span class="dc-step">03A</span><div><h2>SKU / 颜色图设计</h2><p>第二个可操作图片类型：真实变体 + 已确认 SKU 素材 + 可调排版。</p></div></div>
      <span class="dc-status dc-status--ready">可操作</span>
    </div>
    <div class="dc-two-column dc-two-column--hero">
      <div>
        <div class="dc-label">1000 × 1000 SKU / 颜色图实时预览</div>
        <div class="dc-sku-preview" data-ui="sku-design-preview">
          <div class="dc-sku-preview__title" data-ui="sku-preview-title">COLOR VARIATIONS</div>
          <div class="dc-sku-preview__source" data-ui="sku-preview-source">SKU SOURCE</div>
          <div class="dc-sku-preview__variants" data-ui="sku-preview-variants"></div>
          <div class="dc-sku-preview__note">颜色、花型和套数组合以已确认商品素材为准</div>
        </div>
      </div>
      <form class="dc-form" data-form="sku-design">
        <div class="dc-form-grid">
          <label>标题文案<input name="titleText" type="text" maxlength="80" value="COLOR VARIATIONS"></label>
          <label>版式<select name="layoutMode"><option value="grid">网格排列</option><option value="row">横向排列</option><option value="stack">纵向排列</option></select></label>
          <label>每行数量<select name="columns"><option value="2">2 个</option><option value="3" selected>3 个</option><option value="4">4 个</option><option value="6">6 个</option></select></label>
          <label>SKU 来源素材<select name="sourceAssetId"><option value="">请选择 SKU 素材</option></select></label>
        </div>
        <fieldset class="dc-binding"><legend>事实绑定</legend><div class="dc-binding-grid">
          <label>颜色 / 花型字段<select name="variantsFactPath"><option value="actualVariants">实际颜色 / 花型</option></select></label>
          <label>套数 / 数量字段<select name="setCountFactPath"><option value="setCount">套数 / 双数</option></select></label>
        </div></fieldset>
        <section class="dc-layout-panel">
          <div class="dc-layout-panel__head"><div><h3>SKU 图微调</h3><p>只调整展示，不改变 Product Truth。</p></div><button type="button" class="dc-button" data-action="sku-reset-layout">恢复默认</button></div>
          <div class="dc-layout-groups">
            <div class="dc-layout-group"><h4>标题</h4>
              <label class="dc-layout-control"><span>标题大小</span><input type="range" min="70" max="150" value="100" step="1" name="titleScale"><output data-sku-output="titleScale">100</output></label>
              <label class="dc-layout-control"><span>标题上下</span><input type="range" min="-20" max="20" value="0" step="1" name="titleOffsetY"><output data-sku-output="titleOffsetY">0</output></label>
            </div>
            <div class="dc-layout-group"><h4>商品主体</h4>
              <label class="dc-layout-control"><span>主体大小</span><input type="range" min="70" max="150" value="100" step="1" name="productScale"><output data-sku-output="productScale">100</output></label>
              <label class="dc-layout-control"><span>主体上下</span><input type="range" min="-20" max="20" value="0" step="1" name="productOffsetY"><output data-sku-output="productOffsetY">0</output></label>
            </div>
          </div>
        </section>
        <div class="dc-form-actions dc-form-actions--end"><button type="submit" class="dc-button dc-button--primary">保存 SKU / 颜色图设置</button><button type="button" class="dc-button" data-action="create-sku-task">创建 SKU 设计任务</button></div>
      </form>
    </div>
  </section>`;
}

function injectStyle() {
  if (document.getElementById("dc-sku-v1-style")) return;
  const style = document.createElement("style");
  style.id = "dc-sku-v1-style";
  style.textContent = `.dc-sku-preview{aspect-ratio:1/1;max-width:650px;margin:auto;background:#fff;border:1px solid #e5e7e6;border-radius:18px;padding:5%;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box}.dc-sku-preview__title{text-align:center;font:700 28px/1.1 Georgia,serif;letter-spacing:.08em;color:#18324d;margin:2% 0 4%}.dc-sku-preview__source{flex:1;min-height:0;border:1px dashed #cfd6d2;border-radius:16px;display:flex;align-items:center;justify-content:center;background:#fafbfa;font-size:13px;color:#68736e;transform-origin:center}.dc-sku-preview__variants{display:grid;grid-template-columns:repeat(var(--sku-columns,3),1fr);gap:8px;margin-top:4%}.dc-sku-preview__variant{border:1px solid #dfe4e1;border-radius:999px;padding:8px 10px;text-align:center;font-size:12px;background:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dc-sku-preview__note{text-align:center;color:#7a837f;font-size:10px;margin-top:3%}.dc-sku-preview[data-layout="row"] .dc-sku-preview__variants{display:flex;overflow:hidden}.dc-sku-preview[data-layout="row"] .dc-sku-preview__variant{flex:1}.dc-sku-preview[data-layout="stack"] .dc-sku-preview__variants{grid-template-columns:1fr 1fr}`;
  document.head.appendChild(style);
}

function form() { return document.querySelector('[data-form="sku-design"]'); }
function preview() { return document.querySelector('[data-ui="sku-design-preview"]'); }

function collect() {
  const f = form();
  return {
    templateId:TEMPLATE_ID,
    fieldBindings:{actualVariants:f.elements.variantsFactPath.value || "actualVariants",setCount:f.elements.setCountFactPath.value || "setCount"},
    assetIds:[text(f.elements.sourceAssetId.value)].filter(Boolean),
    layoutAdjustments:{titleScale:Number(f.elements.titleScale.value||100),titleOffsetY:Number(f.elements.titleOffsetY.value||0),productScale:Number(f.elements.productScale.value||100),productOffsetY:Number(f.elements.productOffsetY.value||0),columns:Number(f.elements.columns.value||3)},
    presentation:{titleText:text(f.elements.titleText.value)||"COLOR VARIATIONS",layoutMode:f.elements.layoutMode.value||"grid"},
    lifecycleStatus:"draft",
    metadata:{pageType:PAGE_TYPE,operatorAdjustable:true}
  };
}

function refreshLayout() {
  const f=form(), p=preview(); if(!f||!p) return;
  const title=p.querySelector('[data-ui="sku-preview-title"]'), source=p.querySelector('[data-ui="sku-preview-source"]');
  p.dataset.layout=f.elements.layoutMode.value||"grid"; p.style.setProperty("--sku-columns",f.elements.columns.value||"3");
  title.textContent=f.elements.titleText.value||"COLOR VARIATIONS";
  title.style.transform=`translateY(${Number(f.elements.titleOffsetY.value||0)}%) scale(${Number(f.elements.titleScale.value||100)/100})`;
  source.style.transform=`translateY(${Number(f.elements.productOffsetY.value||0)}%) scale(${Number(f.elements.productScale.value||100)/100})`;
  ["titleScale","titleOffsetY","productScale","productOffsetY"].forEach((name)=>{const out=document.querySelector(`[data-sku-output="${name}"]`);if(out) out.value=f.elements[name].value;});
}

function render(workbench, savedSpec=null) {
  const f=form(), p=preview(); if(!f||!p||!workbench) return;
  const data=workbench.product?.productData||{}, materials=workbench.materials||{}, spec=savedSpec||{}, presentation=spec.presentation||{}, layout=spec.layout_adjustments||spec.layoutAdjustments||{};
  const skuAssets=Array.isArray(materials.sku)?materials.sku:[], selected=(Array.isArray(spec.asset_ids)?spec.asset_ids[0]:null)||skuAssets[0]?.id||"";
  f.elements.sourceAssetId.innerHTML=`<option value="">请选择 SKU 素材</option>`+skuAssets.map((a)=>`<option value="${escapeHtml(a.id)}" ${a.id===selected?"selected":""}>${escapeHtml(a.original_name||a.canonical_name||a.id)}</option>`).join("");
  f.elements.titleText.value=presentation.titleText||"COLOR VARIATIONS"; f.elements.layoutMode.value=presentation.layoutMode||"grid"; f.elements.columns.value=String(layout.columns||3); f.elements.titleScale.value=String(layout.titleScale||100); f.elements.titleOffsetY.value=String(layout.titleOffsetY||0); f.elements.productScale.value=String(layout.productScale||100); f.elements.productOffsetY.value=String(layout.productOffsetY||0);
  const variants=Array.isArray(data.actualVariants)?data.actualVariants:[], asset=skuAssets.find((a)=>a.id===f.elements.sourceAssetId.value), count=Number(data.setCount||variants.length||0);
  p.querySelector('[data-ui="sku-preview-source"]').innerHTML=`<div style="text-align:center"><b style="display:block;font-size:18px;color:#33413a">${escapeHtml(asset?.original_name||"请选择 SKU 图")}</b><span>${count?`${count}件 / ${variants.length}种变体`:`${variants.length}种变体`}</span></div>`;
  p.querySelector('[data-ui="sku-preview-variants"]').innerHTML=variants.map((v,i)=>`<div class="dc-sku-preview__variant"><b>${String(i+1).padStart(2,"0")}</b> ${escapeHtml(v)}</div>`).join("")||'<div class="dc-sku-preview__variant">实际颜色待确认</div>';
  refreshLayout();
}

async function getWorkbench() { return (await aioneApi(`/api/v1/design-center/workbench?product=${encodeURIComponent(productRef())}`)).workbench; }

async function load() {
  const wb=await getWorkbench(); let spec=localSnapshotSpec;
  if(!isSnapshot()) { try { spec=(await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/pages/${PAGE_TYPE}`)).pageSpec||null; } catch(_) {} }
  render(wb,spec); return wb;
}

async function save(event) {
  event?.preventDefault(); const spec=collect(); if(!spec.assetIds.length) return window.alert("请先选择 SKU 来源素材。");
  const wb=await getWorkbench();
  if(isSnapshot()) { localSnapshotSpec={...spec,id:"pagespec_preview_sku",page_type:PAGE_TYPE,template_id:TEMPLATE_ID,asset_ids:spec.assetIds,layout_adjustments:spec.layoutAdjustments}; render(wb,localSnapshotSpec); return window.alert("SKU / 颜色图设置已保存到验收快照（不写数据库）。"); }
  const payload=await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/pages/${PAGE_TYPE}`,{method:"PATCH",body:JSON.stringify(spec)}); render(wb,payload.pageSpec); window.alert("SKU / 颜色图设置已保存。");
}

async function createTask() {
  const spec=collect(); if(!spec.assetIds.length) return window.alert("请先选择 SKU 来源素材。");
  const wb=await getWorkbench();
  if(isSnapshot()) return window.alert("SKU 设计任务已在验收快照中模拟创建；不会写数据库。");
  const result=await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/tasks`,{method:"POST",body:JSON.stringify({templateId:TEMPLATE_ID,taskType:"compose_sku_color_image",inputAssetIds:spec.assetIds,inputFactSnapshot:wb.product.productData||{},instructionSnapshot:{pageType:PAGE_TYPE,pageSpec:spec,contract:"AIONE SKU Color Page V1"}})}); window.alert(`SKU 设计任务已创建：${result.task?.id||"已复用现有任务"}`);
}

function wirePlanCard() {
  const card=document.querySelector('.dc-page-plan-card[data-page-type="sku"]'); if(!card) return;
  const status=card.querySelector(".dc-page-plan-status"); if(status){status.textContent="可操作";status.className="dc-page-plan-status dc-page-plan-status--ready";}
  const button=card.querySelector("button"); if(button){button.disabled=false;button.textContent="进入 SKU 设计";button.classList.add("dc-button--primary");button.addEventListener("click",()=>document.querySelector('[data-section="sku-design"]')?.scrollIntoView({behavior:"smooth",block:"start"}));}
}

export async function initDesignCenterSkuV1() {
  const root=document.querySelector("[data-design-center-root]"), hero=root?.querySelector('[data-section="hero-design"]'); if(!root||!hero||root.querySelector('[data-section="sku-design"]')) return;
  injectStyle(); hero.insertAdjacentHTML("afterend",sectionMarkup()); wirePlanCard(); const f=form();
  f?.addEventListener("submit",save); f?.addEventListener("input",refreshLayout); f?.addEventListener("change",refreshLayout);
  document.querySelector('[data-action="sku-reset-layout"]')?.addEventListener("click",()=>{f.elements.titleScale.value="100";f.elements.titleOffsetY.value="0";f.elements.productScale.value="100";f.elements.productOffsetY.value="0";f.elements.columns.value="3";f.elements.layoutMode.value="grid";refreshLayout();});
  document.querySelector('[data-action="create-sku-task"]')?.addEventListener("click",createTask); await load();
}
