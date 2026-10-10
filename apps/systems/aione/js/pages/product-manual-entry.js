import { aioneApi, aioneDownload } from "../services/aione-api-client.js";
const BASE="/api/v1/product-entry";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const FIELDS=[
["localCode","商品货号"],["nameZh","商品名称"],["purchaseUrl","采购链接"],
["purchaseUnitCostCny","采购单价CNY"],["domesticFreightCny","国内运费CNY"],
["setQuantity","套装数量"],["weightG","重量g"],["category","商品分类"],["brand","所属品牌"],
["logisticsMethod","物流方式"],["packagingMethod","包装方式"],["sizeClass","发货尺寸"],["packagingMaterial","日本包装物"],
["packageLengthCm","发货长cm"],["packageWidthCm","发货宽cm"],["packageHeightCm","发货高cm"],
["salePriceJpy","实际售价JPY"],["targetShopRef","目标店铺"],["rakutenTitle","楽天商品名"],
["rakutenCatchCopy","キャッチコピー"],["rakutenGenreId","楽天ジャンルID"],["rakutenNotice","自由入力行1"],
["pcDescription","PC用商品説明文"],["spDescription","スマートフォン用商品説明文"],["salesDescription","PC用販売説明文"]
];
const NUMS=new Set(["purchaseUnitCostCny","domesticFreightCny","setQuantity","weightG","packageLengthCm","packageWidthCm","packageHeightCm","salePriceJpy"]);
function style(){
 if(document.getElementById("aione-pe-style"))return;
 const s=document.createElement("style");s.id="aione-pe-style";
 s.textContent=".pe-wrap{padding:12px 0}.pe-toolbar{display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap}.pe-toolbar button,.pe-editor button{padding:9px 14px;border:1px solid #dae2dd;border-radius:8px;background:white;cursor:pointer}.pe-toolbar .pe-main,.pe-editor .pe-main{background:#287c58;border-color:#287c58;color:white}.pe-table{border-collapse:collapse;width:100%;background:#fff;margin-top:14px}.pe-table td,.pe-table th{padding:12px;border-bottom:1px solid #e6eae7;text-align:left;font-size:13px}.pe-table th{background:#f7f9f8}.pe-table button{border:0;background:transparent;color:#287c58;cursor:pointer}.pe-editor{padding:18px;border:1px solid #e4eae7;border-radius:12px;background:#fff}.pe-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.pe-field{display:flex;flex-direction:column;gap:6px;font-size:13px;color:#59675f}.pe-field input,.pe-field textarea,.pe-field select{padding:10px;border:1px solid #d9e0db;border-radius:7px;color:#183c28;background:#fff}.pe-field textarea{min-height:70px}.pe-block{padding:20px 0;border-top:1px solid #e7ece9}.pe-actions{padding:14px 0;display:flex;justify-content:flex-end;gap:8px}.pe-alert{padding:12px;border:1px solid #ebcece;background:#fff8f8;color:#9a3838;margin:12px 0}.pe-note{color:#697971;font-size:12px}.pe-sku-row{display:grid;grid-template-columns:repeat(6,minmax(110px,1fr));gap:7px;margin:8px 0}.pe-sku-row input{min-width:0;width:100%;padding:8px;border:1px solid #d9e0db;border-radius:6px}.pe-import{padding:16px;margin-top:12px;background:#fafcfb;border:1px solid #dee8e1;border-radius:9px}.pe-scroll{overflow-x:auto}";
 document.head.append(s);
}
function tags(p){
return FIELDS.map(([k,label],index)=>{
 const isLong=["rakutenCatchCopy","rakutenNotice","pcDescription","spDescription","salesDescription"].includes(k);
 const v=esc(p[k]??"");
 return '<label class="pe-field"><span>'+esc(label)+'</span>'+(isLong?'<textarea name="'+k+'">'+v+'</textarea>':'<input name="'+k+'" type="'+(NUMS.has(k)?"number":"text")+'" '+(NUMS.has(k)?'step="any" min="0" ':'')+'value="'+v+'" '+(k==="localCode"&&p.id?'readonly ':'')+'>')+'</label>';
}).join("");
}
function specTags(p){
return [1,2,3].map(n=>{
 const s=p.specs?.[n-1]||{};
 return '<label class="pe-field">规格'+n+'名称<input name="spec'+n+'Name" value="'+esc(s.name||"")+'"></label><label class="pe-field">规格'+n+'值（用 | 分隔）<input name="spec'+n+'Values" value="'+esc((s.values||[]).join("|"))+'"></label>';
}).join("");
}
function skuMarkup(p){
 const overrides=p.skuOverrides||[];
 return Array.from({length:12},(_,i)=>{
   const o=overrides.find(x=>x.index===i+1)||{};
   const props=[["priceJpy","售价覆盖"],["stock","实际库存"],["purchaseCostCny","采购价覆盖"],["weightG","重量覆盖"],["sizeClass","发货尺寸"],["imageFile","SKU图文件"]];
   return '<details><summary>SKU '+(i+1)+'（仅需覆盖时填写）</summary><div class="pe-sku-row" data-sku="'+(i+1)+'">'+props.map(([k,l])=>'<input data-key="'+k+'" placeholder="'+l+'" value="'+esc(o[k]??"")+'">').join("")+'</div></details>';
 }).join("");
}
function formData(form,p){
 const data=new FormData(form),v={version:p.version};
 for(const [k] of FIELDS){const x=String(data.get(k)||"").trim();v[k]=NUMS.has(k)?(x===""?null:Number(x)):x;}
 v.autoPublish=data.get("autoPublish");
 v.specs=[1,2,3].map(n=>({name:String(data.get("spec"+n+"Name")||"").trim(),values:String(data.get("spec"+n+"Values")||"").split("|").map(x=>x.trim()).filter(Boolean)})).filter(x=>x.name);
 v.skuOverrides=[];
 for(const el of form.querySelectorAll("[data-sku]")){
  const obj={index:Number(el.dataset.sku)};
  for(const input of el.querySelectorAll("[data-key]"))obj[input.dataset.key]=input.value.trim();
  if(Object.keys(obj).some(k=>k!=="index"&&obj[k]!==""))v.skuOverrides.push(obj);
 }
 return v;
}
function editor(host,p={}){
 style();
 host.innerHTML='<section class="pe-editor"><div class="pe-toolbar"><h2>'+(p.id?"编辑商品":"新建商品")+'</h2><button data-pe-back>返回商品列表</button></div><form data-pe-form><h3>商品、采购与物流</h3><div class="pe-grid">'+tags(p)+'</div><div class="pe-block"><h3>SKU规格（最多3层，组合最多12个）</h3><div class="pe-grid">'+specTags(p)+'</div><p class="pe-note">SKU售价、库存不同才填写差异。未确认库存保持空白。</p>'+skuMarkup(p)+'</div><div class="pe-block"><label class="pe-field">自动上架<select name="autoPublish"><option value="否" '+(!p.autoPublish?"selected":"")+'>否（默认）</option><option value="是" '+(p.autoPublish?"selected":"")+'>是（仅申请发布，需正式校验）</option></select></label></div><div class="pe-actions"><button type="button" data-pe-cancel>取消</button><button type="submit" class="pe-main">保存商品草稿</button></div></form></section>';
 host.querySelectorAll("[data-pe-back],[data-pe-cancel]").forEach(b=>b.onclick=()=>showProducts(host));
 const form=host.querySelector("form");form.onsubmit=async e=>{
   e.preventDefault();const btn=form.querySelector('[type="submit"]');btn.disabled=true;
   try {
     const payload=formData(form,p);
     await aioneApi(p.id?BASE+"/"+encodeURIComponent(p.id):BASE,{method:p.id?"PATCH":"POST",body:JSON.stringify(payload)});
     await showProducts(host,"保存成功，当前仅为商品草稿，未调用乐天API。");
   }catch(ex){alert("保存失败："+ex.message);}finally{btn.disabled=false;}
 };
}
async function fileBase64(file){
 const bytes=new Uint8Array(await file.arrayBuffer());let binary="";
 for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
function importer(host){
 const target=host.querySelector("[data-pe-import]");
 target.innerHTML='<div class="pe-import"><h3>批量导入</h3><p class="pe-note">WPS单品表或AIONE批量模板，先预览、后确认，只新增草稿，不覆盖已有商品。</p><input type="file" accept=".xlsx" data-pe-file><div data-pe-preview></div><button data-pe-close>关闭</button></div>';
 target.querySelector("[data-pe-close]").onclick=()=>target.innerHTML="";
 target.querySelector("[data-pe-file]").onchange=async e=>{
   const file=e.target.files?.[0];if(!file)return;
   const panel=target.querySelector("[data-pe-preview]");panel.textContent="正在检查…";
   try{
     if(file.size>1900000)throw new Error("Excel超过1.9MB，请拆分批次。");
     const body={filename:file.name,base64:await fileBase64(file)};
     const data=await aioneApi(BASE+"/import/preview",{method:"POST",body:JSON.stringify(body)});
     panel.innerHTML='<p>共'+data.validCount+'件商品</p><div class="pe-scroll"><table class="pe-table"><tr><th>货号</th><th>商品</th><th>处理方式</th></tr>'+data.items.map(i=>'<tr><td>'+esc(i.localCode)+'</td><td>'+esc(i.nameZh)+'</td><td>'+esc(i.action)+'</td></tr>').join("")+'</table></div>'+(data.warnings||[]).map(w=>'<p class="pe-note">'+esc(w)+'</p>').join("")+'<button data-pe-commit>确认导入新商品草稿</button>';
     panel.querySelector("[data-pe-commit]").onclick=async()=>{
       if(!confirm("确认导入新商品草稿？已存在货号不会覆盖，不会调用乐天API。"))return;
       try{const res=await aioneApi(BASE+"/import/commit",{method:"POST",body:JSON.stringify({...body,confirmed:true})});await showProducts(host,"已导入："+res.successCount+"件；失败/重复："+res.failedCount+"件。");}
       catch(err){panel.innerHTML='<div class="pe-alert">'+esc(err.message)+'</div>';}
     };
   }catch(err){panel.innerHTML='<div class="pe-alert">'+esc(err.message)+'</div>';}
 };
}
export async function showProducts(host,notice=""){
 style();
 host.innerHTML='<section class="phc pe-wrap"><div class="pe-toolbar"><div><h2>商品一览</h2><p class="pe-note">真实商品数据 · 单品编辑 · 批量导入与导出</p></div><div><button class="pe-main" data-pe-new>＋ 新建商品</button> <button data-pe-import-open>批量导入</button> <button data-pe-export>批量导出</button> <button data-pe-template>下载模板</button></div></div>'+(notice?'<p>'+esc(notice)+'</p>':"")+'<p><input data-pe-q placeholder="搜索货号/名称" style="padding:10px;border:1px solid #dce4df;border-radius:7px;width:320px"></p><div data-pe-table>读取中…</div><div data-pe-import></div></section>';
 host.querySelector("[data-pe-new]").onclick=()=>editor(host,{});
 host.querySelector("[data-pe-import-open]").onclick=()=>importer(host);
 host.querySelector("[data-pe-export]").onclick=async()=>{try{await aioneDownload(BASE+"/export.xlsx");}catch(e){alert("导出失败："+e.message);}};
 host.querySelector("[data-pe-template]").onclick=async()=>{try{await aioneDownload(BASE+"/export.xlsx?q=__AIONE_EMPTY_TEMPLATE__");}catch(e){alert("模板下载失败："+e.message);}};
 const load=async()=>{
   const value=host.querySelector("[data-pe-q]")?.value||"";
   const area=host.querySelector("[data-pe-table]");if(!area)return;
   try{
     const res=await aioneApi(BASE+"?q="+encodeURIComponent(value)+"&limit=200");
     area.innerHTML='<div class="pe-scroll"><table class="pe-table"><thead><tr><th>本地货号</th><th>AIONE编码</th><th>商品名称</th><th>售价JPY</th><th>版本</th><th>自动上架</th><th></th></tr></thead><tbody>'+res.items.map(p=>'<tr><td>'+esc(p.localCode)+'</td><td>'+esc(p.productCode)+'</td><td>'+esc(p.nameZh)+'</td><td>'+esc(p.salePriceJpy??"—")+'</td><td>'+esc(p.version)+'</td><td>'+esc(p.autoPublish?"是（待校验）":"否")+'</td><td>'+(p.readOnly?'<span class="pe-note">既有商品（只读）</span>':'<button data-pe-edit="'+esc(p.id)+'">编辑</button>')+'</tr>').join("")+(res.items.length?"":'<tr><td colspan="7">暂无商品，请新增或导入。</td></tr>')+'</tbody></table></div>';
     area.querySelectorAll("[data-pe-edit]").forEach(b=>b.onclick=async()=>{try{const d=await aioneApi(BASE+"/"+encodeURIComponent(b.dataset.peEdit));editor(host,d.product);}catch(e){alert("读取失败："+e.message);}});
   }catch(err){area.innerHTML='<div class="pe-alert">商品接口未就绪："+esc(err.message)+"。未显示任何模拟数据。</div>';}
 };
 let task;host.querySelector("[data-pe-q]").oninput=()=>{clearTimeout(task);task=setTimeout(load,250);};
 await load();
}
export async function initProductManualEntry(){
 const host=document.getElementById("app-main-host");if(!host)return false;
 await showProducts(host);return true;
}
