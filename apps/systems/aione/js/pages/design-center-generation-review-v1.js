import { aioneApi } from "../services/aione-api-client.js";

const TASK_LABELS = {
  compose_product_hero: "主图",
  compose_sku_color_image: "SKU / 颜色图",
  compose_white_background_product: "白底商品图",
  generate_source_anchored_model_wear: "模特 / 穿着图",
  compose_material_texture_image: "材质 / 质地图",
  compose_truthful_size_guide: "尺寸 / 尺码图",
  compose_deterministic_product_spec: "商品仕様图",
  compose_source_anchored_detail_image: "细节 / 结构图",
  benefit_feature_image: "卖点图",
  deterministic_copy_overlay: "文案合成图",
  normalize_canvas: "画布规范化"
};

const STATUS_LABELS = {
  draft: "待确认",
  proposed: "待批准",
  approved: "待生成",
  running: "生成中",
  completed: "已生成",
  failed: "生成失败"
};

const REVIEW_LABELS = {
  pending: "待验收",
  approved: "已通过",
  rejected: "已拒绝",
  regenerate_requested: "待重做"
};

let state = { productId:null, tasks:[], outputs:new Map(), busy:new Set() };

function root(){ return document.querySelector("[data-design-center-root]"); }
function text(value){ return String(value ?? "").trim(); }
function escapeHtml(value){ return text(value).replace(/[&<>'"]/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch])); }
function productRef(){ return new URLSearchParams(location.search).get("product") || "MH0000002"; }
function isSnapshot(){ return new URLSearchParams(location.search).get("snapshot") === "1"; }

function injectStyle(){
  if(document.getElementById("dc-generation-review-style")) return;
  const style=document.createElement("style");
  style.id="dc-generation-review-style";
  style.textContent=`
    .dc-generation-board{display:grid;gap:14px}
    .dc-generation-empty{padding:30px;border:1px dashed #d7ded9;border-radius:16px;text-align:center;color:#6f7973;background:#fafbfa}
    .dc-generation-card{border:1px solid #dfe5e1;border-radius:16px;background:#fff;padding:16px;display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,320px);gap:18px}
    .dc-generation-card__head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}
    .dc-generation-card__head h3{margin:0;font-size:16px;color:#24342d}.dc-generation-card__head p{margin:4px 0 0;color:#77817b;font-size:11px}
    .dc-generation-status{display:inline-flex;align-items:center;padding:5px 9px;border-radius:999px;background:#f1f4f2;color:#4d5b54;font-size:11px;font-weight:700;white-space:nowrap}
    .dc-generation-status.is-ready{background:#edf6ef;color:#2f6b3b}.dc-generation-status.is-warning{background:#fff4dd;color:#8a5d00}.dc-generation-status.is-error{background:#fff0ee;color:#a44437}
    .dc-generation-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.dc-generation-actions button{min-height:34px}
    .dc-generation-output{border:1px solid #e1e6e3;border-radius:14px;background:#f8faf8;min-height:220px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
    .dc-generation-output img{display:block;width:100%;height:100%;max-height:360px;object-fit:contain;background:#fff}
    .dc-generation-output__placeholder{padding:24px;text-align:center;color:#7a847e;font-size:12px}.dc-generation-output__meta{font-size:10px;color:#7b847f;margin-top:7px;word-break:break-all}
    .dc-generation-review-note{margin-top:10px;padding:10px 12px;border-radius:10px;background:#f7f8f7;color:#65706a;font-size:11px;line-height:1.5}
    @media(max-width:800px){.dc-generation-card{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function markup(){
  return `<section class="dc-card" data-section="generation-review">
    <div class="dc-section-head">
      <div><span class="dc-step">04</span><div><h2>生成结果与人工验收</h2><p>统一闭环：确认任务 → Design Engine 生成 → 直接看图 → 通过或重做。</p></div></div>
      <button type="button" class="dc-button" data-action="refresh-generation-review">刷新结果</button>
    </div>
    <div class="dc-generation-board" data-ui="generation-board"><div class="dc-generation-empty">正在读取当前商品的设计任务…</div></div>
  </section>`;
}

async function resolveProductId(){
  const payload=await aioneApi(`/api/v1/design-center/workbench?product=${encodeURIComponent(productRef())}`);
  return payload?.workbench?.product?.id || null;
}

async function loadOutputs(task){
  if(task.task_status!=="completed") return [];
  try{
    const payload=await aioneApi(`/api/v1/design/tasks/${encodeURIComponent(task.id)}/outputs`);
    return Array.isArray(payload.outputs)?payload.outputs:[];
  }catch(_){ return []; }
}

function statusClass(task){
  if(task.task_status==="failed") return "is-error";
  if(task.task_status==="completed" && task.review_status==="approved") return "is-ready";
  if(task.task_status==="completed" || task.task_status==="approved") return "is-warning";
  return "";
}

function reviewText(task){
  if(task.task_status!=="completed") return STATUS_LABELS[task.task_status] || task.task_status || "未知";
  return REVIEW_LABELS[task.review_status || "pending"] || task.review_status || "待验收";
}

function taskTitle(task){ return TASK_LABELS[task.task_type] || task.template_name || task.task_type || "设计任务"; }
function assetContentUrl(asset){ return `/api/v1/product-assets/${encodeURIComponent(asset.id)}/content`; }

function outputMarkup(task, outputs){
  const output=outputs[0];
  if(output){
    return `<div><div class="dc-generation-output"><img src="${assetContentUrl(output)}" alt="${escapeHtml(taskTitle(task))} 生成结果" loading="lazy"></div><div class="dc-generation-output__meta">${escapeHtml(output.canonical_name || output.id)} · DERIVED ProductAsset</div></div>`;
  }
  const message=task.task_status==="running"?"Design Engine 正在生成…":task.task_status==="failed"?"本次生成失败，可调整设置后重新创建任务。":task.task_status==="completed"?"任务已完成，但尚未读取到 DERIVED 图片。":"确认后才会生成正式 DERIVED 图片。";
  return `<div class="dc-generation-output"><div class="dc-generation-output__placeholder">${escapeHtml(message)}</div></div>`;
}

function actionMarkup(task){
  const busy=state.busy.has(task.id);
  if(task.task_status==="draft" || task.task_status==="proposed" || task.task_status==="approved"){
    return `<button type="button" class="dc-button dc-button--primary" data-task-action="confirm-generate" data-task-id="${escapeHtml(task.id)}" ${busy?"disabled":""}>${busy?"处理中…":"确认并生成"}</button>`;
  }
  if(task.task_status==="failed"){
    return `<button type="button" class="dc-button" data-task-action="refresh" data-task-id="${escapeHtml(task.id)}">刷新状态</button>`;
  }
  if(task.task_status==="completed" && (task.review_status||"pending")==="pending"){
    return `<button type="button" class="dc-button dc-button--primary" data-task-action="review-approve" data-task-id="${escapeHtml(task.id)}" ${busy?"disabled":""}>通过</button><button type="button" class="dc-button" data-task-action="review-regenerate" data-task-id="${escapeHtml(task.id)}" ${busy?"disabled":""}>重做</button>`;
  }
  return `<button type="button" class="dc-button" data-task-action="refresh" data-task-id="${escapeHtml(task.id)}">刷新</button>`;
}

function cardMarkup(task){
  const outputs=state.outputs.get(task.id)||[];
  const failure=task.failure_code?`<div class="dc-generation-review-note">失败原因：${escapeHtml(task.failure_code)}</div>`:"";
  const review=task.review_status==="regenerate_requested"?`<div class="dc-generation-review-note">已标记重做。请回到对应图片类型调整素材/字段/版式后重新创建任务，原结果继续保留为历史证据。</div>`:"";
  return `<article class="dc-generation-card">
    <div>
      <div class="dc-generation-card__head"><div><h3>${escapeHtml(taskTitle(task))}</h3><p>${escapeHtml(task.template_name || task.template_code || task.template_id || "")}</p></div><span class="dc-generation-status ${statusClass(task)}">${escapeHtml(reviewText(task))}</span></div>
      <div class="dc-generation-review-note">Task：${escapeHtml(task.id)}<br>执行方式由 Design Engine Router 决定；生成后必须由人工查看实际图片再确认。</div>
      ${failure}${review}
      <div class="dc-generation-actions">${actionMarkup(task)}</div>
    </div>
    ${outputMarkup(task,outputs)}
  </article>`;
}

function render(){
  const host=root()?.querySelector('[data-ui="generation-board"]');
  if(!host) return;
  if(!state.tasks.length){host.innerHTML='<div class="dc-generation-empty">当前商品还没有设计任务。先在上方某个图片类型点击“创建设计任务”。</div>';return;}
  host.innerHTML=state.tasks.map(cardMarkup).join("");
}

async function load(){
  if(!state.productId) state.productId=await resolveProductId();
  if(!state.productId) throw new Error("当前商品 ID 未解析。");
  const payload=await aioneApi(`/api/v1/products/${encodeURIComponent(state.productId)}/design/tasks`);
  state.tasks=Array.isArray(payload.tasks)?payload.tasks:[];
  const pairs=await Promise.all(state.tasks.map(async(task)=>[task.id,await loadOutputs(task)]));
  state.outputs=new Map(pairs);
  render();
}

async function confirmAndGenerate(taskId){
  state.busy.add(taskId);render();
  try{
    let task=state.tasks.find((item)=>item.id===taskId);
    if(!task) return;
    if(task.task_status==="draft"){
      const proposed=await aioneApi(`/api/v1/design/tasks/${encodeURIComponent(taskId)}/propose`,{method:"POST",body:"{}"});
      task=proposed.task;
    }
    if(task.task_status==="proposed"){
      const approved=await aioneApi(`/api/v1/design/tasks/${encodeURIComponent(taskId)}/approve`,{method:"POST",body:"{}"});
      task=approved.task;
    }
    if(task.task_status==="approved"){
      await aioneApi(`/api/v1/design/tasks/${encodeURIComponent(taskId)}/execute`,{method:"POST",body:"{}"});
    }
    await load();
  }finally{state.busy.delete(taskId);render();}
}

async function review(taskId,outcome){
  state.busy.add(taskId);render();
  try{
    await aioneApi(`/api/v1/design/tasks/${encodeURIComponent(taskId)}/review`,{method:"POST",body:JSON.stringify({outcome,detail:{source:"design-center-generation-review-v1",operatorAction:outcome,reviewedAt:new Date().toISOString()}})});
    await load();
  }finally{state.busy.delete(taskId);render();}
}

function bind(){
  const r=root();
  r?.querySelector('[data-action="refresh-generation-review"]')?.addEventListener("click",()=>load().catch((e)=>window.alert(e.message)));
  r?.querySelector('[data-section="generation-review"]')?.addEventListener("click",(event)=>{
    const button=event.target.closest("[data-task-action]"); if(!button)return;
    const id=button.dataset.taskId,action=button.dataset.taskAction;
    if(action==="confirm-generate") confirmAndGenerate(id).catch((e)=>window.alert(e.message));
    if(action==="review-approve") review(id,"approve").catch((e)=>window.alert(e.message));
    if(action==="review-regenerate") review(id,"regenerate").catch((e)=>window.alert(e.message));
    if(action==="refresh") load().catch((e)=>window.alert(e.message));
  });
}

export async function initDesignCenterGenerationReviewV1(){
  const r=root(); if(!r || r.querySelector('[data-section="generation-review"]'))return;
  injectStyle();
  const detail=r.querySelector('[data-section="detail-design"]') || r.lastElementChild;
  detail?.insertAdjacentHTML("afterend",markup());
  bind();
  if(isSnapshot()){
    const host=r.querySelector('[data-ui="generation-board"]');
    if(host) host.innerHTML='<div class="dc-generation-empty">验收快照：真实生成与人工审核只在 CURRENT 登录环境执行；这里用于确认工作流入口和布局。</div>';
    return;
  }
  await load();
}
