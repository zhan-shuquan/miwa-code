import { aioneApi } from "../services/aione-api-client.js";

const TEMPLATE_ID = "dtpl_unified_size_guide_vertical_v1";
const PAGE_TYPE = "size";
let localSnapshotSpec = null;

function text(value) { return String(value ?? "").trim(); }
function escapeHtml(value) { return text(value).replace(/[&<>'"]/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch])); }
function productRef() { return new URLSearchParams(window.location.search).get("product") || "MH0000002"; }
function isSnapshot() { return new URLSearchParams(window.location.search).get("snapshot") === "1"; }

function measurementEntries(value) {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      if (item && typeof item === "object") {
        return { label:text(item.label || item.name || item.key || `尺寸${index + 1}`), value:text(item.value ?? item.measurement), unit:text(item.unit || "") };
      }
      return { label:`尺寸${index + 1}`, value:text(item), unit:"" };
    }).filter((item) => item.value);
  }
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, raw]) => {
      if (raw && typeof raw === "object") return { label:text(raw.label || key), value:text(raw.value ?? raw.measurement), unit:text(raw.unit || "") };
      return { label:text(key), value:text(raw), unit:"" };
    }).filter((item) => item.value);
  }
  return [];
}

function sectionMarkup() {
  return `<section class="dc-card" data-section="size-design">
    <div class="dc-section-head">
      <div><span class="dc-step">03E</span><div><h2>尺寸 / 尺码图设计</h2><p>确定性尺寸页：有实测数据就完整展示，没有实测数据就只展示已确认适用尺码。</p></div></div>
      <span class="dc-status dc-status--fallback" data-ui="size-status">可降级</span>
    </div>
    <div class="dc-two-column dc-two-column--hero">
      <div>
        <div class="dc-label">1000 × 1500 SIZE GUIDE 实时预览</div>
        <div class="dc-size-preview" data-ui="size-preview">
          <div class="dc-size-preview__title">SIZE GUIDE</div>
          <div class="dc-size-preview__subtitle">サイズ・実寸ガイド</div>
          <div class="dc-size-preview__supported"><span>対応サイズ</span><strong data-ui="size-supported">—</strong></div>
          <div class="dc-size-preview__visual" data-ui="size-source">平铺商品图 / 尺寸示意</div>
          <div class="dc-size-preview__measurements" data-ui="size-measurements"></div>
          <div class="dc-size-preview__note" data-ui="size-note"></div>
        </div>
      </div>
      <form class="dc-form" data-form="size-design">
        <div class="dc-form-grid">
          <label>平铺 / 商品素材<select name="sourceAssetId"><option value="">请选择</option></select></label>
          <label>尺寸模式<select name="measurementMode" disabled><option value="full">完整实测尺寸</option><option value="supported_only">仅适用尺码</option></select></label>
        </div>
        <fieldset class="dc-binding"><legend>Product Truth 绑定</legend><div class="dc-binding-grid">
          <label>适用尺码<select name="supportedSizeFactPath"><option value="supportedSize">适用尺码</option></select></label>
          <label>实测尺寸<select name="measurementsFactPath"><option value="measurements">实测尺寸（可选）</option></select></label>
          <label>规则<input value="缺少实测值时禁止 AI 推断数字" disabled></label>
          <label>Fallback<input value="自动退化为 supported_size_only" disabled></label>
        </div></fieldset>
        <section class="dc-layout-panel">
          <div class="dc-layout-panel__head"><div><h3>尺寸页微调</h3><p>只调整图片主体占比和位置，不修改尺寸事实。</p></div><button type="button" class="dc-button" data-action="size-reset-layout">恢复默认</button></div>
          <div class="dc-layout-groups"><div class="dc-layout-group"><h4>商品示意</h4>
            <label class="dc-layout-control"><span>主体大小</span><input type="range" min="75" max="135" value="100" step="1" name="productScale"><output data-size-output="productScale">100</output></label>
            <label class="dc-layout-control"><span>左右位置</span><input type="range" min="-20" max="20" value="0" step="1" name="productOffsetX"><output data-size-output="productOffsetX">0</output></label>
            <label class="dc-layout-control"><span>上下位置</span><input type="range" min="-20" max="20" value="0" step="1" name="productOffsetY"><output data-size-output="productOffsetY">0</output></label>
          </div></div>
        </section>
        <div class="dc-form-actions dc-form-actions--end"><button type="submit" class="dc-button dc-button--primary">保存尺寸图设置</button><button type="button" class="dc-button" data-action="create-size-task">创建尺寸图设计任务</button></div>
      </form>
    </div>
  </section>`;
}

