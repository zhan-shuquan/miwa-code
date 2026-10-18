import { renderErpGrid } from "../components/erp-data-grid.js";
import { aioneApi, aioneDownload, aioneImageBlobUrl, aioneImageBlobInfo } from "../services/aione-api-client.js";
import {assessRakutenReadback} from "../services/rakuten-readback-acceptance.js";
import { matchPersistedSkuByAttributes } from "../services/product-sku-image-identity.js";
import { isRakutenPilotProduct, ensureRakutenPilotFolder, previewRakutenPilotPack, publishRakutenPilotPack } from "../services/rakuten-pilot-publish.js";
import {calculateProductCosts} from "../config/product-shared-cost-engine.js";
import { minimumBreakEvenYen, salesBaseCostJpy } from "../config/product-pricing-math.js?v=20261012-sales-base-cost";
const BASE="/api/v1/product-entry";
let LIVE_PARAMETERS=null,LIVE_PARAMETERS_ERROR="共享参数加载中";
async function refreshLiveParameters(){try{const result=await aioneApi("/api/v1/shared-parameters");LIVE_PARAMETERS=result.parameters;LIVE_PARAMETERS_ERROR="";return result;}catch(e){LIVE_PARAMETERS=null;LIVE_PARAMETERS_ERROR="共享参数读取失败："+e.message;return null;}}
window.addEventListener("aione:global-pricing-updated",()=>{void refreshLiveParameters().then(()=>window.dispatchEvent(new Event("aione:product-pricing-refreshed")));});
const ACTIVE_EDITOR_EVENTS=new WeakMap();
const ACTIVE_LIST_IMAGES=new WeakMap();
function releaseListImages(host){const prev=ACTIVE_LIST_IMAGES.get(host);if(prev){prev.abort();ACTIVE_LIST_IMAGES.delete(host);}}
function stopEditor(host){ACTIVE_EDITOR_EVENTS.get(host)?.abort();ACTIVE_EDITOR_EVENTS.delete(host);}
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const MONEY=n=>n!==null&&n!==undefined&&n!==""&&Number.isFinite(Number(n))?"¥"+Math.round(Number(n)).toLocaleString("ja-JP"):"—";
const SPLIT=s=>[...new Set(String(s||"").split(/[|,，、;；\n\/／]/).map(x=>x.trim()).filter(Boolean))];
const JP=Object.freeze({"黑色":"ブラック","白色":"ホワイト","灰色":"グレー","米色":"ベージュ","粉色":"ピンク","红色":"レッド","蓝色":"ブルー","绿色":"グリーン"});
const SHOP=["永井GD","幸せ屋","PrimeLife"],LOGISTICS=["空运大件（普货）","空运小件（普货）","空运直发（普货）","海运大件（普货）","空运大件（特殊）","空运小件（特殊）","空运直发（特殊）","海运大件（特殊）"];
const BRAND={"家居用品":"HOMEONE","女袜":"SOCKONE","男袜":"SOCKONE","童袜":"SOCKONE","女帽":"HATORIA","男帽":"HATORIA","玩具用品":"TOYONE","宠物用品":"PETONE","箱包":"BAGONE","电子配件":"PHONEONE"};
const CATS=["家居用品","女袜","男袜","童袜","女帽","男帽","服装服饰","鞋靴","玩具用品","宠物用品","箱包","电子配件","其他"];
const START=()=>({setQuantity:1,domesticFreightCny:0,defaultStock:1000,sourcePlatform:"",logisticsMethod:"空运大件（普货）",packagingMethod:"原装",packagingMaterial:"A4信封",sizeClass:"3cm厚",targetShopRef:"永井GD",rates:{coupon:0,points:0,ads:0,other:0,platform:10},profitTargets:{productMargin:40,operationMargin:20},specs:[],skuOverrides:[]});
function style(){if(document.getElementById("pw-style"))return;const s=document.createElement("style");s.id="pw-style";s.textContent=
".pw{color:#254d39;font:14px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif}.pw *{box-sizing:border-box}.pw button{cursor:pointer;font:inherit}.pw h2{margin:5px 0;font-size:20px}.pw h3{font-size:15px;margin:0 0 12px}.pw .muted{color:#718679;font-size:12px}.pw .head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:15px}.pw .layout{display:grid;grid-template-columns:270px minmax(0,1fr);gap:16px}.pw .pane{background:#fff;border:1px solid #dfe9e2;border-radius:12px;padding:16px;min-width:0}.pw .rail{display:grid;align-content:start;gap:12px}.pw .tabs{display:flex;border-bottom:1px solid #e2eae4;gap:6px;margin:-16px -16px 18px;padding:0 12px;overflow:auto}.pw .tabs button{padding:15px 11px;border:0;border-bottom:2px solid transparent;background:transparent;white-space:nowrap;color:#597064}.pw .tabs .active{border-bottom-color:#176b4d;color:#176b4d;font-weight:700}.pw .btn{background:white;border:1px solid #d8e2db;border-radius:8px;padding:8px 12px;color:#176b4d}.pw .primary{background:#176b4d;color:white;border-color:#176b4d}.pw .sub{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:#6c8174}.pw .block{border-top:1px solid #e5eee8;padding-top:15px;margin-top:16px}.pw .block:first-child{margin-top:0;padding-top:0;border-top:0}.pw .grid{display:grid;gap:12px}.pw .line1{grid-template-columns:210px minmax(0,1fr)}.pw .line2{grid-template-columns:minmax(0,4fr) minmax(160px,1fr)}.pw .line4{grid-template-columns:repeat(4,minmax(0,1fr))}.pw .line3{grid-template-columns:repeat(3,minmax(0,1fr))}.pw .line-half{grid-template-columns:repeat(2,minmax(0,1fr))}.pw .line-rk{grid-template-columns:minmax(130px,1fr) minmax(130px,1fr) minmax(170px,1.3fr) minmax(250px,3fr)}.pw label.field{min-width:0;display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:650}.pw input,.pw textarea,.pw select{font:inherit;color:#234632;border:1px solid #cbdad0;border-radius:8px;min-height:40px;padding:9px;min-width:0;width:100%;outline-color:#176b4d}.pw textarea{min-height:70px;resize:vertical}.pw input[readonly]{background:#f4f7f5}.pw .stack{display:grid;gap:12px}.pw .spec{display:grid;grid-template-columns:200px minmax(0,1fr) 38px;align-items:end;gap:9px;margin:9px 0;padding:10px;border:1px solid #e3eae5;border-radius:9px}.pw .tablewrap{overflow-x:auto}.pw table{border-collapse:collapse;width:100%;min-width:940px}.pw th{text-align:left;background:#f5f8f6;color:#557062;font-size:12px}.pw th,.pw td{padding:8px;border-bottom:1px solid #ebf0ec}.pw td input{min-height:34px;padding:5px;max-width:95px}.pw .sku-img{width:46px;height:46px;object-fit:cover;border-radius:6px}.pw .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.pw .stat{background:#f7faf8;border:1px solid #dfeae3;border-radius:11px;padding:13px;min-width:0}.pw .stat.focus{background:#eaf5ee}.pw .stat strong{display:block;font-size:24px;color:#176b4d;margin:5px 0}.pw .costs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.pw .cost{border:1px solid #dfeae3;border-radius:11px;min-width:0}.pw .cost button{display:block;width:100%;border:0;background:#fafcfb;text-align:left;padding:11px}.pw .cost b{display:block;margin:6px 0;font-size:20px}.pw .ledger{padding:0 9px}.pw .ledger div{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid #e8eee9;font-size:12px}.pw .adprices{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.pw .adprices div{border:1px solid #e1eae4;border-radius:8px;padding:9px}.pw .adprices b{display:block;font-size:17px}.pw .hero{width:100%;aspect-ratio:1;object-fit:cover;border-radius:9px}.pw .empty{height:230px;display:grid;place-items:center;background:#f6f8f7;border:1px dashed #cddbd3;border-radius:9px;color:#88998c}.pw .readiness{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #edf2ee;font-size:12px}.pw .message{padding:10px;color:#9b392c;background:#fff6f4;border:1px solid #f1d7d1;border-radius:7px}.pw .buttons{display:flex;gap:8px}.pw .thumbs{display:flex;overflow:auto;gap:7px;padding-top:8px}.pw .thumbs img{width:58px;height:58px;object-fit:cover;border-radius:6px;cursor:zoom-in}@media(max-width:1100px){.pw .layout{grid-template-columns:220px minmax(0,1fr)}.pw .line4,.pw .costs{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:720px){.pw .layout{grid-template-columns:1fr}.pw .line1,.pw .line2,.pw .line3,.pw .line-rk,.pw .line-half{grid-template-columns:1fr}}";
s.textContent+=".pw .pw-three{grid-template-columns:minmax(0,1fr) 268px;align-items:start}.pw .pw-three>section{grid-column:1;grid-row:1}.pw .pw-three>aside{grid-column:2;grid-row:1;position:sticky;top:70px}.pw .pw-v7{display:grid;gap:12px}.pw .pw-v7-block{padding:15px;border:1px solid #dfe9e2;border-radius:11px}.pw .pw-v7-block h3{margin:0 0 13px;font-size:14px;color:#206548}.pw .pw-v7-block h3 small{color:#8b9a90;font-weight:400;font-size:11px}.pw .pw-five{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.pw .pw-four{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.pw .pw-colspan-1{grid-column:span 1;min-width:0}.pw .pw-colspan-2{grid-column:span 2;min-width:0}.pw .pw-five>*,.pw .pw-four>*{min-width:0}.pw .pw-v7-block .field{font-size:11px}.pw .pw-v7-block .field input,.pw .pw-v7-block .field select{min-height:36px;padding:7px}.pw .pw-v7-block input[type=number]{-moz-appearance:textfield;appearance:textfield}.pw .pw-v7-block input[type=number]::-webkit-inner-spin-button,.pw .pw-v7-block input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.pw .pw-helper{margin:10px 0 0;color:#6c8174;font-size:11px}.pw .pw-extra{margin-top:12px}.pw .pw-extra summary{color:#176b4d;cursor:pointer;font-size:12px}.pw .pw-extra .pw-four{margin-top:12px}.pw .pw-selling{display:grid;gap:9px}@media(max-width:1080px){.pw .pw-three{grid-template-columns:1fr}.pw .pw-three>section,.pw .pw-three>aside{grid-column:1;grid-row:auto}.pw .pw-five{grid-template-columns:repeat(5,minmax(100px,1fr));overflow:auto}.pw .pw-four{grid-template-columns:repeat(4,minmax(100px,1fr));overflow:auto}}";s.textContent+=".pw{width:100%;max-width:none}.pw .pw-three{grid-template-columns:minmax(0,1fr) 312px;gap:14px}.pw .pw-three>aside{position:sticky}.pw input::placeholder,.pw textarea::placeholder{color:#9aa9a0;font-weight:400;opacity:1}.pw .pw-v7-block select:has(option[value=\"\"]:checked){color:#95a59a}.pw .hero{object-fit:contain;background:#f7faf8}@media(max-width:1400px){.pw .pw-three{grid-template-columns:minmax(0,1fr) 292px}}@media(max-width:1080px){.pw .pw-three{grid-template-columns:1fr}}";s.textContent+=".pw .pe-derived-status{display:inline-block;font-size:12px;font-weight:650;color:#256747}.pw .pe-readiness{color:#8a6334}.pw .pe-publication{color:#365d67}";s.textContent+=".pe-wrap{padding:12px 0}.pe-toolbar{display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap}.pe-toolbar button{padding:9px 14px;border:1px solid #dae2dd;border-radius:8px;background:white;cursor:pointer}.pe-toolbar .pe-main{background:#176b4d;border-color:#176b4d;color:white}.pe-table{border-collapse:collapse;width:100%;background:#fff;margin-top:14px}.pe-table td,.pe-table th{padding:12px;border-bottom:1px solid #e6eae7;text-align:left;font-size:13px}.pe-table th{background:#f7f9f8}.pe-table button{border:0;background:transparent;color:#176b4d;cursor:pointer}.pe-note{color:#697971;font-size:12px}.pe-import{padding:16px;margin-top:12px;background:#fafcfb;border:1px solid #dee8e1;border-radius:9px}.pe-scroll{overflow-x:auto}.pe-alert{padding:12px;border:1px solid #ebcece;background:#fff8f8;color:#9a3838;margin:12px 0}";s.textContent+=".pw .pw-finance-head{align-items:center}.pw .pw-finance-chooser{display:flex;flex-direction:row;align-items:center;gap:9px;font-size:13px;font-weight:650}.pw .pw-finance-chooser select{width:auto;min-width:154px}.pw .pw-finance-stats{grid-template-columns:repeat(5,minmax(0,1fr))}.pw .pw-finance-stats .stat{padding:13px 12px}.pw .pw-finance-stats .stat strong{font-size:21px}.pw .pw-price-stat input{font-size:23px;font-weight:750;color:#176b4d;min-height:49px}.pw .pw-price-stat label.field{font-size:13px}.pw .pw-smart-head{display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap;margin-bottom:14px}.pw .pw-smart-head h3{margin:0}.pw .pw-targets{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.pw .pw-targets label.field{display:flex;flex-direction:row;align-items:center;gap:8px;white-space:nowrap}.pw .pw-targets input{width:88px;min-height:42px;text-align:center;font-size:15px;font-weight:700}.pw .cost .ledger div{padding:4px 0}.pw .cost button{padding:9px 11px}.pw .cost .ledger{padding:0 9px 8px}.pw .cost .ledger div b{font-size:13px;margin:0;font-weight:700}.pw .cost .ledger div:last-child{font-weight:750}@media(max-width:1200px){.pw .pw-finance-stats{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:780px){.pw .pw-finance-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}";s.textContent+=".pw .pw-finance-controls{display:flex;align-items:center;justify-content:flex-end;gap:12px;flex-wrap:wrap}.pw .pw-finance-controls>label.field{display:flex;flex-direction:row;gap:7px;align-items:center;white-space:nowrap}.pw .pw-finance-controls>label.field input{width:84px;min-height:39px;padding:7px;text-align:center;font-weight:700}.pw .pw-decision-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.pw .pw-decision-card{padding:15px;min-width:0}.pw .pw-card-label{font-size:14px;font-weight:700;color:#395c48}.pw .pw-decision-card>strong{font-size:25px;margin:8px 0 12px}.pw .pw-price-stat label.field>span{display:none}.pw .pw-price-stat label.field{margin:8px 0 11px}.pw .pw-price-stat input{min-height:51px;font-size:24px;font-weight:750}.pw .pw-metric-list{display:grid;gap:7px;margin-top:7px}.pw .pw-metric-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:12px;border-top:1px solid #e8eee9;padding-top:6px}.pw .pw-metric-row b{font-size:13px;font-weight:700;text-align:right}.pw .pw-card-foot{font-size:11px;color:#6b8073;line-height:1.4;border-top:1px solid #e5ebe6;padding-top:7px}.pw .pw-cost-toggle{display:grid!important;grid-template-columns:minmax(0,1fr) 18px;align-items:center;gap:4px;text-align:left!important}.pw .pw-cost-toggle>b{grid-column:1/-1;font-size:20px!important;margin:3px 0!important}.pw .pw-chevron{transition:transform .16s}.pw .pw-chevron.up{transform:rotate(180deg)}.pw .pw-sku-price{font-weight:650;color:#176b4d;white-space:nowrap}@media(max-width:1250px){.pw .pw-decision-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){.pw .pw-decision-grid{grid-template-columns:1fr}.pw .pw-finance-controls{justify-content:flex-start}}";s.textContent+=".pw .pw-url-control{display:flex;gap:6px;align-items:stretch}.pw .pw-url-control input{min-width:0;flex:1}.pw .pw-url-open{white-space:nowrap}.pw .pw-url-open[disabled]{opacity:.5;cursor:not-allowed}.pw .pw-metric-row .pw-profit-value{font-size:24px;color:#176b4d;font-weight:750;line-height:1.2}.pw .pw-decision-card .pw-metric-row:has(.pw-profit-value){align-items:center}.pw .pw-decision-card .pw-card-foot{margin-top:9px}.pw .pw-decision-grid{grid-template-columns:repeat(4,minmax(0,1fr))}";s.textContent+=".pw .pw-goal-field .pw-percent-wrap{display:flex;align-items:center;gap:5px}.pw .pw-goal-field .pw-percent-wrap input{width:76px}.pw .pw-percent-mark{font-size:13px;color:#3f604e;font-weight:700}";s.textContent+=".pe-table td img.sku-img{display:block;width:56px!important;height:56px!important;min-width:56px;max-width:56px;max-height:56px;aspect-ratio:1;object-fit:cover;border-radius:6px}.pe-table td:first-child{width:76px;min-width:76px;max-width:76px}";document.head.append(s)}
const ENTRY_HINTS=Object.freeze({
localCode:"如：zjl238",nameZh:"填写中文商品名称",category:"请选择商品分类",brand:"请选择所属品牌",purchaseUrl:"粘贴采购商品链接",sourcePlatform:"从采购链接识别",
material:"请选择主要材质",materialComposition:"如：棉80%、聚酯纤维20%",remarks:"填写内部采购或运营备注",
purchaseUnitCostCny:"每套采购金额",weightG:"单个商品净重",actualShipmentWeightG:"收到货后填写包装实测重量",
packageLengthCm:"最终包装长度",packageWidthCm:"最终包装宽度",packageHeightCm:"最终包装高度",
productModel:"如：型号或款式编号",barcode:"如：EAN/JAN条码",productSpecifications:"填写补充规格",
sellingPointCore:"商品最突出的购买理由",sellingPointMaterial:"材质或品质优势",sellingPointExperience:"舒适性或使用体验",
sellingPointDesign:"外观、结构和工艺特点",sellingPointScene:"适用人群、场景或用途",sellingPointOther:"其他补充卖点",
salePriceJpy:"填写商品含税售价",rakutenGenreId:"填写乐天末级ジャンルID",rakutenTitle:"填写日文楽天商品名",
rakutenCatchCopy:"填写日文宣传短语",pcDescription:"填写PC商品说明",spDescription:"填写手机商品说明",
salesDescription:"填写销售说明",productSpecifications:"其他商品规格说明",originCountry:"如：中国"
});
const CATEGORY_TERMS=[
["女袜",/女袜|女士.{0,8}袜|女性.{0,8}袜|レディース.{0,8}(ソックス|靴下)/i],
["男袜",/男袜|男士.{0,8}袜|男性.{0,8}袜|メンズ.{0,8}(ソックス|靴下)/i],
["童袜",/童袜|儿童.{0,8}袜|宝宝.{0,8}袜|キッズ.{0,8}(ソックス|靴下)/i],
["女帽",/女帽|女士.{0,8}帽|女性.{0,8}帽/i],
["男帽",/男帽|男士.{0,8}帽|男性.{0,8}帽/i],
["鞋靴",/拖鞋|棉拖|运动鞋|皮鞋|凉鞋|雪地靴|鞋子|クロッグ/i],
["宠物用品",/宠物|猫粮|狗粮|猫砂|猫抓板/i],
["电子配件",/数据线|充电器|充电线|手机壳|电脑配件/i],
["家居用品",/水龙头|防冻罩|家居|家具|收纳盒|浴室|厨房用品/i],
["箱包",/背包|手提包|旅行包|钱包|行李箱/i],
["玩具用品",/玩具|玩偶|积木|娃娃/i]
];
function recommendCategory(name){const matches=CATEGORY_TERMS.filter(([,re])=>re.test(String(name||"")));return matches.length===1?matches[0][0]:"";}
function input(key,label,value,options=null,type="text",readonly=false){
 const hint=ENTRY_HINTS[key]||("填写"+label.replace(/^\*\s*/,"").replace(/（.*?）/g,""));
 const placeholder=esc(hint);
 const attrs=' data-f="'+esc(key)+'"';
 const selectOptions=options && !value && options[0]!=="" ? ["",...options] : options;
 const o=options?'<select'+attrs+'>'+selectOptions.map(x=>'<option value="'+esc(x)+'" '+(x===value?"selected":"")+(x===""?' disabled':'')+'>'+esc(x||hint)+'</option>').join("")+'</select>':type==="textarea"?'<textarea'+attrs+' placeholder="'+placeholder+'">'+esc(value??"")+'</textarea>':'<input type="'+type+'" '+(type==="number"?'min="0" step="any" ':'')+(readonly?'readonly ':'')+attrs+' placeholder="'+placeholder+'" value="'+esc(value??"")+'">';
 return '<label class="field"><span>'+esc(label)+'</span>'+o+'</label>';
}
function skuRows(p){let combos=[[]];for(const s of p.specs||[]){if(!s.name||!s.values?.length)continue;combos=combos.flatMap(c=>s.values.map(v=>[...c,v]));}return combos.map((values,i)=>{const identity=(p.specs||[]).filter(y=>y.name&&y.values?.length).map((y,j)=>y.name+"="+values[j]).join("|")||"default";const o=(p.skuOverrides||[]).find(x=>x.index===i+1&&(!x.identity||x.identity===identity))||{};return {identity,index:i+1,label:values.join(" / ")||"默认规格",number:p.localCode+"-c"+String(i+1).padStart(2,"0"),link:p.localCode+"-"+(values.map(v=>JP[v]||v).join("-")||"基本仕様"),price:p.extraAttributes?.independentSkuPricing==="true"?(o.priceJpy??p.salePriceJpy??null):(p.salePriceJpy??null),stock:o.stock??p.defaultStock??1000,cost:o.purchaseCostCny??p.purchaseUnitCostCny??null,weight:o.weightG??p.weightG??null,sizeClass:o.sizeClass||p.sizeClass,image:o.imageFile||""}})}
function finance(p,row){return calculateProductCosts(p,row,LIVE_PARAMETERS);}
function imageKind(a){const n=String(a.original_name||a.canonical_name||"").toLowerCase();if(/[_-]ma\.(jpg|jpeg|png|webp)$/.test(n))return "ma";if(/[_-]01\.(jpg|jpeg|png|webp)$/.test(n))return "01";if(/[_-]c\d+\.(jpg|jpeg|png|webp)$/.test(n)||/[_-]sku\d+\.(jpg|jpeg|png|webp)$/.test(n))return "sku";return "";}
function imageGroupType(a){const role=String(a.asset_role||"").toLowerCase(),name=String(a.original_name||a.canonical_name||"").toLowerCase(),purpose=String(a.metadata?.imagePurpose||"");if(/sku/.test(role)||/[_-]c\d+\.(jpg|jpeg|png|webp)$/.test(name)||/[_-]sku\d+\.(jpg|jpeg|png|webp)$/.test(name))return "sku";if(/white|white_bg|white-background/.test(role)||/[_-]ma\./.test(name))return "white";if(/detail/.test(role))return "detail";if(/main/.test(role)||purpose==="system_primary"||/[_-]0[1-9]\./.test(name))return "main";return "detail"}
function imageSummary(items){const active=(items||[]).filter(a=>!a.archived_at);const primary=active.filter(a=>a.metadata?.imagePurpose==="system_primary").sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||"")))[0];return {main:primary||active.find(a=>imageKind(a)==="ma")||active.find(a=>imageKind(a)==="01")||null,sku:active.filter(a=>imageKind(a)==="sku"||/sku/i.test(String(a.asset_role||"")))};}
function editor(host,existing={}){style();releaseListImages(host);stopEditor(host);const editorEvents=new AbortController();ACTIVE_EDITOR_EVENTS.set(host,editorEvents);let p={...START(),...existing,rates:{...START().rates,...existing.rates},profitTargets:{...START().profitTargets,...existing.profitTargets}};if(p.packagingMethod==="简易包装")p.packagingMethod="原装";let localSyncMessage="",localSyncHandle=null,localSyncTimer=null,localSyncBusy=false;if(!p.brand&&BRAND[p.category])p.brand=BRAND[p.category];let rmsReadState={loading:false,message:"尚未检查RMS商品状态",dryRun:null};let cabinetState={loading:false,message:"尚未初始化图片文件夹"};let candidateState={loading:false,message:"尚未检查 ItemAPI 正式字段",result:null,genre:null,shipping:null,preview:null};let publishState={loading:false,review:null,message:"尚未检查正式创建条件"};let categoryManual=!!p.category,tab="basic",selected=0,opened=new Set(),assets=[],failure="",imageMessage="",imageBlobUrl="",imageLoadedId="",imageType="main",storedSkus=[],skuImageUrls=new Map();
const field=(k,label)=>input(k,label,p[k]);
function basic(){
const specValue=name=>((p.specs||[]).find(x=>x.name===name)?.values||[]).join("、")||"—";
const actual=Number(p.actualShipmentWeightG)>0?Number(p.actualShipmentWeightG):null;
const estimated=Number(p.weightG)>0?Number(p.weightG)*Number(p.setQuantity||1):null;
const billed=actual??estimated;
const weightStatus=actual!==null?"实际称重":estimated!==null?"净重暂算 / 运费预估":"待称重 / 待核算";
const selling=[["sellingPointCore","核心卖点"],["sellingPointMaterial","材质品质"],["sellingPointExperience","使用体验"],["sellingPointDesign","设计特点"],["sellingPointScene","适用场景"],["sellingPointOther","其他卖点"]];
return '<div class="pw-v7"><div class="pw-v7-block"><h3>▤ 基础信息</h3><div class="pw-five">'+'<div class="pw-colspan-1">'+input("localCode","* 商品货号",p.localCode,null,"text",false)+'</div>'+'<div class="pw-colspan-2">'+input("nameZh","* 商品名称",p.nameZh,null,"text")+'</div>'+'<div class="pw-colspan-1">'+input("category","商品分类",p.category,CATS)+'</div>'+'<div class="pw-colspan-1">'+input("brand","所属品牌",p.brand,Object.values(BRAND).filter((v,i,a)=>a.indexOf(v)===i))+'</div>'+'<div class="pw-colspan-1">'+input("sourcePlatform","采购来源",p.sourcePlatform||"待识别",null,"text",true)+'</div>'+'<div class="pw-colspan-2">'+'<label class="field"><span>采购链接 URL</span><span class="pw-url-control"><input type="url" data-f="purchaseUrl" placeholder="填写采购链接" value="'+esc(p.purchaseUrl||"")+'"><button type="button" class="btn pw-url-open" data-purchase-open title="新标签页打开采购链接" '+(!p.purchaseUrl?'disabled':'')+'>打开 ↗</button></span></label>'+'</div>'+'<div class="pw-colspan-1">'+input("material","主要材质（中文）",p.material)+'</div>'+'<div class="pw-colspan-1">'+input("materialComposition","材质成分",p.materialComposition,null,"text")+'</div>'+'<div class="pw-colspan-1">'+input("purchaseUnitCostCny","采购单价（CNY）",p.purchaseUnitCostCny,null,"number")+'</div>'+'<div class="pw-colspan-1">'+input("setQuantity","套装数量",p.setQuantity,null,"number")+'</div>'+'<div class="pw-colspan-1">'+input("weightG","单个净重（g）",p.weightG,null,"number")+'</div>'+'<div class="pw-colspan-1">'+input("domesticFreightCny","国内运费（CNY）",p.domesticFreightCny,null,"number")+'</div><div class="pw-colspan-1">'+input("remarks","备注",p.remarks)+'</div>'+'</div></div>'+
'<div class="pw-v7-block"><h3>♧ 物流包装</h3><div class="pw-four">'+input("logisticsMethod","物流方式",p.logisticsMethod,LOGISTICS)+input("packagingMethod","包装方式",p.packagingMethod,["原装","真空包装","重新包装","定制包装"])+input("packagingMaterial","日本包装物",p.packagingMaterial,["无","A4信封","A4缓冲信封","小缓冲信封","小信封","3cm纸盒","60cm纸箱","80cm纸箱","100cm纸箱"])+input("actualShipmentWeightG","实际发货重量（g）",p.actualShipmentWeightG,null,"number")+(p.packagingMethod==="定制包装"?input("customPackagingCostCny","定制包装实际成本（CNY）",p.customPackagingCostCny,null,"number"):"")+input("sizeClass","发货尺寸",p.sizeClass,["3cm厚","60cm","80cm","100cm","120cm"])+input("packageLengthCm","发货长（cm）",p.packageLengthCm,null,"number")+input("packageWidthCm","发货宽（cm）",p.packageWidthCm,null,"number")+input("packageHeightCm","发货高（cm）",p.packageHeightCm,null,"number")+'</div><p class="pw-helper">计费重量：'+(billed===null?"待计算":billed+"g")+' · '+weightStatus+'。未称重按单个净重×套装数量预估，实测后优先使用实际重量，不加50g。</p></div>'+
'<div class="pw-v7-block"><h3>商品属性</h3><p class="pw-helper">颜色、款式、尺码及平台必填属性请在顶部「商品属性」标签维护，与销售规格分开。</p></div>'+
'<div class="pw-v7-block"><h3>♧ 功能卖点 <small>只填中文 · 全部选填</small></h3><div class="pw-selling">'+selling.map(([key,label])=>input(key,label,p[key])).join("")+'</div></div>'+
'<div class="pw-v7-block"><h3>▦ 上架平台</h3><p class="pw-helper">仅显示有真实上架记录的商品链接。尚未连接平台上架记录，不推断已发布。</p></div></div>';
}
function productAttributes(){
 const values=p.extraAttributes&&typeof p.extraAttributes==="object"?p.extraAttributes:{};
 const names=["颜色","款式","尺码"].map(name=>({name,spec:(p.specs||[]).find(x=>x.name===name)}));
 return '<div class="pw-v7"><div class="pw-v7-block"><h3>商品真实属性</h3><p class="pw-helper">商品属性独立于销售规格。仅在已确认后填写；无法确认时留空，不得让平台映射臆测必填属性。</p><div class="pw-four">'+
 input("attr-primaryColor","实际颜色（代表カラー）",values.primaryColor||values["颜色"]||"")+
 input("attr-colors","其他实际颜色",values.colors||"")+
 input("attr-styles","实际款式",values.styles||"")+
 input("attr-sizes","实际尺码",values.sizes||"")+
 input("material","主要材质",p.material||"")+
 input("materialComposition","材质成分",p.materialComposition||"")+
 input("originCountry","原产地",p.originCountry||"中国")+
 input("productModel","规格型号",p.productModel||"")+
 input("barcode","条形码",p.barcode||"")+
 input("productSpecifications","商品尺寸及补充规格",p.productSpecifications||"")+
 '</div></div><div class="pw-v7-block"><h3>SKU销售规格参考</h3><p class="pw-helper">以下信息只供参考，不会自动覆盖真实商品属性。</p>'+
 names.map(x=>'<div class="readiness"><span>'+esc(x.name)+'</span><span>'+esc(x.spec?.values?.join("、")||"未设为销售规格")+'</span></div>').join("")+
 '<p class="pw-helper">例如SKU以“款式”为销售规格时，颜色仍可在上方独立填写，供乐天等平台要求的颜色属性映射使用。</p></div></div>';
}
function skuMatch(row){
 const attrs=Object.fromEntries(String(row.identity||"").split("|").filter(Boolean).map(part=>{const i=part.indexOf("=");return i<0?[part,""]:[part.slice(0,i),part.slice(i+1)]}));
 return matchPersistedSkuByAttributes(storedSkus,attrs);
}
function skuCandidate(row){
 const prefix=(String(p.localCode||"")+"_c"+String(row.index).padStart(2,"0")+".").toLowerCase();
 const matches=assets.filter(a=>a.asset_role==="source_sku_image"&&!a.sku_id&&String(a.original_name||"").toLowerCase().startsWith(prefix));
 return matches.length===1?matches[0]:null;
}
function skuImageCell(row){
 const persisted=skuMatch(row);
 const bound=assets.find(a=>a.asset_role==="source_sku_image"&&a.sku_id&&String(a.sku_id)===String(persisted?.id));
 if(bound){const url=skuImageUrls.get(bound.id);return url?'<img class="sku-img" src="'+esc(url)+'" alt="'+esc(row.number)+'">':'已关联';}
 const candidate=skuCandidate(row);
 return candidate&&persisted?'自动关联中':'待关联';
}
async function autoBindSkuImages(){
 if(!p.id||!storedSkus.length||!assets.length)return;
 let changed=false;
 for(const row of skuRows(p)){
  const persisted=skuMatch(row),candidate=skuCandidate(row);
  if(!persisted||!candidate)continue;
  const other=assets.filter(a=>a.asset_role==="source_sku_image"&&String(a.sku_id||"")===String(persisted.id));
  if(other.length)continue;
  try{
   await aioneApi("/api/v1/product-assets/products/"+encodeURIComponent(p.id)+"/local-images/"+encodeURIComponent(candidate.id)+"/bind-sku",{method:"POST",body:JSON.stringify({skuId:persisted.id,skuCode:persisted.sku_code,confirmed:true})});
   candidate.sku_id=persisted.id;changed=true;
  }catch(error){imageMessage="SKU自动关联待处理："+String(error.message||"关联冲突");}
 }
 if(changed){const result=await aioneApi("/api/v1/product-assets/products/"+encodeURIComponent(p.id)+"/assets");assets=result.assets||[];await refreshSkuImages();}
}

function sku(){const independent=p.extraAttributes?.independentSkuPricing==="true";return '<div class="block"><h3>规格设置</h3><label class="pw-helper" style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><input data-sku-independent type="checkbox" style="width:auto;min-height:auto" '+(independent?'checked':'')+'>启用 SKU 独立价格</label><p class="pw-helper">关闭时使用商品统一售价；原有 SKU 独立价格仍保留，不会删除。</p>'+(p.specs||[]).map((s,i)=>'<div class="spec">'+input("sn"+i,"规格名称"+(i+1),s.name,["颜色","款式","尺码","套数","型号","其他"])+input("sv"+i,"规格值",s.values?.join("，"))+'<button class="btn" data-remove="'+i+'">×</button></div>').join("")+'<button class="btn" data-add>＋ 添加规格维度</button></div><div class="block"><h3>自动生成的SKU <span class="muted">'+skuRows(p).length+'个实际SKU</span></h3><div class="tablewrap"><table><thead><tr><th>SKU图片</th><th>规格</th><th>SKU管理番号</th><th>システム連携用SKU番号</th><th>售价（¥）</th><th>库存</th><th>采购价（CNY）</th><th>重量（g）</th></tr></thead><tbody>'+skuRows(p).map(x=>'<tr><td>'+skuImageCell(x)+'</td><td>'+esc(x.label)+'</td><td>'+esc(x.number)+'</td><td>'+esc(x.link)+'</td>'+'<td>'+(independent?'<input aria-label="SKU独立售价" data-sku="'+x.index+'" data-sku-field="price" type="number" min="0" step="1" value="'+esc(x.price??"")+'">':'<span class="pw-sku-price">'+MONEY(x.price)+'</span>')+'</td>'+[["stock","库存"],["cost","采购价"],["weight","重量"]].map(([k,t])=>'<td><input aria-label="'+esc(t)+'" data-sku="'+x.index+'" data-sku-field="'+k+'" type="number" min="0" value="'+esc(x[k])+'"></td>').join("")+'</tr>').join("")+'</tbody></table></div></div>'}
function profit(){
 const rows=skuRows(p),row=selected?rows[selected-1]:null,m=finance(p,row),target=p.profitTargets,rate=p.rates;
 if(m.status!=="priced")return '<div class="pw-v7-block"><h3>利润分析 · 待核算</h3><p class="message">'+esc(m.reason||LIVE_PARAMETERS_ERROR||"共享参数未就绪")+'; 禁止使用旧成本定价。</p></div>';
 const hasActual=Number(p.actualShipmentWeightG)>0;
 const hasEstimated=Number(row?.weight??p.weightG)>0&&Number(p.setQuantity)>0;
 if(!hasActual&&!hasEstimated)return '<div class="pw-v7-block"><h3>利润分析 · 待核算</h3><p class="pw-helper">请先录入实际发货重量，或至少填写单个净重与套装数量。重量缺失时不可将运费显示为0。</p></div>';
 const fixed=m.fixed,platformRate=m.platformRate/100;
 const salesBaseCost=m.baseCost;
 const operatingRate=(Number(rate.coupon||0)+Number(rate.points||0)+Number(rate.ads||0)+Number(rate.other||0))/100;
 const tail=n=>{const step=LIVE_PARAMETERS.commerce.priceRoundUnitJpy,end=LIVE_PARAMETERS.commerce.priceTailJpy;return Number.isFinite(n)&&n>=0?Math.max(end,Math.ceil((n-end)/step)*step+end):null};
 const solve=(ops,margin)=>{const divisor=1-platformRate-ops-margin;return fixed!==null&&divisor>0?tail(fixed/divisor):null};
 const unoperatedBreakEven=m.unoperatedBreakEven;
  const operatedBreakEven=m.operatingBreakEven;
 const targetPrice=m.targetPrice;
 const percentage=(v)=>m.price&&v!==null?(v/m.price*100).toFixed(1)+"%":"—";
 const diff=(v,t)=>m.price&&v!==null?(100*v/m.price-Number(t||0)).toFixed(1):"—";
 const signed=n=>n==="—"?"—":(Number(n)>=0?"+":"")+n+"百分点";
 const line=(label,value)=>'<div class="pw-metric-row"><span>'+label+'</span><b>'+value+'</b></div>';
 const card=(title,main,rows,cls="",footer="")=>'<div class="stat pw-decision-card '+cls+'"><div class="pw-card-label">'+title+'</div><strong>'+main+'</strong><div class="pw-metric-list">'+rows.join("")+'</div>'+footer+'</div>';
 const targetGross=targetPrice===null?null:targetPrice-fixed-Math.round(targetPrice*platformRate);
 const targetGrossRate=targetPrice?((targetGross/targetPrice)*100).toFixed(1)+"%":"—";
 const status=(actual,goal)=>{if(!(m.price>0)||actual===null)return "待核算";const d=actual/m.price*100-Number(goal||0);return (d>=0?"高于目标 ":"低于目标 ")+Math.abs(d).toFixed(1)+" 个百分点 · "+(d>=-0.00001?"合格":"不合格")};
 const percentageControl=(key,label,value)=>'<label class="field pw-goal-field"><span>'+esc(label)+'</span><span class="pw-percent-wrap"><input type="number" min="0" step="any" data-f="'+esc(key)+'" value="'+esc(value??"")+'"><span class="pw-percent-mark">%</span></span></label>';
 return (m.deliveryQuote.status!=="priced"?'<p class="message">日本配送费率尚未匹配；利润、保本价与建议售价显示待核算，请先确认发货尺寸档位。</p>':"")+'<div class="head pw-finance-head"><h3>智能定价与利润</h3><div class="pw-finance-controls">'+
 percentageControl("goal-productMargin","公司目标毛利率",target.productMargin)+
 percentageControl("goal-operationMargin","公司运营目标毛利率",target.operationMargin)+
 '<label class="pw-finance-chooser"><span>计算对象</span><select data-finance><option value="0" '+(selected===0?'selected':'')+'>商品默认</option>'+rows.map(x=>'<option value="'+x.index+'" '+(x.index===selected?'selected':'')+'>'+esc(x.label)+'</option>').join("")+'</select></label></div></div>'+
 '<div class="pw-decision-grid"><div class="stat focus pw-decision-card pw-price-stat"><div class="pw-card-label">实际售价</div>'+
 input("salePriceJpy","实际售价（JPY / 套）",p.salePriceJpy,null,"number")+
 '<div class="pw-metric-list">'+line("实际毛利润",'<span class="pw-profit-value">'+MONEY(m.gross)+'</span>')+line("实际毛利率",percentage(m.gross))+line("目标状态",status(m.gross,target.productMargin))+'</div></div>'+
 card('公司目标毛利率达标价',MONEY(targetPrice),[line("预定毛利润",'<span class="pw-profit-value">'+MONEY(targetGross)+'</span>'),line("预定毛利率",targetGrossRate),line("目标状态",targetPrice===null?"待核算":(()=>{const d=targetGross/targetPrice*100-Number(target.productMargin||0);return (d>=0?"高于目标 ":"低于目标 ")+Math.abs(d).toFixed(1)+" 个百分点 · "+(d>=-0.00001?"合格":"不合格")})())],'pw-target-card')+
 card('未运营保本价',MONEY(unoperatedBreakEven),[line("未运营毛利润",'<span class="pw-profit-value">'+MONEY(m.gross)+'</span>'),line("未运营毛利率",percentage(m.gross)),line("目标状态",status(m.gross,target.productMargin))])+
 card('运营后保本价',MONEY(operatedBreakEven),[line("运营后毛利润",'<span class="pw-profit-value">'+MONEY(m.net)+'</span>'),line("运营后利润率",percentage(m.net)),line("目标状态",status(m.net,target.operationMargin))],'','<div class="pw-card-foot">优惠券'+esc(rate.coupon)+'% · 积分'+esc(rate.points)+'% · RPP'+esc(rate.ads)+'% · 其他'+esc(rate.other)+'%</div>')+'</div>'+
 '<div class="block"><div class="pw-cost-head"><h3>成本核算</h3><div class="pw-cost-total"><span class="pw-cost-total-label">销售基础总成本</span><strong>'+MONEY(salesBaseCost)+'</strong><span class="pw-cost-total-breakdown">'+(m.mode.fulfillment==="direct"?"直发履约":"到日本仓")+' '+MONEY(m.warehouse)+' + 日本配送 '+MONEY(m.japan)+' + 平台交易 '+MONEY(m.platform)+'（按当前售价'+(m.price>0?MONEY(m.price):"待填写")+'计算）</span></div></div><div class="costs">'+m.ledger.map((x,i)=>'<div class="cost"><button class="pw-cost-toggle" data-cost="'+i+'" aria-expanded="'+opened.has(i)+'"><span>'+esc(x[0])+'</span><svg aria-hidden="true" class="pw-chevron '+(opened.has(i)?'up':'')+'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg><b>'+MONEY(x[1])+'</b></button>'+(opened.has(i)?'<div class="ledger">'+x[2].map(([k,v])=>'<div><span>'+esc(k)+'</span><b>'+MONEY(v)+'</b></div>').join("")+'<div><strong>合计</strong><b>'+MONEY(x[1])+'</b></div></div>':"")+'</div>').join("")+'</div></div>'+
 '<div class="block"><h3>运营方案设置</h3><div class="grid line4">'+[["coupon","优惠券"],["points","积分"],["ads","RPP广告"],["other","其他运营费用"]].map(([k,t])=>input("rate-"+k,t+"（%）",rate[k],null,"number")).join("")+'</div></div>'+
 '<div class="block"><h3>不同广告费率参考售价</h3><div class="adprices">'+[0,5,10,15,20].map(ad=>'<div><span class="muted">广告费'+ad+'%</span><b>'+MONEY(solve((Number(rate.coupon||0)+Number(rate.points||0)+ad+Number(rate.other||0))/100,Number(target.operationMargin||0)/100))+'</b></div>').join("")+'</div></div>'+
 '<p class="muted">当前成本及参考售价仍为试算结果；共享物流、汇率和平台费率核验前不得作为正式定价依据。</p>';
}
function cabinetActions(){if(!isRakutenPilotProduct(p))return "";return '<div class="block"><h3>zjl238 · 永井GD 图片发布</h3><p class="muted">先初始化文件夹，再核验并发布12张图片。不创建RMS商品或修改库存。</p><div class="buttons"><button type="button" class="btn" data-cabinet-setup '+(cabinetState.loading?'disabled':'')+'>初始化永井GD图片文件夹</button><button type="button" class="btn" data-cabinet-publish '+(cabinetState.loading?'disabled':'')+'>检查并发布12张图片</button><button type="button" class="btn" data-cabinet-audit '+(cabinetState.loading?'disabled':'')+'>核对乐天远端文件（只读）</button></div><p role="status">'+esc(cabinetState.message)+'</p></div>'}
function firstLivePublishActions(){
 if(!isRakutenPilotProduct(p))return "";
 const r=publishState.review;
 const rows=Array.isArray(r?.skuReview?.rows)?r.skuReview.rows:[];
 const summary=r?'<div class="muted" style="margin:12px 0"><p>店铺：'+esc(r.shopRef)+'｜商品管理番号：'+esc(r.manageNumber)+'</p><p>商品名：'+esc(r.title||"—")+'</p><p>ジャンルID：'+esc(r.genreId||"—")+'｜图片：'+esc(r.images)+'张｜RMS：'+(r.remoteExists?'已存在（不可重复发布）':'尚未创建')+'</p><p>阻断项：'+esc((r.blocking||[]).join("、")||"无")+'</p></div>':"";
 const specs=rows.length?'<div style="margin:12px 0"><strong>最终SKU、规格、售价、库存与图片</strong>'+rows.map(x=>'<div class="readiness"><span>'+esc(x.option)+'｜'+esc(x.skuCode)+'</span><span>¥'+esc(x.priceJpy)+' / 库存'+esc(x.stock)+' / '+(x.skuImageLocation?'SKU图已关联':'缺少SKU图')+'</span></div>').join("")+'</div>':"";
 return '<div class="block"><h3>zjl238 · 乐天正式发布</h3><p class="muted">点击「发布到乐天」只读生成最终清单，核对后点击「确认发布」才会创建RMS商品并同步库存；已存在的商品不会再次创建。</p>'+
 '<button type="button" class="btn" data-rk-review '+(publishState.loading?'disabled':'')+'>发布到乐天</button>'+'<button type="button" class="btn" data-rk-readback '+(publishState.loading?'disabled':'')+'>只读复核RMS现有商品</button>'+(publishState.readback?'<p class="muted">远端：'+(publishState.readback.exists?'存在':'不存在')+'｜商品名：'+esc(publishState.readback.title||'—')+'｜分类：'+esc(publishState.readback.genreId||'—')+'｜图片记录：'+esc(publishState.readback.listedImageCount??'—')+'｜销售状态：需在店铺页面另行确认｜SKU/库存：'+(publishState.readback.skuDataVerified?'通过':'待核实')+'｜Cabinet文件存在：'+esc(publishState.readback.imageVerification?.filesFound??'—')+'｜文件ID一致：'+esc(publishState.readback.imageVerification?.fileIdsMatched??'—')+'｜供应商URL一致：'+esc(publishState.readback.imageVerification?.providerUrlsMatched??'—')+'｜图片链接实际访问：'+esc(publishState.readback.imageVerification?.accessible??'—')+'/'+esc(publishState.readback.imageVerification?.total??'—')+'｜R-Cabinet一致：'+esc(publishState.readback.imageVerification?.cabinetMatched??'—')+'/'+esc(publishState.readback.imageVerification?.total??'—')+'｜图片问题：'+esc((publishState.readback.imageVerification?.issues||[]).slice(0,6).join('、')||(assessRakutenReadback(publishState.readback).complete?'无':'尚未取得完整新版图片核验结果'))+'</p>'+(publishState.readback.imageVerification?.rows?.length?'<details><summary>查看图片路径差异（只读诊断）</summary>'+publishState.readback.imageVerification.rows.slice(0,12).map(x=>'<div class="readiness">'+esc(x.slot)+'｜ItemAPI: '+esc(x.location)+'｜R-Cabinet FileUrl: '+esc(x.providerUrl||'未返回')+'｜HTTP: '+esc(x.access?.status??'—')+'｜'+esc((x.issues||[]).join('、')||'无')+'</div>').join('')+'</details>':''):'')+
 summary+specs+
 (r&&!r.publishAuthorized?'<p class="message">当前账号没有乐天发布权限。请联系管理员配置授权。</p>':"")+
 '<p role="status">'+esc(publishState.message)+'</p>'+
 (r?.ready&&r?.publishAuthorized?'<button type="button" class="btn" data-rk-live-create '+(publishState.loading?'disabled':'')+'>确认发布</button>':'')+'</div>';
}
function rakutenRequiredInputs(){
 const preview=candidateState.preview;
 if(!preview)return "";
 const trace=preview.automaticMapping||{};
 const data=[
   ["メーカー型番",p.productModel||"商品资料未提供型号"],
   ["代表カラー",p.extraAttributes?.primaryColor||p.extraAttributes?.["颜色"]||"商品资料未明确颜色"],
   ["发货尺寸",p.sizeClass||"未设置"],
   ["包装后重量",p.actualShipmentWeightG?String(p.actualShipmentWeightG)+"g":"未称重"],
   ["配送组",preview.shippingOptions?.deliverySetId??"等待商品规格/店铺规则"],
   ["交期编号",preview.shippingOptions?.normalDeliveryDateId??"等待店铺发货规则"],
   ["JAN条形码",p.barcode||"需已核验的适用品类免填规则"]
 ];
 return '<div class="block"><h3>自动映射 · 商品数据与店铺规则</h3><p class="muted">以下只读，从商品资料及已确认的RMS配置计算。不会每次要求人工选择乐天字段。</p>'+
 data.map(([k,v])=>'<div class="readiness"><span>'+esc(k)+'</span><span>'+esc(v)+'</span></div>').join("")+
 '<p class="muted">需要补充时应回到原始商品资料或一次性配置店铺履约规则；不猜测颜色、厂家型号或当天出货承诺。</p></div>';
}

function rakuten(){return '<div class="block"><div class="grid line-rk">'+input("targetShopRef","目标店铺",p.targetShopRef,SHOP)+input("rms-code","商品管理番号",p.localCode,null,"text",true)+field("rakutenGenreId","楽天ジャンルID")+input("rakutenStoreCategory","乐天分类",p.rakutenStoreCategory||"待店铺分类映射",null,"text",true)+'</div><div class="stack" style="margin-top:16px">'+[["rakutenTitle","楽天商品名"],["rakutenCatchCopy","キャッチコピー"],["pcDescription","PC用商品説明文"],["spDescription","スマートフォン用商品説明文"],["salesDescription","PC用販売説明文"]].map(([k,t])=>input(k,t,p[k],null,"textarea")).join("")+'</div><div class="block"><h3>RMS只读检查</h3><p class="muted">查询商品是否已存在，不会创建商品。</p><button class="btn" type="button" data-rms-check '+(rmsReadState.loading?'disabled':'')+'>'+(rmsReadState.loading?'查询中…':'检查RMS商品状态')+'</button><p role="status">'+esc(rmsReadState.message)+'</p><div style="margin-top:12px"><button class="btn" type="button" data-rms-dry-run '+(rmsReadState.loading?'disabled':'')+'>检查上架前缺项（只读）</button></div>'+(rmsReadState.dryRun?'<div class="muted" role="status" style="margin-top:10px">商品：'+esc(rmsReadState.dryRun.manageNumber)+'｜远端：'+(rmsReadState.dryRun.remoteExists?'已存在':'不存在')+'｜图片：'+esc(rmsReadState.dryRun.mappedImageCount)+' / '+esc(rmsReadState.dryRun.imageCount)+' 已映射｜SKU：'+esc(rmsReadState.dryRun.skuCount)+'<p>R-Cabinet：'+(rmsReadState.dryRun.cabinet?.containerCode?esc(rmsReadState.dryRun.cabinet.containerCode):'未配置容器')+'｜文件夹：'+(rmsReadState.dryRun.cabinet?.folderConfigured?'已配置':'未确认')+'｜预计图片：'+esc(rmsReadState.dryRun.cabinet?.proposalCount??'—')+'</p><p>尚需处理：'+esc((rmsReadState.dryRun.blocking||[]).join('、')||'无')+'</p></div>':'')+'</div>'+cabinetActions()+(isRakutenPilotProduct(p)?'<div class="block"><h3>ItemAPI 上架字段核验</h3><p class="muted">只读查询乐天正式分类属性和配送编号，不会创建商品或改库存。</p><button type="button" class="btn" data-itemapi-candidate '+(candidateState.loading?'disabled':'')+'>检查正式上架字段（只读）</button><p role="status">'+esc(candidateState.message)+'</p>'+rakutenRequiredInputs()+'</div>'+firstLivePublishActions():'')+'</div>'}
function display(){const rows=skuRows(p),ready=[["基本商品资料",!!(p.localCode&&p.nameZh)],["SKU规格",(p.specs||[]).some(x=>x.name&&x.values?.length)],["售价",p.salePriceJpy!=null&&Number(p.salePriceJpy)>0],["乐天分类与文案",!!(p.rakutenGenreId&&p.rakutenTitle)],["三份独立说明文",!!(p.pcDescription&&p.spDescription&&p.salesDescription)]];const {main:defaultPic,sku:skuPictures}=imageSummary(assets);const matching=assets.filter(a=>!a.archived_at&&imageGroupType(a)===imageType);const pic=matching[0]||(imageType==="main"?defaultPic:null);const pictureUrl=pic?.id===imageLoadedId?imageBlobUrl:"";host.innerHTML='<div class="pw"><div class="head"><div><div class="muted">商品之家　›　商品中心　›　'+esc(p.localCode||"新商品")+'</div><h2>'+esc(p.nameZh||"新建商品")+'</h2><div class="sub">系统编码 '+esc(p.productCode||"待生成")+' · 商品货号 '+esc(p.localCode||"—")+' · SKU总数 '+rows.length+' · 草稿</div></div><div class="buttons"><button class="btn" data-back>商品一览</button><button class="btn primary" data-save>保存草稿</button></div></div>'+(failure?'<p class="message">'+esc(failure)+'</p>':"")+'<div class="layout pw-three"><aside class="rail"><div class="pane"><h3>商品图片</h3><label class="field"><span>图片类型</span><select data-image-type><option value="main" '+(imageType==="main"?"selected":"")+'>主图</option><option value="detail" '+(imageType==="detail"?"selected":"")+'>详情图</option><option value="white" '+(imageType==="white"?"selected":"")+'>白底图</option><option value="sku" '+(imageType==="sku"?"selected":"")+'>SKU图</option></select></label>'+(pictureUrl?'<img class="hero" src="'+esc(pictureUrl)+'" alt="商品代表图">':'<div class="empty">当前类型暂无已关联图片</div>')+'<p class="muted">商品图片按资产用途分类显示；分类名称不改变本地上传规则</p><label class="btn pw-image-upload">'+(p.id?'上传或更换主图':'保存商品后可上传主图')+'<input type="file" accept="image/jpeg,image/png,image/webp" data-primary-image '+(p.id?'':'disabled')+' hidden></label>'+(imageMessage?'<p class="muted">'+esc(imageMessage)+'</p>':'')+'<div class="readiness"><span>SKU图片</span><span>'+skuPictures.length+' 张已关联</span></div><div class="pw-local-sync"><button class="btn" data-local-sync '+(p.id?'':'disabled')+' type="button">选择本地商品文件夹并同步</button><p class="muted">仅在本页打开期间每30秒检测新增图片；不会上传到乐天，也不会修改本地原图。</p>'+(localSyncMessage?'<p class="muted">'+esc(localSyncMessage)+'</p>':'')+'</div></div>'+'<div class="pane"><h3>上架准备进度</h3><p class="muted">资料准备情况，不代表RMS审核通过或已经上架。</p>'+ready.map(([k,v])=>'<div class="readiness"><span>'+esc(k)+'</span><span style="color:'+(v?"#198657":"#ac8843")+'">'+(v?"完成":"待完善")+'</span></div>').join("")+'<div class="readiness"><span>商品图片</span><span>'+(assets.some(a=>!a.archived_at)?"已关联":"待完善")+'</span></div></div></aside><section class="pane"><div class="tabs">'+[["basic","商品资料"],["attributes","商品属性"],["sku","规格与SKU"],["profit","利润分析"],["rakuten","上架资料"]].map(([k,v])=>'<button class="'+(tab===k?"active":"")+'" data-tab="'+k+'">'+v+'</button>').join("")+'</div>'+(tab==="basic"?basic():tab==="attributes"?productAttributes():tab==="sku"?sku():tab==="profit"?profit():rakuten())+'</section></div></div>'}
async function scanLocalImages(){
 if(!localSyncHandle||localSyncBusy||!p.id)return;
 localSyncBusy=true;
 try {
  const files=[];
  for await (const [name,handle] of localSyncHandle.entries()){
   if(handle.kind!=="file")continue;
   const escaped=String(p.localCode||"");
   if(!name.toLowerCase().startsWith(escaped.toLowerCase()+"_")||!/^(?:c)?[0-9]{2,4}\.(?:jpg|jpeg|png|webp)$/i.test(name.slice(escaped.length+1)))continue;
   const file=await handle.getFile();
   files.push(file);
  }
  files.sort((a,b)=>a.name.localeCompare(b.name,"en",{numeric:true}));
  if(files.length>60)throw new Error("一次最多同步60张图片，请分批处理。");
  const preflight=await aioneApi("/api/v1/product-assets/products/"+encodeURIComponent(p.id)+"/local-images/authorization");
  if(!preflight.authorized){
   localSyncMessage="同步已停止："+String(preflight.message||"当前账号未获得上传权限")+(preflight.authenticatedEmail?"｜当前登录："+preflight.authenticatedEmail:"");
   return;
  }
  let uploaded=0,reused=0,blocked=0,failed=0,firstError="";
  for(const file of files){
   const mime=file.type||({"png":"image/png","jpg":"image/jpeg","jpeg":"image/jpeg","webp":"image/webp"}[file.name.split(".").pop()?.toLowerCase()]||"");
   if(file.size<16||file.size>2*1024*1024){failed++;continue;}
   try {
    const result=await aioneApi("/api/v1/product-assets/products/"+encodeURIComponent(p.id)+"/local-image",{method:"POST",body:JSON.stringify({fileName:file.name,mimeType:mime,base64:await fileBase64(file)})});
    if(result.reused)reused++;else uploaded++;
   }catch(error){if(error.status===409)blocked++;else failed++;firstError="文件 "+file.name+"｜HTTP "+(error.status||"网络异常")+"｜"+String(error.payload?.error||"request_failed")+"｜"+String(error.message||"请求失败").slice(0,140);break;}
  }
  if(uploaded){
   const result=await aioneApi("/api/v1/product-assets/products/"+encodeURIComponent(p.id)+"/assets");
   assets=result.assets||[];
   await autoBindSkuImages();
   await refreshImage();
  }
  localSyncMessage="文件夹："+localSyncHandle.name+"｜扫描 "+files.length+"｜新增 "+uploaded+"｜已存在 "+reused+"｜冲突 "+blocked+"｜失败 "+failed+(firstError?"｜已停止："+firstError:"");
 }catch(error){localSyncMessage="图片同步失败："+error.message;}
 finally{localSyncBusy=false;display();}
}
host.addEventListener("click",async event=>{
 const review=event.target.closest("[data-rk-review]"),submit=event.target.closest("[data-rk-live-create]"),readback=event.target.closest("[data-rk-readback]");
 if((!review&&!submit&&!readback)||publishState.loading||!isRakutenPilotProduct(p))return;
 if(readback){publishState.readback=null;publishState.message="";}
 publishState.loading=true;publishState.message=readback?"正在只读复核RMS已创建商品…":review?"正在重新核对RMS及AIONE资料…":"正在提交；请勿刷新或重复点击…";display();
 try{
  if(readback){
   const x=await aioneApi("/api/v1/integrations/rakuten/products/"+encodeURIComponent(p.id)+"/live-readback");
   const verdict=assessRakutenReadback(x);
   publishState.readback=x;
   publishState.message=verdict.complete?"SKU库存、12张图片文件及访问检查全部通过；销售状态仍需另行确认。":verdict.unavailable?"图片诊断未完成：后端尚未返回新版核验数据。请等Cloud Run部署完成后再复核。":verdict.skuVerified?"SKU价格库存通过，但图片仍未全部通过；请检查诊断问题。":"SKU、库存或图片验收存在未核实项："+(x.checks||[]).join("、");
  }else if(review){
   const r=await aioneApi("/api/v1/integrations/rakuten/products/"+encodeURIComponent(p.id)+"/live-create-review");
   publishState.review=r;
   publishState.message=!r.ready?"还有阻断项："+(r.blocking||[]).join("、"):r.publishAuthorized?"最终清单已生成；核对无误后请点击「确认发布」。":"只读清单已生成，但当前账号未获得乐天发布权限。";
  } else {
   const r=publishState.review;
   if(!r?.ready||!r.publishAuthorized)throw Error("请使用具有发布权限的账号重新核对最终清单");
   // Explicit second-button action carries the reviewed digest; no text prompt or extra dialog.
   const posted=await aioneApi("/api/v1/integrations/rakuten/products/"+encodeURIComponent(p.id)+"/live-create",{method:"POST",body:JSON.stringify({digest:r.digest,confirmation:"confirmed",skuAcknowledgementKey:r.skuReview?.requiresSkuCodeAcknowledgement?r.skuReview.skuAcknowledgementKey:null})});
   publishState.review=null;
   publishState.message=posted.ok?"RMS创建成功并通过两个SKU库存回读验收。":"ItemAPI可能已创建，但库存同步未全部通过；请先核对远端，不能再次执行创建。";
  }
 }catch(error){publishState.message="处理未完成："+error.message+"。若已提交，请先检查RMS实际状态。";}
 finally{publishState.loading=false;display();}
},{signal:editorEvents.signal});
host.addEventListener("click",async event=>{
 if(!event.target.closest("[data-itemapi-candidate]")||candidateState.loading||!isRakutenPilotProduct(p))return;
 candidateState.loading=true;candidateState.message="正在读取乐天分类、配送和商品候选数据…";display();
 try{
  const [result,preview]=await Promise.all([aioneApi("/api/v1/integrations/rakuten/products/"+encodeURIComponent(p.id)+"/itemapi-candidate"),aioneApi("/api/v1/integrations/rakuten/products/"+encodeURIComponent(p.id)+"/itemapi-payload-preview")]);
  candidateState.result=result;candidateState.preview=preview;
  const endpoint="/api/v1/integrations/rakuten/products/"+encodeURIComponent(p.id);
  const [genre,shipping]=await Promise.all([aioneApi(endpoint+"/genre-attributes"),aioneApi(endpoint+"/shipping-options")]);
  candidateState.genre=genre;candidateState.shipping=shipping;
  const missing=[...new Set(preview.blocking||[])];
  const sets=result.verifiedShippingOptions?.deliverySets||[];
  const dates=result.verifiedShippingOptions?.deliveryDates||[];
  candidateState.message="正式JSON预览 "+(preview.readyForLiveCreate?"字段就绪，仍需发布确认":"字段尚未齐备")+"｜商品 "+result.manageNumber+"｜SKU "+result.skuCount+"｜图片 "+result.imageCount+
   "｜分类元数据 "+(result.genreMetadataLoaded?"已读取":"未确认")+"｜配送元数据 "+(result.shippingMetadataLoaded?"已读取":"未确认")+
   "｜配送组 "+(sets.map(x=>x.id+":"+x.name).join("、")||"未返回")+
   "｜交期编号 "+(dates.map(x=>x.id+":"+x.label).join("、")||"未返回")+
   "｜正式配送组 "+(preview.shippingOptions?.deliverySetId??"未选定")+"｜正式交期 "+(preview.shippingOptions?.normalDeliveryDateId??"未选定")+"｜剩余阻断项 "+(missing.join("、")||"无")+
   "。本项只是只读候选检查，尚未创建RMS商品。";
 }catch(error){candidateState.message="正式字段检查失败："+error.message;}
 finally{candidateState.loading=false;display();}
},{signal:editorEvents.signal});
host.addEventListener("click",async event=>{
 const setup=event.target.closest("[data-cabinet-setup]");
 const publish=event.target.closest("[data-cabinet-publish]");
 const audit=event.target.closest("[data-cabinet-audit]");
 if((!setup&&!publish&&!audit)||cabinetState.loading||rmsReadState.loading||!isRakutenPilotProduct(p))return;
 if(setup&&!window.confirm("确认初始化zjl238在永井GD的R-Cabinet容器rkc001及远端文件夹？不会创建商品或上传图片。"))return;
 cabinetState.loading=true;cabinetState.message=setup?"正在初始化文件夹…":audit?"正在读取乐天文件夹中的真实图片…":"正在核验图片清单…";display();
 try {
  if(audit){
   const remote=await aioneApi("/api/v1/integrations/rakuten/products/"+encodeURIComponent(p.id)+"/cabinet/reconcile?shopRef="+encodeURIComponent("永井GD")+"&containerCode=rkc001");
   cabinetState.message="只读核对：R-Cabinet文件 "+remote.totalRemoteFiles+" 张，已验证映射 "+remote.verifiedMappings+" / "+remote.expectedAssets+"，远端未映射 "+remote.unmappedRemoteAssets+"；"+(remote.blocking.length?"已阻止上传："+remote.blocking.join("、"):"未发现远端冲突，可以继续发布。");
  }else if(setup){
   const result=await ensureRakutenPilotFolder(aioneApi,p);
   cabinetState.message="文件夹已确认："+result.containerCode+" / ID "+result.folderId;
  }else{
   const plan=await previewRakutenPilotPack(aioneApi,p);
   cabinetState.loading=false;cabinetState.message="预检完成：12张图片、2个SKU，folderId "+plan.folderId;display();
   if(!window.confirm("确认将zjl238的12张图片真实发布至永井GD的R-Cabinet？不创建商品或修改库存。"))return;
   cabinetState.loading=true;cabinetState.message="正在发布；异常时请检查图片映射，切勿盲目重试。";display();
   const result=await publishRakutenPilotPack(aioneApi,p,plan);
   cabinetState.message="图片发布已核验："+result.dryRun.mappedImageCount+" / "+result.dryRun.imageCount;
  }
  rmsReadState.dryRun=await aioneApi("/api/v1/integrations/rakuten/products/"+encodeURIComponent(p.localCode)+"/first-item-dry-run");
 }catch(error){cabinetState.message="未确认完成："+error.message+"。请先执行只读诊断。";}
 finally{cabinetState.loading=false;display();}
},{signal:editorEvents.signal});
host.addEventListener("click",async e=>{
 if(!e.target.closest("[data-rms-check]")||rmsReadState.loading)return;
 if(!p.id){rmsReadState.message="请先保存商品草稿。";display();return;}
 rmsReadState.loading=true;rmsReadState.message="正在检查RMS连接…";display();
 try{
  const ref=encodeURIComponent(p.localCode||p.id);
  const pre=await aioneApi("/api/v1/integrations/rakuten/products/"+ref+"/itemapi-preflight");
  if(!pre.rmsConfiguration?.readyForRead){rmsReadState.message="未执行远端查询｜目标店铺："+(p.targetShopRef||"未选择")+"｜凭据已配置："+(pre.rmsConfiguration?.credentialsPresent?"是":"否")+"｜店铺绑定匹配："+(pre.rmsConfiguration?.credentialShopBound?"是":"否")+"。请勿发送密钥到聊天。";return;}
  const remote=await aioneApi("/api/v1/integrations/rakuten/products/"+ref+"/remote-existence");
  rmsReadState.message=remote.exists?"RMS已存在该商品："+remote.manageNumber+"。禁止重复创建。":"RMS未找到该商品（404）："+remote.manageNumber+"。这不是上架授权。";
 }catch(error){rmsReadState.message="RMS查询未完成："+error.message+"；不能判断商品不存在。";}
 finally{rmsReadState.loading=false;display();}
},{signal:editorEvents.signal});
host.addEventListener("click",async e=>{
 if(!e.target.closest("[data-rms-dry-run]")||rmsReadState.loading)return;
 if(!p.id){rmsReadState.message="请先保存草稿。";display();return;}
 rmsReadState.loading=true;rmsReadState.message="正在核验商品、SKU、R-Cabinet及远端状态…";rmsReadState.dryRun=null;display();
 try{
  const ref=encodeURIComponent(p.localCode||p.id);
  const result=await aioneApi("/api/v1/integrations/rakuten/products/"+ref+"/first-item-dry-run");
  rmsReadState.dryRun=result;
  rmsReadState.message="只读预演完成；未创建商品，也未改动图片和库存。";
 }catch(error){rmsReadState.message="只读预演未完成："+error.message+"。不能据此判断可上架。";}
 finally{rmsReadState.loading=false;display();}
},{signal:editorEvents.signal});
host.addEventListener("click",async event=>{
 const button=event.target.closest("[data-local-sync]");
 if(!button||!p.id)return;
 if(typeof window.showDirectoryPicker!=="function"){localSyncMessage="当前浏览器不支持文件夹授权，请使用最新 Chrome/Edge。";display();return;}
 try{
  const handle=await window.showDirectoryPicker({mode:"read"});
  if(handle.name.toLowerCase()!==String(p.localCode||"").toLowerCase())throw new Error("请选择与商品货号同名的文件夹："+p.localCode);
  localSyncHandle=handle;
  if(localSyncTimer)clearInterval(localSyncTimer);
  localSyncTimer=setInterval(()=>{if(!document.hidden)scanLocalImages();},30000);
  localSyncMessage="已关联："+handle.name+"，开始同步…";
  display();await scanLocalImages();
 }catch(error){if(error.name!=="AbortError"){localSyncMessage="未启用文件夹同步："+error.message;display();}}
},{signal:editorEvents.signal});
editorEvents.signal.addEventListener("abort",()=>{if(localSyncTimer)clearInterval(localSyncTimer);},{once:true});
async function refreshSkuImages(){
 for(const url of skuImageUrls.values())if(url)URL.revokeObjectURL(url);
 const urls=await Promise.all(assets.filter(a=>a.asset_role==="source_sku_image"&&a.sku_id).map(async a=>{try{return [a.id,await aioneImageBlobUrl("/api/v1/product-assets/"+encodeURIComponent(a.id)+"/content?webpSize=64")]}catch{return [a.id,null]}}));
 skuImageUrls=new Map(urls.filter(x=>x[1]));
}
host.addEventListener("click",async e=>{
 const btn=e.target.closest("[data-sku-image-bind]");if(!btn||!p.id)return;
 const {skuImageBind:assetId,skuBindCode:skuCode,skuBindId:skuId,skuBindLabel:label}=btn.dataset;
 if(!window.confirm("确认将图片关联到 "+skuCode+"（"+label+"）？"))return;
 btn.disabled=true;
 try{
  await aioneApi("/api/v1/product-assets/products/"+encodeURIComponent(p.id)+"/local-images/"+encodeURIComponent(assetId)+"/bind-sku",{method:"POST",body:JSON.stringify({skuId,skuCode,confirmed:true})});
  const a=await aioneApi("/api/v1/product-assets/products/"+encodeURIComponent(p.id)+"/assets");assets=a.assets||[];await refreshSkuImages();imageMessage="SKU图片已关联："+skuCode;display();
 }catch(error){failure="SKU图片关联失败："+error.message;display()}
},{signal:editorEvents.signal});
function fieldChange(k,value){if(k.startsWith("attr-")){if(!p.extraAttributes||typeof p.extraAttributes!=="object")p.extraAttributes={};p.extraAttributes[k.slice(5)]=value;return}if(k==="sizeClass"&&value==="直发")return;if(k.startsWith("sn")){p.specs[Number(k.slice(2))].name=value;p.skuOverrides=p.skuOverrides.filter(x=>x.identity);return}if(k.startsWith("sv")){p.specs[Number(k.slice(2))].values=SPLIT(value);p.skuOverrides=p.skuOverrides.filter(x=>x.identity);return}if(k.startsWith("rate-")){p.rates[k.slice(5)]=Number(value);return}if(k.startsWith("goal-")){p.profitTargets[k.slice(5)]=Number(value);return}if(k==="salePriceJpy"){p.salePriceJpy=value===""?null:Number(value);return}p[k]=["purchaseUnitCostCny","setQuantity","weightG","actualShipmentWeightG","customPackagingCostCny","domesticFreightCny","packageLengthCm","packageWidthCm","packageHeightCm","salePriceJpy"].includes(k)?value===""?null:Number(value):value;if(k==="category"){categoryManual=Boolean(value);if(BRAND[value])p.brand=BRAND[value]}if(k==="nameZh"&&!categoryManual){const suggestion=recommendCategory(value);p.category=suggestion;if(suggestion&&BRAND[suggestion]&&!p.brand)p.brand=BRAND[suggestion]}if(k==="purchaseUrl"){try{const h=new URL(value).hostname.toLowerCase();p.sourcePlatform=h==="1688.com"||h.endsWith(".1688.com")?"1688":h==="taobao.com"||h.endsWith(".taobao.com")?"淘宝":h==="tmall.com"||h.endsWith(".tmall.com")?"天猫":h==="alibaba.com"||h.endsWith(".alibaba.com")?"Alibaba":""}catch{p.sourcePlatform=""}}}
function rowChange(t){let index=Number(t.dataset.sku),key={stock:"stock",cost:"purchaseCostCny",weight:"weightG",price:"priceJpy"}[t.dataset.skuField];if(!key)return;const identity=skuRows(p).find(x=>x.index===index)?.identity;let o=p.skuOverrides.find(x=>x.identity===identity);if(!o){o={index,identity};p.skuOverrides.push(o)}o.index=index;o[key]=t.value===""?null:Number(t.value)}
async function refreshImage(){const {main:defaultPic}=imageSummary(assets);const main=assets.filter(a=>!a.archived_at&&imageGroupType(a)===imageType)[0]||(imageType==="main"?defaultPic:null);if(imageBlobUrl)URL.revokeObjectURL(imageBlobUrl);imageBlobUrl="";imageLoadedId="";if(!main?.id)return;try{imageBlobUrl=await aioneImageBlobUrl("/api/v1/product-assets/"+encodeURIComponent(main.id)+"/content?webpSize=640");imageLoadedId=main.id;}catch(error){imageMessage="图片读取失败："+error.message;}}
host.addEventListener("change",async e=>{const t=e.target;if(!t.matches("[data-primary-image]"))return;const file=t.files?.[0];if(!file||!p.id)return;try{if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>2*1024*1024)throw new Error("请选择不超过2MB的JPG、PNG或WebP图片");imageMessage="正在上传图片";display();const result=await aioneApi("/api/v1/product-assets/products/"+encodeURIComponent(p.id)+"/primary-image",{method:"POST",body:JSON.stringify({mimeType:file.type,base64:await fileBase64(file)})});if(!result.asset?.id)throw new Error("图片保存没有返回资产ID");const response=await aioneApi("/api/v1/product-assets/products/"+encodeURIComponent(p.id)+"/assets");assets=response.assets||[];await refreshImage();imageMessage="系统主图已保存";display();}catch(error){imageMessage="图片上传失败："+error.message;display();}},{signal:editorEvents.signal});
host.addEventListener("change",e=>{const t=e.target;if(t.hasAttribute("data-sku-independent")){if(!p.extraAttributes||typeof p.extraAttributes!=="object")p.extraAttributes={};p.extraAttributes.independentSkuPricing=t.checked?"true":"false";display()}else if(t.dataset.f){fieldChange(t.dataset.f,t.value);display()}else if(t.dataset.sku){rowChange(t);display()}else if(t.hasAttribute("data-finance")){selected=Number(t.value)||0;display()}else if(t.hasAttribute("data-image-type")){imageType=t.value;refreshImage().then(display)}},{signal:editorEvents.signal});
host.addEventListener("click",async e=>{const t=e.target.closest("button");if(!t)return;if(t.hasAttribute("data-purchase-open")){const raw=String(host.querySelector('[data-f="purchaseUrl"]')?.value||p.purchaseUrl||"").trim();try{const url=new URL(raw);if(!["https:","http:"].includes(url.protocol))throw Error("invalid");window.open(url.href,"_blank","noopener,noreferrer")}catch{failure="采购链接无效，请填写正确的HTTP或HTTPS链接";display()}return}if(t.hasAttribute("data-tab")){tab=t.dataset.tab;display()}else if(t.hasAttribute("data-add")){p.specs.push({name:"颜色",values:[]});display()}else if(t.hasAttribute("data-remove")){p.specs.splice(Number(t.dataset.remove),1);p.skuOverrides=p.skuOverrides.filter(x=>x.identity);display()}else if(t.hasAttribute("data-cost")){const i=Number(t.dataset.cost);opened.has(i)?opened.delete(i):opened.add(i);display()}else if(t.hasAttribute("data-back")){await showProducts(host)}else if(t.hasAttribute("data-save")){t.disabled=true;try{const payload={...p};["id","productCode","updatedAt","readOnly"].forEach(k=>delete payload[k]);const res=await aioneApi(p.id?BASE+"/"+encodeURIComponent(p.id):BASE,{method:p.id?"PATCH":"POST",body:JSON.stringify(payload)});Object.assign(p,res.product);await showProducts(host,"商品草稿已保存");}catch(error){failure="保存失败："+error.message;display()}}},{signal:editorEvents.signal});
window.addEventListener("aione:product-pricing-refreshed",()=>{if(host.isConnected)display()},{signal:editorEvents.signal});
display();void refreshLiveParameters().then(()=>{if(host.isConnected)display()});if(p.id)Promise.all([aioneApi("/api/v1/product-assets/products/"+encodeURIComponent(p.id)+"/assets"),aioneApi(BASE+"/"+encodeURIComponent(p.id))]).then(async ([r,d])=>{assets=r.assets||[];storedSkus=d.skus||[];
  if(p.id&&d.product?.localCode==="zjl238"&&d.product?.targetShopRef==="永井GD"&&(!String(d.product.rakutenTitle||"").trim()||!String(d.product.rakutenGenreId||"").trim())){
    try{
      const filled=await aioneApi(BASE+"/"+encodeURIComponent(p.id)+"/approved-rakuten-draft",{method:"POST",body:JSON.stringify({version:d.product.version})});
      if(filled.product){Object.assign(p,filled.product);candidateState.message="已自动保存用户确认的楽天商品名和ジャンルID；分类仍需RMS核验。";}
    }catch(error){candidateState.message="自动补全尚未完成："+error.message+"。原有商品资料未修改。";}
  }
  await autoBindSkuImages();await Promise.all([refreshImage(),refreshSkuImages()]);display()}).catch(error=>{failure="商品图片加载失败："+String(error.message||"接口错误");display()});
}

