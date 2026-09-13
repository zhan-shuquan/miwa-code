const PRODUCT_REF = "MH0000002";
const PANEL_ID = "aione-product-home-weekly-acceptance";

const pageTypes = [
  ["主图","Hero / Product Tag Card / hybrid"],
  ["SKU / 颜色图","deterministic"],
  ["白底商品图","hybrid cleanup + normalize"],
  ["模特 / 穿着图","source-anchored AI"],
  ["材质 / 质地图","deterministic + real source"],
  ["尺寸 / 尺码图","truthful deterministic fallback"],
  ["商品仕様图","confirmed facts only"],
  ["细节 / 结构图","source-anchored detail"]
];

const engineCapabilities = [
  "normalize_canvas",
  "deterministic_copy_overlay",
  "benefit_feature_image",
  "compose_sku_color_image",
  "compose_white_background_product",
  "generate_source_anchored_model_wear",
  "compose_material_texture_image",
  "compose_truthful_size_guide",
  "compose_deterministic_product_spec",
  "compose_source_anchored_detail_image"
];

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>\"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[ch]));
}

function productLink(section){
  const params=new URLSearchParams({center:"product-center",product:PRODUCT_REF,section});
  return `#/product-home?${params.toString()}`;
}

function installStyles(){
  if(document.getElementById("ph-weekly-acceptance-style")) return;
  const style=document.createElement("style");
  style.id="ph-weekly-acceptance-style";
  style.textContent=`
    .ph-weekly{margin-top:16px;border:1px solid #dce6e1;border-radius:14px;background:#fff;overflow:hidden}
    .ph-weekly__head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid #e8eeeb;background:linear-gradient(180deg,#fff,#fbfcfb)}
    .ph-weekly__head h2{margin:2px 0 5px;font-size:18px;color:#202124}.ph-weekly__head p{margin:0;color:#5f6368;font-size:12px;line-height:1.65}
    .ph-weekly__badge{padding:6px 9px;border-radius:999px;background:#eaf5ef;color:#176b4d;font-size:11px;font-weight:800;white-space:nowrap}
    .ph-weekly__body{padding:18px 22px 22px;display:grid;gap:16px}
    .ph-weekly__summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    .ph-weekly__metric{border:1px solid #e6ece9;border-radius:10px;background:#fbfcfb;padding:13px}.ph-weekly__metric span{display:block;font-size:10px;color:#7b857f}.ph-weekly__metric b{display:block;margin-top:4px;font-size:20px;color:#202124}.ph-weekly__metric small{display:block;margin-top:3px;font-size:10px;color:#9aa0a6}
    .ph-weekly__actions{display:flex;gap:8px;flex-wrap:wrap}.ph-weekly__actions a{height:34px;padding:0 12px;border:1px solid #d5e0db;border-radius:8px;background:#fff;color:#3c4043;text-decoration:none;font-size:11px;font-weight:750;display:inline-flex;align-items:center}.ph-weekly__actions a.primary{background:#176b4d;border-color:#176b4d;color:#fff}
    .ph-weekly__grid{display:grid;grid-template-columns:1.05fr .95fr;gap:12px}.ph-weekly__card{border:1px solid #e6ece9;border-radius:11px;padding:14px;background:#fff}.ph-weekly__card h3{margin:0 0 10px;font-size:13px;color:#202124}.ph-weekly__card p{margin:0;color:#66706b;font-size:11px;line-height:1.65}
    .ph-weekly__page-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.ph-weekly__page{border:1px solid #edf0ee;border-radius:8px;background:#fbfcfb;padding:9px 10px}.ph-weekly__page strong{display:block;font-size:11px;color:#202124}.ph-weekly__page span{display:block;margin-top:3px;font-size:9px;color:#7d8782}
    .ph-weekly__engine{display:flex;flex-wrap:wrap;gap:6px}.ph-weekly__engine code{padding:5px 7px;border-radius:7px;background:#f5f7f6;color:#42504a;font-size:9px}
    .ph-weekly__status{margin-top:10px;padding:10px 12px;border-radius:8px;background:#f6faf8;color:#456258;font-size:10px;line-height:1.65}.ph-weekly__status.is-error{background:#fff5f4;color:#a23c33}
    @media(max-width:900px){.ph-weekly__summary{grid-template-columns:repeat(2,minmax(0,1fr))}.ph-weekly__grid{grid-template-columns:1fr}.ph-weekly__page-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function countUniqueAssets(materials){
  const ids=new Set();
  Object.values(materials||{}).forEach((items)=>{ if(Array.isArray(items)) items.forEach((item)=>item?.id&&ids.add(item.id)); });
  return ids.size;
}

function factCount(workbench){
  const p=workbench?.product||{};
  const d=p.productData||{};
  const values=[p.productCode,p.name||p.productName,d.targetGender,d.season,d.lengthType,d.supportedSize,d.setCount,d.material];
  if(Array.isArray(d.actualVariants)&&d.actualVariants.length) values.push(d.actualVariants.join("/"));
  if(Array.isArray(d.sellingPoints)&&d.sellingPoints.length) values.push(d.sellingPoints.join("/"));
  return values.filter((v)=>v!==undefined&&v!==null&&String(v).trim()!=="").length;
}

function baseMarkup(){
  return `<section id="${PANEL_ID}" class="ph-weekly" aria-label="本周工程成果验收">
    <div class="ph-weekly__head">
      <div><span class="phc-eyebrow">ENGINEERING ACCEPTANCE · 本周成果</span><h2>商品之家本周工程成果验收</h2><p>不改变商品之家最终目录，只把已经进入 main 的真实能力集中展示出来，方便直接验证。</p></div>
      <span class="ph-weekly__badge">${PRODUCT_REF}</span>
    </div>
    <div class="ph-weekly__body">
      <div class="ph-weekly__summary">
        <div class="ph-weekly__metric"><span>Product Truth</span><b data-weekly="facts">读取中</b><small>真实商品事实</small></div>
        <div class="ph-weekly__metric"><span>ProductAsset</span><b data-weekly="assets">读取中</b><small>SOURCE / 素材对象</small></div>
        <div class="ph-weekly__metric"><span>图片工作流</span><b>8</b><small>主图到细节图</small></div>
        <div class="ph-weekly__metric"><span>Design Engine</span><b>${engineCapabilities.length}</b><small>已登记执行能力</small></div>
      </div>
      <div class="ph-weekly__actions">
        <a class="primary" href="${productLink("overview")}">打开真实商品工作区</a>
        <a href="${productLink("facts")}">商品事实</a>
        <a href="${productLink("assets")}">商品素材</a>
        <a href="${productLink("design")}">设计中心</a>
        <a href="${productLink("publish")}">发布状态</a>
      </div>
      <div class="ph-weekly__grid">
        <div class="ph-weekly__card"><h3>8 类设计工作流</h3><div class="ph-weekly__page-grid">${pageTypes.map(([name,mode])=>`<div class="ph-weekly__page"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(mode)}</span></div>`).join("")}</div></div>
        <div class="ph-weekly__card"><h3>Design Engine 已接入能力</h3><div class="ph-weekly__engine">${engineCapabilities.map((name)=>`<code>${escapeHtml(name)}</code>`).join("")}</div><div class="ph-weekly__status" data-weekly="status">正在读取 CURRENT 商品工作台；登录态正常时会显示真实 Product Truth 与 ProductAsset 数量。</div></div>
      </div>
      <div class="ph-weekly__grid">
        <div class="ph-weekly__card"><h3>真实闭环</h3><p>SOURCE ProductAsset → Page Spec → DesignTask → Design Engine → DERIVED ProductAsset → 生成结果 → 人工通过 / 重做。设计中心已嵌入商品对象工作区。</p></div>
        <div class="ph-weekly__card"><h3>当前验收目标</h3><p>先用 ${PRODUCT_REF} 的真实白底图验证：素材显示、Page Spec 保存、任务执行、DERIVED 生成、前端回显和人工审核。发布中心接续 Approved 资产进入 Rakuten canonical publish。</p></div>
      </div>
    </div>
  </section>`;
}

async function hydrate(panel){
  try{
    const response=await fetch(`/api/v1/design-center/workbench?product=${encodeURIComponent(PRODUCT_REF)}`,{headers:{Accept:"application/json"},cache:"no-store"});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload=await response.json();
    const workbench=payload?.workbench;
    if(!workbench) throw new Error("workbench missing");
    const facts=panel.querySelector('[data-weekly="facts"]');
    const assets=panel.querySelector('[data-weekly="assets"]');
    const status=panel.querySelector('[data-weekly="status"]');
    if(facts) facts.textContent=String(factCount(workbench));
    if(assets) assets.textContent=String(countUniqueAssets(workbench.materials));
    if(status) status.textContent="CURRENT 后端已返回真实商品工作台。现在可以从上方入口直接进入真实商品事实、素材、设计和发布状态进行前端验收。";
  }catch(error){
    const status=panel.querySelector('[data-weekly="status"]');
    if(status){status.classList.add("is-error");status.textContent=`真实工作台暂未读取成功：${error?.message||error}。静态工程能力仍可查看，但不要把这一步算作 E2E 通过。`;}
  }
}

function shouldMount(){
  const hash=String(location.hash||"");
  if(!hash.startsWith("#/product-home")) return false;
  return !hash.includes("product=");
}

function mount(){
  if(!shouldMount()) return;
  const host=document.getElementById("app-main-host");
  if(!host||document.getElementById(PANEL_ID)) return;
  const welcome=host.querySelector(".phc-home-welcome");
  if(!welcome) return;
  installStyles();
  welcome.insertAdjacentHTML("afterend",baseMarkup());
  const panel=document.getElementById(PANEL_ID);
  if(panel) hydrate(panel);
}

let timer=0;
function schedule(){window.clearTimeout(timer);timer=window.setTimeout(mount,40);}

window.addEventListener("hashchange",schedule);
const observer=new MutationObserver(schedule);
observer.observe(document.documentElement,{childList:true,subtree:true});
schedule();
