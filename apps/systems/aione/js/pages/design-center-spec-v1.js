import { aioneApi } from "../services/aione-api-client.js";

const TEMPLATE_ID = "dtpl_unified_product_spec_vertical_v1";
const PAGE_TYPE = "spec";
let localSnapshotSpec = null;

function text(value) { return String(value ?? "").trim(); }
function escapeHtml(value) { return text(value).replace(/[&<>'"]/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch])); }
function productRef() { return new URLSearchParams(window.location.search).get("product") || "MH0000002"; }
function isSnapshot() { return new URLSearchParams(window.location.search).get("snapshot") === "1"; }

function confirmedRows(workbench) {
  const product = workbench?.product || {};
  const data = product.productData || {};
  const variants = Array.isArray(data.actualVariants) ? data.actualVariants.filter(Boolean) : [];
  const origin = text(data.countryOfOrigin || data.productionCountry || data.originCountry);
  const rows = [
    ["品番", text(product.productCode)],
    ["素材", text(data.material)],
    ["対応サイズ", text(data.supportedSize)],
    ["カラー", variants.join(" / ")],
    ["季節", text(data.season)],
    ["丈 / タイプ", text(data.lengthType)],
    ["セット数", data.setCount == null ? "" : text(data.setCount)],
    ["生産国", origin]
  ];
  return rows.filter(([, value]) => value);
}

function sectionMarkup() {
  return `<section class="dc-card" data-section="spec-design">
    <div class="dc-section-head">
      <div><span class="dc-step">03F</span><div><h2>商品仕様图设计</h2><p>结构化 Product Truth 自动排版；缺失字段直接省略，不由 AI 补写规格。</p></div></div>
      <span class="dc-status dc-status--ready">可操作</span>
    </div>
    <div class="dc-two-column dc-two-column--hero">
      <div>
        <div class="dc-label">1000 × 1500 PRODUCT SPEC 实时预览</div>
        <div class="dc-spec-preview" data-ui="spec-preview">
          <div class="dc-spec-preview__title">商品仕様</div>
          <div class="dc-spec-preview__sub">PRODUCT SPEC</div>
          <div class="dc-spec-preview__visual" data-ui="spec-source">请选择商品素材</div>
          <div class="dc-spec-preview__rows" data-ui="spec-rows"></div>
          <div class="dc-spec-preview__note">已确认字段自动显示 · 未确认字段自动省略</div>
        </div>
      </div>
      <form class="dc-form" data-form="spec-design">
        <div class="dc-form-grid">
          <label>商品素材<select name="sourceAssetId"><option value="">请选择</option></select></label>
          <label>表格密度<select name="density"><option value="standard">标准</option><option value="compact">紧凑</option><option value="spacious">宽松</option></select></label>
          <label>标题<input name="titleText" maxlength="40" value="商品仕様"></label>
          <label>字段策略<select name="fieldPolicy" disabled><option value="confirmed-only">仅已确认字段</option></select></label>
        </div>
        <fieldset class="dc-binding"><legend>事实规则</legend><div class="dc-binding-grid">
          <label>字段来源<input value="Product Truth / Product Code" disabled></label>
          <label>缺失字段<input value="自动省略，不生成占位事实" disabled></label>
          <label>文案方式<input value="确定性排版，不让 AI 改写规格" disabled></label>
          <label>适用对象<input value="按商品已有字段动态生成" disabled></label>
        </div></fieldset>
        <section class="dc-layout-panel">
          <div class="dc-layout-panel__head"><div><h3>规格页微调</h3><p>只调整商品图与表格比例，不修改规格值。</p></div><button type="button" class="dc-button" data-action="spec-reset-layout">恢复默认</button></div>
          <div class="dc-layout-groups">
            <div class="dc-layout-group"><h4>商品图</h4>
              <label class="dc-layout-control"><span>商品图大小</span><input type="range" min="70" max="135" value="100" step="1" name="imageScale"><output data-spec-output="imageScale">100</output></label>
              <label class="dc-layout-control"><span>商品图上下</span><input type="range" min="-20" max="20" value="0" step="1" name="imageOffsetY"><output data-spec-output="imageOffsetY">0</output></label>
            </div>
          </div>
        </section>
        <div class="dc-form-actions dc-form-actions--end"><button type="submit" class="dc-button dc-button--primary">保存商品仕様设置</button><button type="button" class="dc-button" data-action="create-spec-task">创建商品仕様设计任务</button></div>
      </form>
    </div>
  </section>`;
}

function injectStyle() {
  if (document.getElementById("dc-spec-v1-style")) return;
  const style = document.createElement("style");
  style.id = "dc-spec-v1-style";
  style.textContent = `.dc-spec-preview{aspect-ratio:2/3;max-width:520px;margin:auto;background:#fbfbfa;border:1px solid #dfe3e1;border-radius:18px;padding:7%;box-sizing:border-box;overflow:hidden}.dc-spec-preview__title{text-align:center;font-size:28px;font-weight:800;color:#20394f}.dc-spec-preview__sub{text-align:center;font:600 11px/1.2 Georgia,serif;letter-spacing:.16em;color:#9a7b38;margin-top:5px}.dc-spec-preview__visual{height:31%;margin:6% 0 5%;border-radius:15px;border:1px solid #e0e4e2;background:#fff;display:flex;align-items:center;justify-content:center;text-align:center;color:#66716b;font-size:12px;transform-origin:center}.dc-spec-preview__rows{border-top:1px solid #d7ddda}.dc-spec-preview__row{display:grid;grid-template-columns:34% 66%;border-bottom:1px solid #e2e6e4;min-height:38px;align-items:center}.dc-spec-preview__row b{font-size:11px;color:#5f6964}.dc-spec-preview__row span{font-size:12px;color:#27332d;word-break:break-word}.dc-spec-preview[data-density="compact"] .dc-spec-preview__row{min-height:31px}.dc-spec-preview[data-density="spacious"] .dc-spec-preview__row{min-height:45px}.dc-spec-preview__note{text-align:center;color:#8a918d;font-size:9px;margin-top:4%}`;
  document.head.appendChild(style);
}

function form() { return document.querySelector('[data-form="spec-design"]'); }
function preview() { return document.querySelector('[data-ui="spec-preview"]'); }

function collect() {
  const f = form();
  return {
    templateId:TEMPLATE_ID,
    fieldBindings:{productCode:"product.productCode",material:"material",supportedSize:"supportedSize",actualVariants:"actualVariants",season:"season",lengthType:"lengthType",setCount:"setCount",countryOfOrigin:"countryOfOrigin"},
    assetIds:[text(f.elements.sourceAssetId.value)].filter(Boolean),
    layoutAdjustments:{imageScale:Number(f.elements.imageScale.value||100),imageOffsetY:Number(f.elements.imageOffsetY.value||0)},
    presentation:{density:f.elements.density.value||"standard",titleText:text(f.elements.titleText.value)||"商品仕様",fieldPolicy:"confirmed-only",omitMissingFacts:true},
    lifecycleStatus:"draft",
    metadata:{pageType:PAGE_TYPE,operatorAdjustable:true,deterministicRendering:true,confirmedFactsOnly:true}
  };
}

function refreshLayout() {
  const f=form(), p=preview(); if(!f||!p) return;
  p.dataset.density=f.elements.density.value||"standard";
  p.querySelector(".dc-spec-preview__title").textContent=f.elements.titleText.value||"商品仕様";
  p.querySelector('[data-ui="spec-source"]').style.transform=`translateY(${Number(f.elements.imageOffsetY.value||0)}%) scale(${Number(f.elements.imageScale.value||100)/100})`;
  ["imageScale","imageOffsetY"].forEach((name)=>{const out=document.querySelector(`[data-spec-output="${name}"]`);if(out)out.value=f.elements[name].value;});
}

function render(workbench,savedSpec=null) {
  const f=form(), p=preview(); if(!f||!p||!workbench) return;
  const materials=workbench.materials||{}, spec=savedSpec||{}, presentation=spec.presentation||{}, layout=spec.layout_adjustments||spec.layoutAdjustments||{};
  const sources=[...(materials.whiteBackground||[]),...(materials.product||[]),...(materials.sku||[])]; const seen=new Set(); const candidates=sources.filter((a)=>a?.id&&!seen.has(a.id)&&seen.add(a.id));
  const selected=(Array.isArray(spec.asset_ids)?spec.asset_ids[0]:null)||materials.whiteBackground?.[0]?.id||materials.product?.[0]?.id||materials.sku?.[0]?.id||"";
  f.elements.sourceAssetId.innerHTML=`<option value="">请选择商品素材</option>`+candidates.map((a)=>`<option value="${escapeHtml(a.id)}" ${a.id===selected?"selected":""}>${escapeHtml(a.original_name||a.canonical_name||a.id)}</option>`).join("");
  f.elements.density.value=presentation.density||"standard";f.elements.titleText.value=presentation.titleText||"商品仕様";f.elements.imageScale.value=String(layout.imageScale||100);f.elements.imageOffsetY.value=String(layout.imageOffsetY||0);
  const asset=candidates.find((a)=>a.id===f.elements.sourceAssetId.value);p.querySelector('[data-ui="spec-source"]').innerHTML=`<div><b>${escapeHtml(asset?.original_name||"请选择商品素材")}</b><br><span>商品仕様主视觉</span></div>`;
  const rows=confirmedRows(workbench);p.querySelector('[data-ui="spec-rows"]').innerHTML=rows.map(([label,value])=>`<div class="dc-spec-preview__row"><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></div>`).join("")||'<div class="dc-spec-preview__row"><b>规格</b><span>待确认</span></div>';
  refreshLayout();
}

async function getWorkbench(){return (await aioneApi(`/api/v1/design-center/workbench?product=${encodeURIComponent(productRef())}`)).workbench;}
async function load(){const wb=await getWorkbench();let spec=localSnapshotSpec;if(!isSnapshot()){try{spec=(await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/pages/${PAGE_TYPE}`)).pageSpec||null;}catch(_){}}render(wb,spec);return wb;}
async function save(event){event?.preventDefault();const spec=collect();const wb=await getWorkbench();if(isSnapshot()){localSnapshotSpec={...spec,id:"pagespec_preview_spec",page_type:PAGE_TYPE,template_id:TEMPLATE_ID,asset_ids:spec.assetIds,layout_adjustments:spec.layoutAdjustments};render(wb,localSnapshotSpec);return window.alert("商品仕様设置已保存到验收快照（不写数据库）。");}const payload=await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/pages/${PAGE_TYPE}`,{method:"PATCH",body:JSON.stringify(spec)});render(wb,payload.pageSpec);window.alert("商品仕様设置已保存。");}
async function createTask(){const spec=collect();const wb=await getWorkbench();if(isSnapshot())return window.alert("商品仕様设计任务已在验收快照中模拟创建；不会写数据库。");const factSnapshot={productCode:wb.product?.productCode,...(wb.product?.productData||{})};const result=await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/tasks`,{method:"POST",body:JSON.stringify({templateId:TEMPLATE_ID,taskType:"compose_deterministic_product_spec",inputAssetIds:spec.assetIds,inputFactSnapshot:factSnapshot,instructionSnapshot:{pageType:PAGE_TYPE,pageSpec:spec,contract:"AIONE Deterministic Product Spec V1",deterministicRendering:true,confirmedFactsOnly:true,omitMissingFacts:true,doNotInventFacts:true}})});window.alert(`商品仕様设计任务已创建：${result.task?.id||"已复用现有任务"}`);}

export async function initDesignCenterSpecV1(){const root=document.querySelector("[data-design-center-root]"),size=root?.querySelector('[data-section="size-design"]');if(!root||!size||root.querySelector('[data-section="spec-design"]'))return;injectStyle();size.insertAdjacentHTML("afterend",sectionMarkup());const f=form();f?.addEventListener("submit",save);f?.addEventListener("input",refreshLayout);f?.addEventListener("change",refreshLayout);document.querySelector('[data-action="spec-reset-layout"]')?.addEventListener("click",()=>{f.elements.imageScale.value="100";f.elements.imageOffsetY.value="0";f.elements.density.value="standard";refreshLayout();});document.querySelector('[data-action="create-spec-task"]')?.addEventListener("click",createTask);await load();}