async function fileBase64(file){
 const bytes=new Uint8Array(await file.arrayBuffer());let binary="";
 for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return btoa(binary);
}
function importer(host){
 const target=host.querySelector("[data-pe-import]");if(!target)return;
 target.innerHTML=[
  '<dialog class="selection-batch-dialog pe-batch-dialog" data-pe-dialog aria-labelledby="pe-batch-title">',
  '<div class="selection-batch-dialog__body">',
   '<header class="selection-batch-dialog__head"><div><small>商品中心</small><h2 id="pe-batch-title">批量导入商品</h2><p>复用选品中心三步式流程：下载模板、上传校验、确认批量创建。使用现有商品资料接口，不会覆盖已有商品或调用乐天API。</p></div>',
    '<button type="button" class="selection-batch-dialog__close" data-pe-close aria-label="关闭">×</button></header>',
   '<div class="selection-batch-steps" aria-label="批量导入步骤">',
    '<div class="selection-batch-step is-current" data-pe-step="1"><b>01 下载模板</b><span>获取AIONE商品Excel模板</span></div>',
    '<div class="selection-batch-step" data-pe-step="2"><b>02 上传校验</b><span>检查货号、字段与重复记录</span></div>',
    '<div class="selection-batch-step" data-pe-step="3"><b>03 确认导入</b><span>仅创建新商品草稿</span></div>',
   '</div>',
   '<section class="selection-batch-template" aria-label="商品导入模板">',
    '<div class="selection-batch-template__info"><span class="selection-batch-template__icon" aria-hidden="true">X</span><div>',
     '<div class="selection-batch-template__title-line"><strong>AIONE商品批量导入模板</strong><span class="is-ready">已匹配</span></div>',
     '<p>支持已有WPS单品表或AIONE批量Excel模板；不用重新录入商品资料。</p>',
    '</div></div>',
    '<button type="button" class="selection-batch-download-button" data-pe-template-inner>↓ 下载模板</button>',
   '</section>',
   '<section class="selection-batch-section"><h3>上传并校验</h3>',
    '<label class="selection-batch-upload" data-pe-drop>',
     '<span class="selection-batch-upload__icon" aria-hidden="true">⇧</span>',
     '<strong>拖入商品Excel，或点击选择文件</strong>',
     '<p>仅支持 .xlsx；当前上传上限1.9MB；校验通过后才能导入。</p>',
     '<span class="selection-batch-file-button">选择文件</span>',
     '<input type="file" accept=".xlsx" data-pe-file hidden>',
    '</label>',
    '<div class="selection-batch-file-status" data-pe-file-status hidden></div>',
   '</section>',
   '<div class="selection-batch-validation" data-pe-validation hidden aria-live="polite"></div>',
   '<footer class="selection-batch-dialog__foot"><p>先校验，再确认。已存在货号不覆盖；导入结果可逐条核对。</p>',
    '<div><button type="button" class="selection-batch-cancel-button" data-pe-close>取消</button>',
    '<button type="button" class="selection-batch-action-button" data-pe-action disabled>校验Excel</button></div>',
   '</footer>',
  '</div></dialog>'
 ].join("");
 const dialog=target.querySelector("[data-pe-dialog]");
 const drop=target.querySelector("[data-pe-drop]");
 const picker=target.querySelector("[data-pe-file]");
 const fileStatus=target.querySelector("[data-pe-file-status]");
 const panel=target.querySelector("[data-pe-validation]");
 const action=target.querySelector("[data-pe-action]");
 const steps=[...target.querySelectorAll("[data-pe-step]")];
 let currentFile=null,preview=null,requestBody=null,created=null,busy=false,commitAttempted=false;
 const step=n=>steps.forEach(el=>{const k=Number(el.dataset.peStep);el.classList.toggle("is-current",n<=3&&k===n);el.classList.toggle("is-done",k<n);});
 const showPanel=(html,error=false)=>{panel.hidden=false;panel.className="selection-batch-validation"+(error?" is-error":"");panel.innerHTML=html;};
 const message=(text,isError=false)=>{fileStatus.hidden=!text;fileStatus.textContent=text;fileStatus.classList.toggle("is-error",isError);};
 const refreshAction=()=>{
   if(busy){action.disabled=true;return;}
   if(created){action.disabled=false;action.textContent="完成，返回商品一览";return;}
   if(commitAttempted){action.disabled=false;action.textContent="返回商品一览核对";return;}
   if(preview){
     const count=preview.items.filter(x=>x.action==="new_draft").length;
     action.disabled=count===0;
     action.textContent=count?"确认导入 "+count+" 件新商品草稿":"无可导入的新商品";
     return;
   }
   action.disabled=!currentFile;
   action.textContent="校验Excel";
 };
 const acceptFile=file=>{
   if(busy)return;
   currentFile=null;preview=null;requestBody=null;created=null;commitAttempted=false;panel.hidden=true;panel.innerHTML="";
   if(!file){message("");step(1);refreshAction();return;}
   if(!String(file.name||"").toLowerCase().endsWith(".xlsx")||!file.size||file.size>1900000){
     message("仅支持非空的 .xlsx 文件，且不能超过1.9MB。",true);
     if(picker)picker.value="";
     step(1);refreshAction();return;
   }
   currentFile=file;
   message("已选择："+file.name+"｜"+(file.size/1024).toFixed(0)+"KB");
   step(2);refreshAction();
 };
 const close=()=>{if(!busy)dialog.close();};
 target.querySelectorAll("[data-pe-close]").forEach(b=>b.addEventListener("click",close));
 dialog.addEventListener("cancel",event=>{if(busy)event.preventDefault();});
 picker.addEventListener("change",()=>acceptFile(picker.files?.[0]));
 ["dragenter","dragover"].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();drop.classList.add("is-dragging");}));
 ["dragleave","drop"].forEach(name=>drop.addEventListener(name,event=>{event.preventDefault();drop.classList.remove("is-dragging");}));
 drop.addEventListener("drop",event=>acceptFile(event.dataTransfer?.files?.[0]));
 target.querySelector("[data-pe-template-inner]").addEventListener("click",async event=>{
   const button=event.currentTarget;button.disabled=true;
   try{await aioneDownload(BASE+"/export.xlsx?q=__AIONE_EMPTY_TEMPLATE__");}
   catch(error){showPanel("<strong>模板下载失败</strong><p>"+esc(error.message)+"</p>",true);}
   finally{button.disabled=false;}
 });
 action.addEventListener("click",async()=>{
   if(busy)return;
   if(created||commitAttempted){
     dialog.close();
     await showProducts(host,created?"已导入："+created.successCount+"件；未成功："+created.failedCount+"件。":"请核对商品一览中的导入结果后，再尝试上传。");
     return;
   }
   if(!currentFile)return;
   busy=true;action.disabled=true;
   if(!preview){
     action.textContent="正在校验…";
     try{
       const body={filename:currentFile.name,base64:await fileBase64(currentFile)};
       const data=await aioneApi(BASE+"/import/preview",{method:"POST",body:JSON.stringify(body)});
       const items=Array.isArray(data.items)?data.items:[];
       const codes=items.map(x=>String(x.localCode||"").trim().toLowerCase());
       const repeated=codes.filter((x,i)=>x&&codes.indexOf(x)!==i);
       if(repeated.length)throw new Error("上传文件内有重复货号："+[...new Set(repeated)].join("、")+"。请先修正后重新上传。");
       const newCount=items.filter(x=>x.action==="new_draft").length;
       const conflictCount=items.length-newCount;
       if(!items.length)throw new Error("文件中没有可导入的商品。");
       const labels={new_draft:"新增草稿",existing_requires_confirm:"货号已存在（不会覆盖）",blocked_duplicate:"重复货号（禁止导入）"};
       showPanel(
         '<strong>校验完成｜'+items.length+'件：新增 '+newCount+'件，已存在／阻断 '+conflictCount+'件</strong>'+
         '<div class="pe-scroll"><table class="pe-table"><thead><tr><th>商品货号</th><th>商品名称</th><th>处理结果</th></tr></thead><tbody>'+
         items.map(item=>'<tr><td>'+esc(item.localCode)+'</td><td>'+esc(item.nameZh)+'</td><td>'+esc(labels[item.action]||"需核对")+'</td></tr>').join("")+
         '</tbody></table></div>'+
         (data.warnings||[]).map(w=>'<p class="pe-note">'+esc(w)+'</p>').join("")+
         '<p class="pe-note">仅新增草稿；已存在货号提交时会被拒绝，不覆盖原商品。</p>'
       );
       preview=data;requestBody=body;step(3);
     }catch(error){
       preview=null;requestBody=null;step(2);
       showPanel("<strong>校验未通过</strong><p>"+esc(error.message)+"</p>",true);
     }finally{busy=false;refreshAction();}
     return;
   }
   action.textContent="正在导入…";
   // Submission may finish server-side even if the network response fails: never retry blindly.
   commitAttempted=true;
   try{
     const result=await aioneApi(BASE+"/import/commit",{method:"POST",body:JSON.stringify({...requestBody,confirmed:true})});
     created={successCount:Number(result.successCount)||0,failedCount:Number(result.failedCount)||0};
     const failures=(result.results||[]).filter(x=>!x.ok);
     showPanel(
       '<strong>导入完成｜成功 '+created.successCount+'件，失败／重复 '+created.failedCount+'件</strong>'+
       (failures.length?'<div class="pe-scroll"><table class="pe-table"><thead><tr><th>货号</th><th>未成功原因</th></tr></thead><tbody>'+
        failures.map(item=>'<tr><td>'+esc(item.localCode)+'</td><td>'+esc(item.message||item.code||"未知错误")+'</td></tr>').join("")+
        '</tbody></table></div>':'<p>新商品草稿已保存；可以在商品一览中打开编辑。</p>')
     );
     step(4);
   }catch(error){
     showPanel("<strong>导入结果尚未确认</strong><p>"+esc(error.message)+"。请先返回商品一览核对，避免重复提交。</p>",true);
   }finally{busy=false;refreshAction();}
 });
 dialog.showModal();
}

