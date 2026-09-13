import { aioneApi } from "../services/aione-api-client.js";

const TEMPLATE_ID = "dtpl_unified_material_vertical_v1";
const PAGE_TYPE = "material";
let localSnapshotSpec = null;

function text(value) { return String(value ?? "").trim(); }
function escapeHtml(value) { return text(value).replace(/[&<>'"]/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch])); }
function productRef() { return new URLSearchParams(window.location.search).get("product") || "MH0000002"; }
function isSnapshot() { return new URLSearchParams(window.location.search).get("snapshot") === "1"; }

function sectionMarkup() {
  return `<section class="dc-card" data-section="material-design">
    <div class="dc-section-head">
      <div><span class="dc-step">03D</span><div><h2>材质 / 质地图设计</h2><p>从真实细节素材展示面料与纹理；只有已确认材质事实才能进入正式文案。</p></div></div>
      <span class="dc-status dc-status--ready">可操作</span>
    </div>
    <div class="dc-two-column dc-two-column--hero">
      <div>
        <div class="dc-label">1000 × 1500 材质 / 质地预览</div>
        <div class="dc-material-preview" data-ui="material-preview">
          <div class="dc-material-preview__title">MATERIAL / TEXTURE</div>
          <div class="dc-material-preview__image" data-ui="material-source">请选择细节素材</div>
          <div class="dc-material-preview__facts" data-ui="material-facts"></div>
        </div>
      </div>
      <form class="dc-form" data-form="material-design">
        <div class="dc-form-grid">
          <label>细节 / 材质素材<select name="sourceAssetId"><option value="">请选择</option></select></label>
          <label>展示方式<select name="displayMode"><option value="macro">纹理放大</option><option value="split">主体 + 局部</option><option value="detail-card">细节卡片</option></select></label>
          <label>标题<input name="titleText" type="text" maxlength="80" value="MATERIAL / TEXTURE"></label>
          <label>说明策略<select name="copyMode"><option value="confirmed-only">仅已确认材质事实</option><option value="visual-only">无材质事实时只展示视觉</option></select></label>
        </div>
        <fieldset class="dc-binding"><legend>事实绑定</legend><div class="dc-binding-grid">
          <label>材质字段<input name="materialFactPath" value="material" placeholder="material"></label>
          <label>材质特征字段<input name="materialFeatureFactPath" value="materialFeatures" placeholder="materialFeatures"></label>
          <label>事实状态<input value="未确认事实不进入文案" disabled></label>
          <label>素材规则<input value="优先细节图 / 产品图，不凭空生成纹理" disabled></label>
        </div></fieldset>
        <section class="dc-layout-panel">
          <div class="dc-layout-panel__head"><div><h3>材质图微调</h3><p>只调展示比例与位置，不改变纹理事实。</p></div><button type="button" class="dc-button" data-action="material-reset-layout">恢复默认</button></div>
          <div class="dc-layout-groups">
            <div class="dc-layout-group"><h4>细节图</h4>
              <label class="dc-layout-control"><span>图片大小</span><input type="range" min="70" max="145" value="100" step="1" name="imageScale"><output data-material-output="imageScale">100</output></label>
              <label class="dc-layout-control"><span>左右位置</span><input type="range" min="-20" max="20" value="0" step="1" name="imageOffsetX"><output data-material-output="imageOffsetX">0</output></label>
              <label class="dc-layout-control"><span>上下位置</span><input type="range" min="-20" max="20" value="0" step="1" name="imageOffsetY"><output data-material-output="imageOffsetY">0</output></label>
            </div>
          </div>
        </section>
        <div class="dc-form-actions dc-form-actions--end"><button type="submit" class="dc-button dc-button--primary">保存材质图设置</button><button type="button" class="dc-button" data-action="create-material-task">创建材质图设计任务</button></div>
      </form>
    </div>
  </section>`;
}

function injectStyle() {
  if (document.getElementById("dc-material-v1-style")) return;
  const style = document.createElement("style");
  style.id = "dc-material-v1-style";
  style.textContent = `.dc-material-preview{aspect-ratio:2/3;max-width:520px;margin:auto;background:#fbfaf7;border:1px solid #e3e5e1;border-radius:18px;padding:7%;box-sizing:border-box;overflow:hidden}.dc-material-preview__title{text-align:center;font:700 24px/1.1 Georgia,serif;letter-spacing:.08em;color:#253a34;margin-bottom:6%}.dc-material-preview__image{height:62%;border-radius:18px;background:linear-gradient(135deg,#ece7de,#d8d0c4);border:1px solid #d9ddd9;display:flex;align-items:center;justify-content:center;text-align:center;color:#555f5a;font-size:13px;transform-origin:center}.dc-material-preview__facts{margin-top:7%;border-top:1px solid #dde2de;padding-top:5%;font-size:12px;line-height:1.8;color:#4e5752;text-align:center}`;
  document.head.appendChild(style);
}

function form() { return document.querySelector('[data-form="material-design"]'); }
function preview() { return document.querySelector('[data-ui="material-preview"]'); }

function collect() {
  const f=form();
  return {
    templateId:TEMPLATE_ID,
    fieldBindings:{material:text(f.elements.materialFactPath.value)||"material",materialFeatures:text(f.elements.materialFeatureFactPath.value)||"materialFeatures"},
    assetIds:[text(f.elements.sourceAssetId.value)].filter(Boolean),
    layoutAdjustments:{imageScale:Number(f.elements.imageScale.value||100),imageOffsetX:Number(f.elements.imageOffsetX.value||0),imageOffsetY:Number(f.elements.imageOffsetY.value||0)},
    presentation:{displayMode:f.elements.displayMode.value||"macro",titleText:text(f.elements.titleText.value)||"MATERIAL / TEXTURE",copyMode:f.elements.copyMode.value||"confirmed-only"},
    lifecycleStatus:"draft",
    metadata:{pageType:PAGE_TYPE,operatorAdjustable:true,confirmedFactsOnly:true}
  };
}

function refreshLayout(){const f=form(),p=preview();if(!f||!p)return;const image=p.querySelector('[data-ui="material-source"]');image.style.transform=`translate(${Number(f.elements.imageOffsetX.value||0)}%,${Number(f.elements.imageOffsetY.value||0)}%) scale(${Number(f.elements.imageScale.value||100)/100})`;p.querySelector('.dc-material-preview__title').textContent=f.elements.titleText.value||"MATERIAL / TEXTURE";["imageScale","imageOffsetX","imageOffsetY"].forEach((name)=>{const out=document.querySelector(`[data-material-output="${name}"]`);if(out)out.value=f.elements[name].value;});}

function render(workbench,savedSpec=null){const f=form(),p=preview();if(!f||!p||!workbench)return;const materials=workbench.materials||{},data=workbench.product?.productData||{},spec=savedSpec||{},presentation=spec.presentation||{},layout=spec.layout_adjustments||spec.layoutAdjustments||{};const sources=[...(materials.detail||[]),...(materials.product||[])];const seen=new Set();const candidates=sources.filter((a)=>a?.id&&!seen.has(a.id)&&seen.add(a.id));const selected=(Array.isArray(spec.asset_ids)?spec.asset_ids[0]:null)||materials.detail?.[0]?.id||materials.product?.[0]?.id||"";f.elements.sourceAssetId.innerHTML=`<option value="">请选择细节素材</option>`+candidates.map((a)=>`<option value="${escapeHtml(a.id)}" ${a.id===selected?"selected":""}>${escapeHtml(a.original_name||a.canonical_name||a.id)}</option>`).join("");f.elements.displayMode.value=presentation.displayMode||"macro";f.elements.titleText.value=presentation.titleText||"MATERIAL / TEXTURE";f.elements.copyMode.value=presentation.copyMode||"confirmed-only";f.elements.imageScale.value=String(layout.imageScale||100);f.elements.imageOffsetX.value=String(layout.imageOffsetX||0);f.elements.imageOffsetY.value=String(layout.imageOffsetY||0);const asset=candidates.find((a)=>a.id===f.elements.sourceAssetId.value);p.querySelector('[data-ui="material-source"]').innerHTML=`<div><b>${escapeHtml(asset?.original_name||"请选择细节素材")}</b><br><span>真实纹理来源</span></div>`;const material=text(data.material);const features=Array.isArray(data.materialFeatures)?data.materialFeatures.filter(Boolean):[];p.querySelector('[data-ui="material-facts"]').textContent=material?`${material}${features.length?` · ${features.join(" · ")}`:""}`:"材质事实未确认：当前只展示真实纹理，不生成材质宣称";refreshLayout();}

async function getWorkbench(){return (await aioneApi(`/api/v1/design-center/workbench?product=${encodeURIComponent(productRef())}`)).workbench;}
async function load(){const wb=await getWorkbench();let spec=localSnapshotSpec;if(!isSnapshot()){try{spec=(await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/pages/${PAGE_TYPE}`)).pageSpec||null;}catch(_){}}render(wb,spec);return wb;}
async function save(event){event?.preventDefault();const spec=collect();if(!spec.assetIds.length)return window.alert("请先选择细节 / 材质素材。");const wb=await getWorkbench();if(isSnapshot()){localSnapshotSpec={...spec,id:"pagespec_preview_material",page_type:PAGE_TYPE,template_id:TEMPLATE_ID,asset_ids:spec.assetIds,layout_adjustments:spec.layoutAdjustments};render(wb,localSnapshotSpec);return window.alert("材质图设置已保存到验收快照（不写数据库）。");}const payload=await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/pages/${PAGE_TYPE}`,{method:"PATCH",body:JSON.stringify(spec)});render(wb,payload.pageSpec);window.alert("材质图设置已保存。");}
async function createTask(){const spec=collect();if(!spec.assetIds.length)return window.alert("请先选择细节 / 材质素材。");const wb=await getWorkbench();if(isSnapshot())return window.alert("材质图设计任务已在验收快照中模拟创建；不会写数据库。");const result=await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/tasks`,{method:"POST",body:JSON.stringify({templateId:TEMPLATE_ID,taskType:"compose_material_texture_image",inputAssetIds:spec.assetIds,inputFactSnapshot:wb.product.productData||{},instructionSnapshot:{pageType:PAGE_TYPE,pageSpec:spec,contract:"AIONE Material Texture Page V1",confirmedFactsOnly:true,doNotInventMaterial:true}})});window.alert(`材质图设计任务已创建：${result.task?.id||"已复用现有任务"}`);}

export async function initDesignCenterMaterialV1(){const root=document.querySelector("[data-design-center-root]"),model=root?.querySelector('[data-section="model-design"]');if(!root||!model||root.querySelector('[data-section="material-design"]'))return;injectStyle();model.insertAdjacentHTML("afterend",sectionMarkup());const f=form();f?.addEventListener("submit",save);f?.addEventListener("input",refreshLayout);f?.addEventListener("change",refreshLayout);document.querySelector('[data-action="material-reset-layout"]')?.addEventListener("click",()=>{f.elements.imageScale.value="100";f.elements.imageOffsetX.value="0";f.elements.imageOffsetY.value="0";refreshLayout();});document.querySelector('[data-action="create-material-task"]')?.addEventListener("click",createTask);await load();}