function injectStyle() {
  if (document.getElementById("dc-size-v1-style")) return;
  const style = document.createElement("style");
  style.id = "dc-size-v1-style";
  style.textContent = `.dc-size-preview{aspect-ratio:2/3;max-width:520px;margin:auto;background:#fbfbfa;border:1px solid #dfe4e1;border-radius:18px;box-sizing:border-box;padding:7%;display:flex;flex-direction:column;overflow:hidden}.dc-size-preview__title{text-align:center;font:700 29px/1.1 Georgia,serif;letter-spacing:.09em;color:#1f3852}.dc-size-preview__subtitle{text-align:center;font-size:13px;color:#555f59;margin-top:5px}.dc-size-preview__supported{margin:6% auto 4%;border:1px solid #d8dedb;border-radius:999px;padding:12px 28px;text-align:center;background:#fff}.dc-size-preview__supported span{display:block;font-size:10px;color:#7b8580}.dc-size-preview__supported strong{display:block;font-size:26px;color:#1d352b;margin-top:2px}.dc-size-preview__visual{height:38%;border:1px dashed #cad2ce;border-radius:16px;background:#fff;display:flex;align-items:center;justify-content:center;text-align:center;color:#6b756f;font-size:12px;transform-origin:center;padding:14px}.dc-size-preview__measurements{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:5%}.dc-size-preview__measurement{border:1px solid #e0e4e2;background:#fff;border-radius:10px;padding:8px}.dc-size-preview__measurement b{font-size:10px;color:#68716c;display:block}.dc-size-preview__measurement strong{font-size:15px;color:#26372f}.dc-size-preview__note{text-align:center;font-size:10px;color:#7a837f;margin-top:auto;padding-top:4%}.dc-status--fallback{background:#fff6df!important;color:#8a5b00!important}`;
  document.head.appendChild(style);
}

function form() { return document.querySelector('[data-form="size-design"]'); }
function preview() { return document.querySelector('[data-ui="size-preview"]'); }

function collect(workbench) {
  const f=form(), data=workbench?.product?.productData||{}, measurements=measurementEntries(data.measurements);
  const mode=measurements.length ? "full" : "supported_only";
  return {
    templateId:TEMPLATE_ID,
    fieldBindings:{supportedSize:f.elements.supportedSizeFactPath.value||"supportedSize",measurements:f.elements.measurementsFactPath.value||"measurements"},
    assetIds:[text(f.elements.sourceAssetId.value)].filter(Boolean),
    layoutAdjustments:{productScale:Number(f.elements.productScale.value||100),productOffsetX:Number(f.elements.productOffsetX.value||0),productOffsetY:Number(f.elements.productOffsetY.value||0)},
    presentation:{measurementMode:mode,measurementFallback:"supported_size_only",blockWhenMeasurementsMissing:false},
    lifecycleStatus:"draft",
    metadata:{pageType:PAGE_TYPE,operatorAdjustable:true,truthfulFallback:true,noAiMeasurementInference:true}
  };
}

function refreshLayout() {
  const f=form(), p=preview(); if(!f||!p) return;
  const visual=p.querySelector('[data-ui="size-source"]');
  visual.style.transform=`translate(${Number(f.elements.productOffsetX.value||0)}%,${Number(f.elements.productOffsetY.value||0)}%) scale(${Number(f.elements.productScale.value||100)/100})`;
  ["productScale","productOffsetX","productOffsetY"].forEach((name)=>{const out=document.querySelector(`[data-size-output="${name}"]`);if(out) out.value=f.elements[name].value;});
}

