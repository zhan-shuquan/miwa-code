import { aioneApi,aioneImageBlobInfo } from "../services/aione-api-client.js";
import { renderErpGrid } from "../components/erp-data-grid.js";
const api="/api/v1/product-entry";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function kind(name,role){
 const suffix=String(name||"").toLowerCase().match(/_([^_/]+)\.(jpg|jpeg|png|webp)$/)?.[1]||"";
 if(suffix==="ma")return "white";
 if(/^sku\d+$/.test(suffix)||role==="source_sku_image")return "sku";
 if(/^m\d+$/.test(suffix))return "optimized";
 if(suffix==="01")return "main";
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
 const area=panel(host,"图片列表","每个商品货号一行 · 白底 / 主图 / 详情 / SKU / 优化主图");
 let rows=[];
 const cols=[
 {key:"localCode",label:"商品货号",minWidth:105},
 {key:"white",label:"白底",minWidth:90,render:r=>marker(r.groups.white)},
 {key:"main",label:"首次主图",minWidth:90,render:r=>marker(r.groups.main)},
 {key:"detail",label:"详情图",minWidth:130,render:r=>marker(r.groups.detail)},
 {key:"sku",label:"SKU图",minWidth:100,render:r=>marker(r.groups.sku)},
 {key:"optimized",label:"优化主图",minWidth:110,render:r=>marker(r.groups.optimized)},
 {key:"count",label:"素材数量",type:"number",minWidth:90},
 {key:"nameZh",label:"商品名称",defaultVisible:false,minWidth:180}
 ];
 const draw=()=>{const term=host.querySelector("[data-pl-search]").value.toLowerCase();renderErpGrid(area,{id:"product-images",columns:cols,rows:rows.filter(r=>[r.localCode,r.nameZh].some(v=>String(v||"").toLowerCase().includes(term))),empty:"没有图片资料"});area.querySelectorAll("[data-asset]").forEach(b=>b.onclick=async()=>{b.disabled=true;try{const info=await aioneImageBlobInfo("/api/v1/product-assets/"+encodeURIComponent(b.dataset.asset)+"/content?webpSize=640");const win=window.open(info.url,"_blank","noopener,noreferrer");if(!win)alert("浏览器阻止了图片弹出窗口");setTimeout(()=>URL.revokeObjectURL(info.url),120000)}catch(e){alert("图片读取失败："+e.message)}finally{b.disabled=false}})};
 host.querySelector("[data-pl-search]").oninput=draw;
 try{
   const payload=await aioneApi(api+"?limit=200"),products=payload.items||[];
   const first=products.slice(0,20);
   const loaded=await Promise.all(first.map(async p=>{
     let assets=[];try{const r=await aioneApi("/api/v1/product-assets/products/"+encodeURIComponent(p.id)+"/assets");assets=(r.assets||[]).filter(a=>!a.archived_at)}catch(error){return {...p,error:error.message,groups:Object.fromEntries(["white","main","detail","sku","optimized","other"].map(k=>[k,[]])),count:0}};
     const groups=Object.fromEntries(["white","main","detail","sku","optimized","other"].map(k=>[k,[]]));
     for(const a of assets)groups[kind(a.original_name||a.file_name,a.asset_role)].push(a);
     return {...p,groups,count:assets.length};
   }));
   rows=loaded;
   if(products.length>20)area.insertAdjacentHTML("beforebegin",'<p class="pe-note">目前只加载前20件商品的图片清单；全部商品需进一步接入分页查询。</p>');
   draw();
 }catch(e){area.innerHTML='<div class="pe-alert">图片资料读取失败：'+esc(e.message)+'</div>'}
}
const href=s=>{try{const url=new URL(s);return ["http:","https:"].includes(url.protocol)?url.href:null}catch{return null}};
/* Do not infer publish success or fabricate URLs from product codes.
   Only explicit stored, validated, shop-scoped records may supply a link. */
function verifiedLinks(p){
 const list=Array.isArray(p.shopListings)?p.shopListings:Array.isArray(p.platformListings)?p.platformListings:[];
 return list.filter(x=>x&&x.shopRef&&x.verified===true&&href(x.url)&&x.status==="published");
}
export async function showProductLinks(host){
 const area=panel(host,"上架链接","一行一个货号 · 按店铺快速打开已核验的平台商品页面");
 let all=[],shops=[],rows=[];
 const draw=()=>{
 const term=host.querySelector("[data-pl-search]").value.toLowerCase();
 const cols=[{key:"image",label:"图片",minWidth:68,render:r=>r.representativeImageAssetId?"▧":"—"},{key:"localCode",label:"商品货号",minWidth:110},...shops.map(shop=>({key:"shop_"+shop,label:shop,minWidth:105,render:r=>r.links[shop]?'<a href="'+esc(r.links[shop])+'" target="_blank" rel="noopener noreferrer" title="打开 '+esc(shop)+' 商品页面" style="color:#176b4d">↗ 打开</a>':"—"}))];
 renderErpGrid(area,{id:"product-store-links",columns:cols,rows:rows.filter(r=>[r.localCode,r.nameZh].some(v=>String(v||"").toLowerCase().includes(term))),empty:"尚无已核验的上架链接"});
 };
 host.querySelector("[data-pl-search]").oninput=draw;
 try{
   const response=await aioneApi(api+"?limit=200");all=response.items||[];
   // Existing Product Entry listing API does not expose validated shop links.
   // Show empty cells rather than guessing a URL. Store columns will be populated
   // after a verified store registry and listing query are connected.
   const entries=all.map(p=>({localCode:p.localCode,nameZh:p.nameZh,representativeImageAssetId:p.representativeImageAssetId,links:Object.fromEntries(verifiedLinks(p).map(x=>[x.shopRef,x.url]))}));
   shops=[...new Set(all.flatMap(p=>verifiedLinks(p).map(x=>x.shopRef)))].sort((a,b)=>a.localeCompare(b,"zh"));
   rows=entries;
   area.insertAdjacentHTML("beforebegin",'<p class="pe-note">仅显示后端已确认的店铺商品链接；当前接口未返回核验记录时不会推测链接。店铺注册表与正式Listing API仍需接入。</p>');
   draw();
 }catch(e){area.innerHTML='<div class="pe-alert">店铺链接读取失败：'+esc(e.message)+'</div>'}
}
