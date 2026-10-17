import { aioneApi,aioneImageBlobInfo } from "../services/aione-api-client.js";
import { renderErpGrid } from "../components/erp-data-grid.js";
const api="/api/v1/product-entry";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function kind(name,role){
 const suffix=String(name||"").toLowerCase().match(/_([^_/]+)\.(jpg|jpeg|png|webp)$/)?.[1]||"";
 if(suffix==="ma")return "white";
 if(/^sku\d+$/.test(suffix)||role==="source_sku_image")return "sku";
 if(/^m\d+$/.test(suffix))return "optimized";
 if(suffix==="01"||role==="source_main_image")return "main";
 if(/^\d{2}$/.test(suffix)&&Number(suffix)>=2)return "detail";
 return "other";
}
function panel(host,title,subtitle){
 host.innerHTML='<section class="phc pe-wrap" style="width:100%;min-width:0"><div class="pe-toolbar"><div><h2>'+esc(title)+'</h2><p class="pe-note">'+esc(subtitle)+'</p></div></div><p><input data-pl-search placeholder="搜索商品货号 / 名称" style="width:300px;max-width:100%;padding:8px;border:1px solid #dce4df;border-radius:6px"></p><div data-pl-grid>读取真实资料中…</div></section>';
 return host.querySelector("[data-pl-grid]");
}
function marker(assets){
 if(!assets.length)return "—";
 const view=assets.slice(0,3).map(a=>'<button type="button" data-asset="'+esc(a.id)+'" title="'+esc(a.original_name||a.file_name||"图片")+'" style="background:#f5f8f6;border:1px solid #dce4df;border-radius:4px;width:42px;height:38px;cursor:pointer">▧</button>').join("");
 return '<span style="display:flex;gap:3px;align-items:center">'+view+(assets.length>3?'<small>+'+(assets.length-3)+'</small>':"")+'</span>';
}
export async function showProductImages(host){
 const area=panel(host,"图片列表","每个商品货号一行 · 主图1张 + 详情图最多19张 · SKU/白底/优化图独立管理");
 let rows=[];
 const cols=[
 {key:"localCode",label:"商品货号",minWidth:105},
 {key:"white",label:"白底",minWidth:90,render:r=>marker(r.groups.white)},
 {key:"main",label:"首次主图",minWidth:90,render:r=>marker(r.groups.main)},
 {key:"detail",label:"详情图",minWidth:130,render:r=>marker(r.groups.detail)},
 {key:"sku",label:"SKU图",minWidth:100,render:r=>marker(r.groups.sku)},
 {key:"optimized",label:"优化主图",minWidth:110,render:r=>marker(r.groups.optimized)},
 {key:"rakutenImageCount",label:"乐天图片",minWidth:115,render:r=>{const count=r.groups.main.length+r.groups.detail.length;return count>20||r.groups.detail.length>19?'<strong style="color:#aa3c34" title="主图1张+详情图最多19张，超过时不可提交乐天">超限 '+count+'/20</strong>':'<span title="当前分类图片数量；不代表实际发布已选择的图片">候选 '+count+'/20</span>'}},
 {key:"count",label:"素材数量",type:"number",minWidth:90},
 {key:"nameZh",label:"商品名称",defaultVisible:false,minWidth:180}
 ];
 const cachedThumbnails=new Map();
 const draw=()=>{const term=host.querySelector("[data-pl-search]").value.toLowerCase();renderErpGrid(area,{id:"product-images",columns:cols,rows:rows.filter(r=>[r.localCode,r.nameZh].some(v=>String(v||"").toLowerCase().includes(term))),empty:"没有图片资料"});
 const placeholders=[...area.querySelectorAll("[data-asset]")];let cursor=0;
 const loadThumb=async()=>{while(cursor<placeholders.length){const b=placeholders[cursor++];if(!b.isConnected)continue;let src=cachedThumbnails.get(b.dataset.asset);if(!src){try{src=(await aioneImageBlobInfo("/api/v1/product-assets/"+encodeURIComponent(b.dataset.asset)+"/content?webpSize=64")).url;cachedThumbnails.set(b.dataset.asset,src)}catch{continue}}if(b.isConnected){b.textContent="";const image=document.createElement("img");image.alt=b.title;image.loading="lazy";image.src=src;image.style.cssText="width:36px;height:32px;object-fit:contain";b.append(image)}}};
 void Promise.all(Array.from({length:Math.min(4,placeholders.length)},()=>loadThumb()));
 area.querySelectorAll("[data-asset]").forEach(b=>b.onclick=async()=>{b.disabled=true;try{const info=await aioneImageBlobInfo("/api/v1/product-assets/"+encodeURIComponent(b.dataset.asset)+"/content?webpSize=640");const win=window.open(info.url,"_blank","noopener,noreferrer");if(!win)alert("浏览器阻止了图片弹出窗口");setTimeout(()=>URL.revokeObjectURL(info.url),120000)}catch(e){alert("图片读取失败："+e.message)}finally{b.disabled=false}})};
 host.querySelector("[data-pl-search]").oninput=draw;
 try{
   const index=await aioneApi(api+"/image-index?limit=200");
   const grouped=new Map(index.products.map(p=>[String(p.id),{...p,groups:Object.fromEntries(["white","main","detail","sku","optimized","other"].map(k=>[k,[]])),count:0}]));
   for(const a of index.assets||[]){const entry=grouped.get(String(a.product_id));if(!entry)continue;entry.groups[kind(a.original_name||a.canonical_name,a.asset_role)].push(a);entry.count++}
   rows=[...grouped.values()];
   if(index.truncated)area.insertAdjacentHTML("beforebegin",'<p class="pe-note">图片超过单次读取上限，请缩小条件以保证数量准确。</p>');
   if(rows.length===200)area.insertAdjacentHTML("beforebegin",'<p class="pe-note">当前显示前200件商品；完整范围需接入下一页。</p>');
   draw();
 }catch(e){area.innerHTML='<div class="pe-alert">图片资料读取失败：'+esc(e.message)+'</div>'}
}
const href=s=>{try{const url=new URL(s);return ["http:","https:"].includes(url.protocol)?url.href:null}catch{return null}};
/* Do not infer publish success or fabricate URLs from product codes.
   Only explicit stored, validated, shop-scoped records may supply a link. */