function render(workbench,savedSpec=null) {
  const f=form(), p=preview(); if(!f||!p||!workbench) return;
  const data=workbench.product?.productData||{}, materials=workbench.materials||{}, spec=savedSpec||{}, layout=spec.layout_adjustments||spec.layoutAdjustments||{};
  const sources=[...(materials.whiteBackground||[]),...(materials.product||[]),...(materials.sku||[])]; const seen=new Set(); const candidates=sources.filter((a)=>a?.id&&!seen.has(a.id)&&seen.add(a.id));
  const selected=(Array.isArray(spec.asset_ids)?spec.asset_ids[0]:null)||materials.whiteBackground?.[0]?.id||materials.product?.[0]?.id||materials.sku?.[0]?.id||"";
  f.elements.sourceAssetId.innerHTML=`<option value="">请选择平铺 / 商品素材</option>`+candidates.map((a)=>`<option value="${escapeHtml(a.id)}" ${a.id===selected?"selected":""}>${escapeHtml(a.original_name||a.canonical_name||a.id)}</option>`).join("");
  f.elements.productScale.value=String(layout.productScale||100);f.elements.productOffsetX.value=String(layout.productOffsetX||0);f.elements.productOffsetY.value=String(layout.productOffsetY||0);
  const measurements=measurementEntries(data.measurements); const mode=measurements.length?"full":"supported_only"; f.elements.measurementMode.value=mode;
  p.querySelector('[data-ui="size-supported"]').textContent=text(data.supportedSize)||"待确认";
  const asset=candidates.find((a)=>a.id===f.elements.sourceAssetId.value);
  p.querySelector('[data-ui="size-source"]').innerHTML=`<div><b>${escapeHtml(asset?.original_name||"请选择平铺 / 商品素材")}</b><br><span>${mode==="full"?"用于实测尺寸标注":"仅作商品示意，不生成尺寸数字"}</span></div>`;
  p.querySelector('[data-ui="size-measurements"]').innerHTML=measurements.length?measurements.map((item)=>`<div class="dc-size-preview__measurement"><b>${escapeHtml(item.label)}</b><strong>${escapeHtml(item.value)}${item.unit?` ${escapeHtml(item.unit)}`:""}</strong></div>`).join(""):'';
  p.querySelector('[data-ui="size-note"]').textContent=measurements.length?"实测尺寸来自已确认 Product Truth。":"当前没有已确认实测尺寸，仅展示适用尺码；AI 不得补数字。";
  const status=document.querySelector('[data-ui="size-status"]'); if(status){status.textContent=measurements.length?"可操作":"可降级";status.className=`dc-status ${measurements.length?"dc-status--ready":"dc-status--fallback"}`;}
  refreshLayout();
}

async function getWorkbench(){return (await aioneApi(`/api/v1/design-center/workbench?product=${encodeURIComponent(productRef())}`)).workbench;}
async function load(){const wb=await getWorkbench();let spec=localSnapshotSpec;if(!isSnapshot()){try{spec=(await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/pages/${PAGE_TYPE}`)).pageSpec||null;}catch(_){}}render(wb,spec);return wb;}

async function save(event){event?.preventDefault();const wb=await getWorkbench();const spec=collect(wb);if(!text(wb.product?.productData?.supportedSize))return window.alert("缺少已确认适用尺码，尺寸页不能保存。");if(isSnapshot()){localSnapshotSpec={...spec,id:"pagespec_preview_size",page_type:PAGE_TYPE,template_id:TEMPLATE_ID,asset_ids:spec.assetIds,layout_adjustments:spec.layoutAdjustments};render(wb,localSnapshotSpec);return window.alert("尺寸图设置已保存到验收快照（不写数据库）。");}const payload=await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/pages/${PAGE_TYPE}`,{method:"PATCH",body:JSON.stringify(spec)});render(wb,payload.pageSpec);window.alert("尺寸图设置已保存。");}

async function createTask(){const wb=await getWorkbench();const spec=collect(wb);if(!text(wb.product?.productData?.supportedSize))return window.alert("缺少已确认适用尺码，不能创建尺寸图任务。");if(isSnapshot())return window.alert(`尺寸图任务已在验收快照中模拟创建：${spec.presentation.measurementMode==="full"?"完整实测尺寸":"仅适用尺码 Fallback"}；不会写数据库。`);const result=await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/tasks`,{method:"POST",body:JSON.stringify({templateId:TEMPLATE_ID,taskType:"compose_truthful_size_guide",inputAssetIds:spec.assetIds,inputFactSnapshot:wb.product.productData||{},instructionSnapshot:{pageType:PAGE_TYPE,pageSpec:spec,contract:"AIONE Truthful Size Guide V1",deterministicRendering:true,noAiMeasurementInference:true}})});window.alert(`尺寸图设计任务已创建：${result.task?.id||"已复用现有任务"}`);}

export async function initDesignCenterSizeV1(){const root=document.querySelector("[data-design-center-root]"),material=root?.querySelector('[data-section="material-design"]');if(!root||!material||root.querySelector('[data-section="size-design"]'))return;injectStyle();material.insertAdjacentHTML("afterend",sectionMarkup());const f=form();f?.addEventListener("submit",save);f?.addEventListener("input",refreshLayout);f?.addEventListener("change",refreshLayout);document.querySelector('[data-action="size-reset-layout"]')?.addEventListener("click",()=>{f.elements.productScale.value="100";f.elements.productOffsetX.value="0";f.elements.productOffsetY.value="0";refreshLayout();});document.querySelector('[data-action="create-size-task"]')?.addEventListener("click",createTask);await load();}