function erpListStyle(){if(document.getElementById("aione-erp-list-layout"))return;const node=document.createElement("style");node.id="aione-erp-list-layout";node.textContent=".pe-server-pages{display:flex;gap:10px;align-items:center;padding:8px 0}.pe-server-pages button{padding:5px 10px;border:1px solid #dce4df;border-radius:5px;background:#fff;cursor:pointer}.pe-erp-layout{display:grid;grid-template-columns:165px minmax(0,1fr);gap:10px}.pe-erp-tree{border:1px solid #e2e9e4;border-radius:7px;padding:10px;background:#fafcfb;min-width:0}.pe-erp-tree strong{display:block;margin-bottom:10px}.pe-erp-tree button{width:100%;text-align:left;border:0;background:transparent;padding:7px;border-radius:5px;color:#345341;cursor:pointer}.pe-erp-tree button.is-active{color:#176b4d;background:#e8f4ed;font-weight:700}.pe-erp-list{min-width:0}.pe-erp-filter{display:flex;gap:8px;margin-bottom:7px}.pe-erp-filter input,.pe-erp-filter select{border:1px solid #dce4df;border-radius:5px;padding:7px;background:#fff;min-width:0}.pe-erp-filter input{width:275px;max-width:65%}@media(max-width:650px){.pe-erp-layout{grid-template-columns:1fr}.pe-erp-tree{max-height:120px;overflow:auto}}";document.head.appendChild(node)}
export async function showProducts(host,notice=""){
 stopEditor(host);releaseListImages(host);style();erpListStyle();
 host.innerHTML='<section class="phc pe-wrap pe-erp"><div class="pe-toolbar"><div><h2>商品列表</h2><p class="pe-note">分类筛选 · 统一列设置 · 可双击自动适配列宽</p></div><div><button class="pe-main" data-pe-new>＋ 新建商品</button> <button data-pe-import-open>批量导入</button> <button data-pe-export>导出 Excel</button></div></div>'+(notice?'<p role="status">'+esc(notice)+'</p>':"")+
 '<div class="pe-erp-layout"><aside class="pe-erp-tree"><strong>商品分类</strong><div data-pe-categories></div></aside><main class="pe-erp-list"><div class="pe-erp-filter"><input data-pe-q placeholder="搜索货号 / 商品名称" aria-label="搜索商品"><select data-pe-category aria-label="商品分类"><option value="">全部分类</option></select></div><div data-pe-table role="region" aria-label="商品列表">读取真实数据中…</div></main></div><div data-pe-import></div></section>';
 host.querySelector("[data-pe-new]").onclick=()=>editor(host,{});
 host.querySelector("[data-pe-import-open]").onclick=()=>importer(host);
 host.querySelector("[data-pe-export]").onclick=async()=>{try{await aioneDownload(BASE+"/export.xlsx");}catch(e){alert("导出失败："+e.message);}};
 let all=[],term="",chosenCategory="",loadedCategories=[],offset=0,hasMore=false,lastRequest=0;
 const area=host.querySelector("[data-pe-table]");
 const thumbnails=new Map(),thumbsAbort=new AbortController();ACTIVE_LIST_IMAGES.set(host,thumbsAbort);
 const attachProductImages=()=>{const elements=[...area.querySelectorAll("[data-pe-thumb]")];let cursor=0;
   const load=async()=>{while(cursor<elements.length&&!thumbsAbort.signal.aborted){const el=elements[cursor++],id=el.dataset.peThumb;if(!el.isConnected||!id)continue;
     let url=thumbnails.get(id);if(!url){try{url=(await aioneImageBlobInfo("/api/v1/product-assets/"+encodeURIComponent(id)+"/content?webpSize=64")).url;thumbnails.set(id,url);thumbsAbort.signal.addEventListener("abort",()=>URL.revokeObjectURL(url),{once:true})}catch{if(el.isConnected)el.textContent="—";continue}}
     if(!el.isConnected)continue;const img=document.createElement("img");img.alt="商品缩略图";img.className="sku-img";img.loading="lazy";img.src=url;el.replaceChildren(img)
   }};
   void Promise.all(Array.from({length:Math.min(4,elements.length)},()=>load()));
 };

 const list=()=>all.filter(p=>(!chosenCategory||p.category===chosenCategory)&&(!term||[p.localCode,p.nameZh,p.brand,p.category].some(v=>String(v||"").toLowerCase().includes(term))));
 const editProduct=async row=>{if(row.readOnly)return;try{const d=await aioneApi(BASE+"/"+encodeURIComponent(row.id));editor(host,d.product)}catch(e){alert("读取失败："+e.message)}};
 const draw=()=>{
   const categories=loadedCategories.length?loadedCategories:[...new Set(all.map(p=>String(p.category||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"zh"));
   host.querySelector("[data-pe-categories]").innerHTML='<button data-pe-cat="" class="'+(!chosenCategory?"is-active":"")+'">全部商品</button>'+categories.map(c=>'<button data-pe-cat="'+esc(c)+'" class="'+(chosenCategory===c?"is-active":"")+'">'+esc(c)+'</button>').join("");
   host.querySelectorAll("[data-pe-cat]").forEach(b=>b.onclick=()=>{chosenCategory=b.dataset.peCat;host.querySelector("[data-pe-category]").value=chosenCategory;offset=0;void load()});
   const sel=host.querySelector("[data-pe-category]");sel.innerHTML='<option value="">全部分类</option>'+categories.map(c=>'<option value="'+esc(c)+'" '+(chosenCategory===c?"selected":"")+'>'+esc(c)+'</option>').join("");
   const rows=list();
   const summaries=new Map(rows.map(p=>{
     try{
       const calculation=calculateProductCosts(p,null,LIVE_PARAMETERS);
       if(calculation.status==="priced"&&calculation.deliveryQuote?.status==="priced"&&Number.isFinite(calculation.net)&&calculation.price>0){
         return [p.id,{estimatedProfit:Math.round(calculation.net),profitRate:Math.round(calculation.net/calculation.price*1000)/10}];
       }
     }catch{/* Missing inputs must never fabricate a margin. */}
     return [p.id,{estimatedProfit:null,profitRate:null}];
   }));
   const columns=[
     {key:"localCode",label:"商品货号",minWidth:95,render:r=>'<strong>'+esc(r.localCode||"—")+'</strong>'},
     {key:"nameZh",label:"商品名称",minWidth:195},
     {key:"category",label:"分类",minWidth:90},
     {key:"brand",label:"品牌",minWidth:85},
     {key:"skuCount",label:"SKU数量",type:"number",minWidth:85},
     {key:"purchaseUnitCostCny",label:"采购价",type:"number",minWidth:90},
     {key:"salePriceJpy",label:"售价",type:"number",minWidth:90},
     {key:"estimatedProfit",label:"单件预计利润",type:"number",minWidth:105,render:r=>r.estimatedProfit==null?'待核算':esc(r.estimatedProfit)},
     {key:"profitRate",label:"利润率",type:"number",minWidth:80,render:r=>r.profitRate==null?'待核算':esc(r.profitRate)+"%"},
     {key:"readinessLabel",label:"资料状态",minWidth:110},
     {key:"publicationLabel",label:"上架状态",minWidth:110},
     {key:"image",label:"图片",defaultVisible:false,minWidth:66,render:r=>r.representativeImageAssetId?'<span data-pe-thumb="'+esc(r.representativeImageAssetId)+'">▧</span>':"—"},
     {key:"productCode",label:"内部编码",defaultVisible:false,minWidth:100},
     {key:"version",label:"版本",defaultVisible:false,type:"number",minWidth:70}
   ];
   renderErpGrid(area,{id:"products",columns,rows:rows.map(p=>({...p,skuCount:Array.isArray(p.specs)?skuRows(p).length:0,readinessLabel:p.readiness?.label||"待核实",publicationLabel:p.publication?.label||"待核实",...summaries.get(p.id)})),onRowClick:editProduct,empty:"当前筛选没有商品",onRender:attachProductImages});
 };
 const load=async()=>{
   const seq=++lastRequest;
   const url=BASE+"?limit=101&offset="+offset+"&q="+encodeURIComponent(term)+"&category="+encodeURIComponent(chosenCategory);
   try{
     const response=await aioneApi(url);
     if(seq!==lastRequest)return;
     hasMore=(response.items||[]).length>100;all=(response.items||[]).slice(0,100);
     draw();
     let pager=host.querySelector("[data-product-server-pages]");
     if(!pager){pager=document.createElement("div");pager.dataset.productServerPages="";pager.className="pe-server-pages";area.after(pager)}
     pager.replaceChildren();
     const previous=document.createElement("button");previous.textContent="上一组";previous.disabled=offset===0;previous.onclick=()=>{offset=Math.max(0,offset-100);void load()};
     const next=document.createElement("button");next.textContent="下一组";next.disabled=!hasMore;next.onclick=()=>{offset+=100;void load()};
     const indicator=document.createElement("span");indicator.textContent="第 "+(Math.floor(offset/100)+1)+" 组 · 每组最多100件商品";
     pager.append(previous,indicator,next);
   }catch(e){if(seq===lastRequest)area.innerHTML='<div class="pe-alert">商品读取失败：'+esc(e.message)+'</div>'}
 };
 let typing;
 host.querySelector("[data-pe-q]").oninput=e=>{term=e.target.value.toLowerCase().trim();offset=0;clearTimeout(typing);typing=setTimeout(()=>{void load()},250)};
 host.querySelector("[data-pe-category]").onchange=e=>{chosenCategory=e.target.value;offset=0;void load()};
 try{
   const [catalog]=await Promise.all([aioneApi(BASE+"/categories").catch(()=>({categories:[]})),refreshLiveParameters()]);
   loadedCategories=Array.isArray(catalog.categories)?catalog.categories:[];
   await load();
 }catch(e){area.innerHTML='<div class="pe-alert">商品读取失败：'+esc(e.message)+'</div>'}
}
export function openProductEditor(host){editor(host,{});}
export async function showSkuList(host){
 stopEditor(host);style();
 host.innerHTML='<section class="phc pe-wrap pe-erp"><div class="pe-toolbar"><div><h2>SKU列表</h2><p class="pe-note">SKU来源于已保存的商品规格；库存尚未核实的记录不得冒充实际仓库库存。</p></div><button data-sku-products>返回商品列表</button></div><p><input data-sku-search placeholder="搜索货号 / SKU / 规格" style="padding:9px;border:1px solid #dce4df;border-radius:7px;max-width:340px;width:100%"></p><div data-sku-table>正在读取SKU…</div></section>';
 host.querySelector("[data-sku-products]").onclick=()=>showProducts(host);
 let entries=[];
 const draw=()=>{const q=host.querySelector("[data-sku-search]").value.trim().toLowerCase();const rows=entries.filter(x=>!q||[x.number,x.localCode,x.productName,x.label].some(v=>String(v||"").toLowerCase().includes(q)));
 renderErpGrid(host.querySelector("[data-sku-table]"),{id:"sku",rows,columns:[
 {key:"number",label:"SKU编号",minWidth:145},{key:"localCode",label:"商品货号",minWidth:100},
 {key:"productName",label:"商品名称",minWidth:185},{key:"label",label:"销售规格",minWidth:150},
 {key:"price",label:"售价",type:"number",minWidth:90},{key:"stock",label:"默认库存",type:"number",minWidth:90},
 {key:"cost",label:"采购价",type:"number",defaultVisible:false},{key:"weight",label:"重量",type:"number",defaultVisible:false}
 ],empty:"没有已保存的SKU",onRowClick:async r=>{try{const d=await aioneApi(BASE+"/"+encodeURIComponent(r.productId));if(d.product.readOnly){alert("既有商品为只读记录");return}editor(host,d.product)}catch(e){alert("读取商品失败："+e.message)}}});};
 host.querySelector("[data-sku-search]").oninput=draw;
 try{const data=await aioneApi(BASE+"?limit=200");entries=(data.items||[]).filter(p=>!p.readOnly&&Array.isArray(p.specs)).flatMap(p=>skuRows(p).map(s=>({...s,productId:p.id,productName:p.nameZh,localCode:p.localCode})));draw()}catch(e){host.querySelector("[data-sku-table]").innerHTML='<div class="pe-alert">SKU读取失败：'+esc(e.message)+'</div>'}
}
export async function initProductManualEntry(){
 const host=document.getElementById("app-main-host");if(!host)return false;
 await showProducts(host);return true;
}