function verifiedLinks(p){
 const list=Array.isArray(p.publication?.links)?p.publication.links:[];
 return list.filter(x=>x&&x.shopRef&&href(x.url));
}
export async function showProductLinks(host){
 const area=panel(host,"上架链接","一行一个货号 · 按店铺快速打开已核验的平台商品页面");
 let all=[],shops=[],rows=[];const imageCache=new Map();
 const draw=()=>{
 const term=host.querySelector("[data-pl-search]").value.toLowerCase();
 const cols=[{key:"image",label:"图片",minWidth:68,render:r=>r.representativeImageAssetId?'<span data-link-thumb="'+esc(r.representativeImageAssetId)+'">▧</span>':"—"},{key:"localCode",label:"商品货号",minWidth:110},...shops.map(shop=>({key:"shop_"+shop,label:shop,minWidth:105,render:r=>r.links[shop]?'<a href="'+esc(r.links[shop])+'" target="_blank" rel="noopener noreferrer" title="打开 '+esc(shop)+' 商品页面" style="color:#176b4d">↗ 打开</a>':"—"}))];
 renderErpGrid(area,{id:"product-store-links",columns:cols,rows:rows.filter(r=>[r.localCode,r.nameZh].some(v=>String(v||"").toLowerCase().includes(term))),empty:"尚无已核验的上架链接"});
 const th=[...area.querySelectorAll("[data-link-thumb]")];let cursor=0;
 const load=async()=>{while(cursor<th.length){const el=th[cursor++];let url=imageCache.get(el.dataset.linkThumb);if(!url){try{url=(await aioneImageBlobInfo("/api/v1/product-assets/"+encodeURIComponent(el.dataset.linkThumb)+"/content?webpSize=64")).url;imageCache.set(el.dataset.linkThumb,url)}catch{continue}}if(!el.isConnected)continue;el.textContent="";const img=document.createElement("img");img.src=url;img.alt="商品缩略图";img.style.cssText="width:36px;height:32px;object-fit:contain";el.append(img)}};
 void Promise.all(Array.from({length:Math.min(3,th.length)},()=>load()));
 };
 host.querySelector("[data-pl-search]").oninput=draw;
 try{
   const [response,catalog]=await Promise.all([aioneApi(api+"?limit=200"),aioneApi(api+"/store-catalog").catch(()=>({shops:[]}))]);all=response.items||[];
   // Use the existing validated publication.links projection; never fabricate URLs.
   const entries=all.map(p=>({localCode:p.localCode,nameZh:p.nameZh,representativeImageAssetId:p.representativeImageAssetId,links:Object.fromEntries(verifiedLinks(p).map(x=>[x.shopRef,x.url]))}));
   shops=[...new Set([...(Array.isArray(catalog.shops)?catalog.shops:[]),...all.flatMap(p=>verifiedLinks(p).map(x=>x.shopRef))])].sort((a,b)=>a.localeCompare(b,"zh"));
   rows=entries;
   area.insertAdjacentHTML("beforebegin",'<p class="pe-note">仅显示后端已确认的店铺商品链接；当前无已核验记录的店铺不会推测链接；店铺列读取真实店铺目录，未关联的店铺显示「—」。</p>');
   draw();
 }catch(e){area.innerHTML='<div class="pe-alert">店铺链接读取失败：'+esc(e.message)+'</div>'}
}
