import { aioneApi } from "../services/aione-api-client.js";

const TEMPLATE_ID = "dtpl_unified_model_wear_vertical_v1";
const PAGE_TYPE = "model";
let localSnapshotSpec = null;

function text(value) { return String(value ?? "").trim(); }
function escapeHtml(value) { return text(value).replace(/[&<>'"]/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch])); }
function productRef() { return new URLSearchParams(window.location.search).get("product") || "MH0000002"; }
function isSnapshot() { return new URLSearchParams(window.location.search).get("snapshot") === "1"; }

function sectionMarkup() {
  return `<section class="dc-card" data-section="model-design">
    <div class="dc-section-head">
      <div><span class="dc-step">03C</span><div><h2>模特 / 穿着图设计</h2><p>用真实商品素材约束 AI，只生成模特、姿势和场景，不重新设计商品。</p></div></div>
      <span class="dc-status dc-status--ready">可操作</span>
    </div>
    <div class="dc-two-column dc-two-column--hero">
      <div>
        <div class="dc-label">1000 × 1500 穿着图预览</div>
        <div class="dc-model-preview" data-ui="model-preview">
          <div class="dc-model-preview__frame">
            <div class="dc-model-preview__person">LOWER BODY / LEGS</div>
            <div class="dc-model-preview__product" data-ui="model-source">请选择商品锚点素材</div>
          </div>
          <div class="dc-model-preview__meta" data-ui="model-meta"></div>
        </div>
      </div>
      <form class="dc-form" data-form="model-design">
        <div class="dc-form-grid">
          <label>商品锚点素材<select name="sourceAssetId"><option value="">请选择</option></select></label>
          <label>搭配方向<select name="sceneStyle"><option value="casual">秋冬休闲</option><option value="business-casual">商务休闲</option><option value="outdoor-work">户外 / 工装</option><option value="home">居家</option></select></label>
          <label>取景<select name="framing"><option value="lower-body">小腿 / 双脚为主</option><option value="knee-down">膝盖以下</option><option value="full-body">全身</option></select></label>
          <label>背景<select name="backgroundMode"><option value="white">纯白 / 浅白</option><option value="studio">简洁棚拍</option><option value="scene">轻场景</option></select></label>
        </div>
        <fieldset class="dc-binding"><legend>Product Truth 约束</legend><div class="dc-binding-grid">
          <label>适用人群<select name="genderFactPath"><option value="targetGender">适用人群</option></select></label>
          <label>季节<select name="seasonFactPath"><option value="season">季节</option></select></label>
          <label>长度 / 类型<select name="lengthFactPath"><option value="lengthType">长度 / 类型</option></select></label>
          <label>商品保护<input value="颜色、花型、长度、袜口、结构、Logo 不得改写" disabled></label>
        </div></fieldset>
        <section class="dc-layout-panel">
          <div class="dc-layout-panel__head"><div><h3>穿着图微调</h3><p>只调构图，不改变商品事实。</p></div><button type="button" class="dc-button" data-action="model-reset-layout">恢复默认</button></div>
          <div class="dc-layout-groups">
            <div class="dc-layout-group"><h4>模特主体</h4>
              <label class="dc-layout-control"><span>主体大小</span><input type="range" min="75" max="135" value="100" step="1" name="modelScale"><output data-model-output="modelScale">100</output></label>
              <label class="dc-layout-control"><span>左右位置</span><input type="range" min="-20" max="20" value="0" step="1" name="modelOffsetX"><output data-model-output="modelOffsetX">0</output></label>
              <label class="dc-layout-control"><span>上下位置</span><input type="range" min="-20" max="20" value="0" step="1" name="modelOffsetY"><output data-model-output="modelOffsetY">0</output></label>
            </div>
          </div>
        </section>
        <div class="dc-form-actions dc-form-actions--end"><button type="submit" class="dc-button dc-button--primary">保存穿着图设置</button><button type="button" class="dc-button" data-action="create-model-task">创建 AI 穿着图任务</button></div>
      </form>
    </div>
  </section>`;
}

function injectStyle() {
  if (document.getElementById("dc-model-v1-style")) return;
  const style = document.createElement("style");
  style.id = "dc-model-v1-style";
  style.textContent = `.dc-model-preview{aspect-ratio:2/3;max-width:520px;margin:auto;background:#f7f5f1;border:1px solid #e2e6e4;border-radius:18px;position:relative;overflow:hidden;box-sizing:border-box;padding:7%}.dc-model-preview__frame{height:86%;border-radius:18px;background:linear-gradient(180deg,#fdfdfc,#ede9e2);position:relative;overflow:hidden}.dc-model-preview__person{position:absolute;inset:8% 18% 8%;border-radius:45% 45% 18% 18%;background:linear-gradient(180deg,#dedbd5,#c8c4bc);display:flex;align-items:flex-end;justify-content:center;padding-bottom:8%;font-size:11px;color:#6f6b64;letter-spacing:.08em;transform-origin:center}.dc-model-preview__product{position:absolute;left:22%;right:22%;bottom:12%;min-height:72px;border:1px solid #d8ddd9;background:#fff;border-radius:14px;display:flex;align-items:center;justify-content:center;text-align:center;padding:10px;color:#39453f;font-size:12px}.dc-model-preview__meta{height:14%;display:flex;align-items:center;justify-content:center;text-align:center;color:#68736e;font-size:11px}`;
  document.head.appendChild(style);
}

function form() { return document.querySelector('[data-form="model-design"]'); }
function preview() { return document.querySelector('[data-ui="model-preview"]'); }

function collect() {
  const f = form();
  return {
    templateId:TEMPLATE_ID,
    fieldBindings:{targetGender:f.elements.genderFactPath.value||"targetGender",season:f.elements.seasonFactPath.value||"season",lengthType:f.elements.lengthFactPath.value||"lengthType"},
    assetIds:[text(f.elements.sourceAssetId.value)].filter(Boolean),
    layoutAdjustments:{modelScale:Number(f.elements.modelScale.value||100),modelOffsetX:Number(f.elements.modelOffsetX.value||0),modelOffsetY:Number(f.elements.modelOffsetY.value||0)},
    presentation:{sceneStyle:f.elements.sceneStyle.value||"casual",framing:f.elements.framing.value||"lower-body",backgroundMode:f.elements.backgroundMode.value||"white"},
    lifecycleStatus:"draft",
    metadata:{pageType:PAGE_TYPE,operatorAdjustable:true,sourceAnchored:true,aiGeneratedSubject:true}
  };
}

function refreshLayout() {
  const f=form(), p=preview(); if(!f||!p) return;
  const person=p.querySelector(".dc-model-preview__person");
  person.style.transform=`translate(${Number(f.elements.modelOffsetX.value||0)}%,${Number(f.elements.modelOffsetY.value||0)}%) scale(${Number(f.elements.modelScale.value||100)/100})`;
  ["modelScale","modelOffsetX","modelOffsetY"].forEach((name)=>{const out=document.querySelector(`[data-model-output="${name}"]`);if(out) out.value=f.elements[name].value;});
}

function render(workbench,savedSpec=null) {
  const f=form(), p=preview(); if(!f||!p||!workbench) return;
  const data=workbench.product?.productData||{}, materials=workbench.materials||{}, spec=savedSpec||{}, presentation=spec.presentation||{}, layout=spec.layout_adjustments||spec.layoutAdjustments||{};
  const sources=[...(materials.whiteBackground||[]),...(materials.sku||[]),...(materials.product||[]),...(materials.real||[])];
  const seen=new Set(); const candidates=sources.filter((a)=>a?.id&&!seen.has(a.id)&&seen.add(a.id));
  const selected=(Array.isArray(spec.asset_ids)?spec.asset_ids[0]:null)||materials.whiteBackground?.[0]?.id||materials.sku?.[0]?.id||candidates[0]?.id||"";
  f.elements.sourceAssetId.innerHTML=`<option value="">请选择商品锚点素材</option>`+candidates.map((a)=>`<option value="${escapeHtml(a.id)}" ${a.id===selected?"selected":""}>${escapeHtml(a.original_name||a.canonical_name||a.id)}</option>`).join("");
  f.elements.sceneStyle.value=presentation.sceneStyle||"casual";f.elements.framing.value=presentation.framing||"lower-body";f.elements.backgroundMode.value=presentation.backgroundMode||"white";
  f.elements.modelScale.value=String(layout.modelScale||100);f.elements.modelOffsetX.value=String(layout.modelOffsetX||0);f.elements.modelOffsetY.value=String(layout.modelOffsetY||0);
  const asset=candidates.find((a)=>a.id===f.elements.sourceAssetId.value);
  p.querySelector('[data-ui="model-source"]').innerHTML=`<div><b>${escapeHtml(asset?.original_name||"请选择商品素材")}</b><br><span>商品锚点 · 不改商品本体</span></div>`;
  p.querySelector('[data-ui="model-meta"]').textContent=`${text(data.targetGender)||"人群待确认"} · ${text(data.season)||"季节待确认"} · ${text(data.lengthType)||"类型待确认"}`;
  refreshLayout();
}

async function getWorkbench(){return (await aioneApi(`/api/v1/design-center/workbench?product=${encodeURIComponent(productRef())}`)).workbench;}
async function load(){const wb=await getWorkbench();let spec=localSnapshotSpec;if(!isSnapshot()){try{spec=(await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/pages/${PAGE_TYPE}`)).pageSpec||null;}catch(_){}}render(wb,spec);return wb;}

async function save(event){event?.preventDefault();const spec=collect();if(!spec.assetIds.length)return window.alert("请先选择商品锚点素材。");const wb=await getWorkbench();if(isSnapshot()){localSnapshotSpec={...spec,id:"pagespec_preview_model",page_type:PAGE_TYPE,template_id:TEMPLATE_ID,asset_ids:spec.assetIds,layout_adjustments:spec.layoutAdjustments};render(wb,localSnapshotSpec);return window.alert("穿着图设置已保存到验收快照（不写数据库）。");}const payload=await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/pages/${PAGE_TYPE}`,{method:"PATCH",body:JSON.stringify(spec)});render(wb,payload.pageSpec);window.alert("穿着图设置已保存。");}

async function createTask(){const spec=collect();if(!spec.assetIds.length)return window.alert("请先选择商品锚点素材。");const wb=await getWorkbench();if(isSnapshot())return window.alert("AI 穿着图任务已在验收快照中模拟创建；不会写数据库。");const result=await aioneApi(`/api/v1/products/${encodeURIComponent(wb.product.id)}/design/tasks`,{method:"POST",body:JSON.stringify({templateId:TEMPLATE_ID,taskType:"generate_source_anchored_model_wear",inputAssetIds:spec.assetIds,inputFactSnapshot:wb.product.productData||{},instructionSnapshot:{pageType:PAGE_TYPE,pageSpec:spec,contract:"AIONE Source-Anchored Model Wear V1",preserveProductTruth:true,generateOnly:["model","pose","background","styling_context"],mustPreserve:["actual_color","pattern","length","cuff","structure","logo"]}})});window.alert(`AI 穿着图任务已创建：${result.task?.id||"已复用现有任务"}`);}

export async function initDesignCenterModelV1(){const root=document.querySelector("[data-design-center-root]"),white=root?.querySelector('[data-section="white-bg-design"]');if(!root||!white||root.querySelector('[data-section="model-design"]'))return;injectStyle();white.insertAdjacentHTML("afterend",sectionMarkup());const f=form();f?.addEventListener("submit",save);f?.addEventListener("input",refreshLayout);f?.addEventListener("change",refreshLayout);document.querySelector('[data-action="model-reset-layout"]')?.addEventListener("click",()=>{f.elements.modelScale.value="100";f.elements.modelOffsetX.value="0";f.elements.modelOffsetY.value="0";refreshLayout();});document.querySelector('[data-action="create-model-task"]')?.addEventListener("click",createTask);await load();}
