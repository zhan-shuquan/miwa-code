import { aioneApi } from "../services/aione-api-client.js";

const TEMPLATE_ID = "dtpl_unified_white_bg_square_v1";
const PAGE_TYPE = "white_bg";
let localSnapshotSpec = null;

function text(value) { return String(value ?? "").trim(); }
function escapeHtml(value) { return text(value).replace(/[&<>'"]/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch])); }
function productRef() { return new URLSearchParams(window.location.search).get("product") || "MH0000002"; }
function isSnapshot() { return new URLSearchParams(window.location.search).get("snapshot") === "1"; }

function sectionMarkup() {
  return `<section class="dc-card" data-section="white-bg-design">
    <div class="dc-section-head">
      <div><span class="dc-step">03B</span><div><h2>白底商品图设计</h2><p>以真实商品素材为锚点，清理背景、统一画布和主体占比，不重新发明商品。</p></div></div>
      <span class="dc-status dc-status--ready">可操作</span>
    </div>
    <div class="dc-two-column dc-two-column--hero">
      <div>
        <div class="dc-label">1000 × 1000 白底商品图实时预览</div>
        <div class="dc-white-preview" data-ui="white-bg-preview">
          <div class="dc-white-preview__safe"></div>
          <div class="dc-white-preview__product" data-ui="white-bg-source">请选择商品素材</div>
          <div class="dc-white-preview__caption" data-ui="white-bg-caption">纯白背景 · 商品主体保持真实</div>
        </div>
      </div>
      <form class="dc-form" data-form="white-bg-design">
        <div class="dc-form-grid">
          <label>来源商品素材<select name="sourceAssetId"><option value="">请选择</option></select></label>
          <label>背景处理<select name="cleanupMode"><option value="cleanup">清理为纯白背景</option><option value="preserve">已有白底直接规范化</option></select></label>
          <label>主体适配<select name="objectFit"><option value="contain">完整展示</option><option value="cover">适度铺满</option></select></label>
          <label>轻微自然阴影<select name="shadowMode"><option value="none">不加阴影</option><option value="soft">保留轻微自然阴影</option></select></label>
        </div>
        <fieldset class="dc-binding"><legend>事实保护</legend><div class="dc-binding-grid">
          <label>变体字段<select name="variantsFactPath"><option value="actualVariants">实际颜色 / 花型</option></select></label>
          <label>保护规则<input value="颜色、花型、结构、长度、Logo 不得改写" disabled></label>
        </div></fieldset>
        <section class="dc-layout-panel">
          <div class="dc-layout-panel__head"><div><h3>白底图微调</h3><p>模板解决大部分排版，仅在商品比例特殊时微调。</p></div><button type="button" class="dc-button" data-action="white-reset-layout">恢复默认</button></div>
          <div class="dc-layout-groups">
            <div class="dc-layout-group"><h4>商品主体</h4>
              <label class="dc-layout-control"><span>主体大小</span><input type="range" min="60" max="145" value="100" step="1" name="productScale"><output data-white-output="productScale">100</output></label>
              <label class="dc-layout-control"><span>左右位置</span><input type="range" min="-25" max="25" value="0" step="1" name="productOffsetX"><output data-white-output="productOffsetX">0</output></label>
              <label class="dc-layout-control"><span>上下位置</span><input type="range" min="-25" max="25" value="0" step="1" name="productOffsetY"><output data-white-output="productOffsetY">0</output></label>
            </div>
            <div class="dc-layout-group"><h4>画布</h4>
              <label class="dc-layout-control"><span>安全边距</span><input type="range" min="4" max="20" value="10" step="1" name="safeMargin"><output data-white-output="safeMargin">10</output></label>
            </div>
          </div>
        </section>
        <div class="dc-form-actions dc-form-actions--end"><button type="submit" class="dc-button dc-button--primary">保存白底图设置</button><button type="button" class="dc-button" data-action="create-white-task">创建白底图设计任务</button></div>
      </form>
    </div>
  </section>`;
}

function injectStyle() {
  if (document.getElementById("dc-white-bg-v1-style")) return;
  const style = document.createElement("style");
  style.id = "dc-white-bg-v1-style";
  style.textContent = `.dc-white-preview{aspect-ratio:1/1;max-width:650px;margin:auto;background:#fff;border:1px solid #e2e6e4;border-radius:18px;position:relative;overflow:hidden;box-sizing:border-box}.dc-white-preview__safe{position:absolute;inset:10%;border:1px dashed #e0e4e2;border-radius:12px;pointer-events:none}.dc-white-preview__product{position:absolute;left:15%;top:15%;width:70%;height:70%;display:flex;align-items:center;justify-content:center;text-align:center;border-radius:16px;background:linear-gradient(135deg,#fafafa,#f4f5f4);border:1px solid #e6e9e7;color:#56605b;font-size:14px;transform-origin:center}.dc-white-preview__product b{display:block;color:#27332d;font-size:18px;margin-bottom:6px}.dc-white-preview__caption{position:absolute;left:0;right:0;bottom:3%;text-align:center;color:#8a918d;font-size:10px;letter-spacing:.03em}`;
  document.head.appendChild(style);
}

function form() { return document.querySelector('[data-form="white-bg-design"]'); }
function preview() { return document.querySelector('[data-ui="white-bg-preview"]'); }

function collect() {
  const f = form();
  return {
    templateId:TEMPLATE_ID,
    fieldBindings:{actualVariants:f.elements.variantsFactPath.value || "actualVariants"},
    assetIds:[text(f.elements.sourceAssetId.value)].filter(Boolean),
    layoutAdjustments:{productScale:Number(f.elements.productScale.value||100),productOffsetX:Number(f.elements.productOffsetX.value||0),productOffsetY:Number(f.elements.productOffsetY.value||0),safeMargin:Number(f.elements.safeMargin.value||10)},
    presentation:{cleanupMode:f.elements.cleanupMode.value||"cleanup",objectFit:f.elements.objectFit.value||"contain",shadowMode:f.elements.shadowMode.value||"none",background:"#FFFFFF"},
    lifecycleStatus:"draft",
    metadata:{pageType:PAGE_TYPE,operatorAdjustable:true,sourceAnchored:true}
  };
}

function refreshLayout() {
  const f=form(), p=preview(); if(!f||!p) return;
  const product=p.querySelector('[data-ui="white-bg-source"]'), safe=p.querySelector(".dc-white-preview__safe");
  product.style.transform=`translate(${Number(f.elements.productOffsetX.value||0)}%,${Number(f.elements.productOffsetY.value||0)}%) scale(${Number(f.elements.productScale.value||100)/100})`;
  const margin=Number(f.elements.safeMargin.value||10); safe.style.inset=`${margin}%`;
  ["productScale","productOffsetX","productOffsetY","safeMargin"].forEach((name)=>{const out=document.querySelector(`[data-white-output="${name}"]`);if(out) out.value=f.elements[name].value;});
  const caption=p.querySelector('[data-ui="white-bg-caption"]');
  caption.textContent=`纯白背景 · ${f.elements.cleanupMode.value==="cleanup"?"背景清理":"直接规范化"} · ${f.elements.objectFit.value==="contain"?"完整展示":"适度铺满"}`;
}

function render(workbench,savedSpec=null) {
  const f=form(), p=preview(); if(!f||!p||!workbench) return;
  const materials=workbench.materials||{}, spec=savedSpec||{}, presentation=spec.presentation||{}, layout=spec.layout_adjustments||spec.layoutAdjustments||{};
  const white=Array.isArray(materials.whiteBackground)?materials.whiteBackground:[], products=Array.isArray(materials.product)?materials.product:[];
  const seen=new Set(); const candidates=[...white,...products].filter((a)=>a?.id&&!seen.has(a.id)&&seen.add(a.id));
  const selected=(Array.isArray(spec.asset_ids)?spec.asset_ids[0]:null)||white[0]?.id||products[0]?.id||"";
  f.elements.sourceAssetId.innerHTML=`<option value="">请选择商品素材</option>`+candidates.map((a)=>`<option value="${escapeHtml(a.id)}" ${a.id===selected?"selected":""}>${escapeHtml(a.original_name||a.canonical_name||a.id)}</option>`).join("");
  f.elements.cleanupMode.value=presentation.cleanupMode||(white.some((a)=>a.id===selected)?"preserve":"cleanup"); f.elements.objectFit.value=presentation.objectFit||"contain"; f.elements.shadowMode.value=presentation.shadowMode||"none";
  f.elements.productScale.value=String(layout.productScale||100); f.elements.productOffsetX.value=String(layout.productOffsetX||0); f.elements.productOffsetY.value=String(layout.productOffsetY||0); f.elements.safeMargin.value=String(layout.safeMargin||10);
  const asset=candidates.find((a)=>a.id===f.elements.sourceAssetId.value); p.querySelector('[data-ui="white-bg-source"]').innerHTML=`<div><b>${escapeHtml(asset?.original_name||"请选择商品素材")}</b><span>${white.some((a)=>a.id===asset?.id)?"已识别白底候选":"产品图 · 将进行白底清理"}</span></div>`;
  refreshLayout();
}

async function getWorkbench(){return (await aioneApi(`/api/v1/design-center/workbench?product=${encodeURIComponent(productRef())}`)).workbench;}
async function load(){const wb=await getWorkbench();let spec=localSnapshotSpec;if(!isSnapshot()){try{spec=(await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/pages/${PAGE_TYPE}`)).pageSpec||null;}catch(_){}}render(wb,spec);return wb;}

async function save(event){event?.preventDefault();const spec=collect();if(!spec.assetIds.length)return window.alert("请先选择来源商品素材。");const wb=await getWorkbench();if(isSnapshot()){localSnapshotSpec={...spec,id:"pagespec_preview_white_bg",page_type:PAGE_TYPE,template_id:TEMPLATE_ID,asset_ids:spec.assetIds,layout_adjustments:spec.layoutAdjustments};render(wb,localSnapshotSpec);return window.alert("白底图设置已保存到验收快照（不写数据库）。");}const payload=await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/pages/${PAGE_TYPE}`,{method:"PATCH",body:JSON.stringify(spec)});render(wb,payload.pageSpec);window.alert("白底图设置已保存。");}

async function createTask(){const spec=collect();if(!spec.assetIds.length)return window.alert("请先选择来源商品素材。");const wb=await getWorkbench();if(isSnapshot())return window.alert("白底图设计任务已在验收快照中模拟创建；不会写数据库。");const result=await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/tasks`,{method:"POST",body:JSON.stringify({templateId:TEMPLATE_ID,taskType:"compose_white_background_product",inputAssetIds:spec.assetIds,inputFactSnapshot:wb.product.productData||{},instructionSnapshot:{pageType:PAGE_TYPE,pageSpec:spec,contract:"AIONE White Background Product Page V1",preserveProductTruth:true}})});window.alert(`白底图设计任务已创建：${result.task?.id||"已复用现有任务"}`);}

export async function initDesignCenterWhiteBgV1(){const root=document.querySelector("[data-design-center-root]"),sku=root?.querySelector('[data-section="sku-design"]');if(!root||!sku||root.querySelector('[data-section="white-bg-design"]'))return;injectStyle();sku.insertAdjacentHTML("afterend",sectionMarkup());const f=form();f?.addEventListener("submit",save);f?.addEventListener("input",refreshLayout);f?.addEventListener("change",refreshLayout);document.querySelector('[data-action="white-reset-layout"]')?.addEventListener("click",()=>{f.elements.productScale.value="100";f.elements.productOffsetX.value="0";f.elements.productOffsetY.value="0";f.elements.safeMargin.value="10";f.elements.objectFit.value="contain";f.elements.shadowMode.value="none";refreshLayout();});document.querySelector('[data-action="create-white-task"]')?.addEventListener("click",createTask);await load();}
