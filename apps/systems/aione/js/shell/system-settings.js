import {aioneApi} from "../services/aione-api-client.js";
import {INITIAL_PARAMETERS} from "../config/shared-parameter-defaults.js";
/* ========================================
   MIWA Global System Settings｜美和全局系统参数
   一处配置、全局继承、版本化生效。保留既有价格参数键，兼容选品详情页。
======================================== */

// Cloud SQL is the single active parameter source; browser storage is not used.
let activeRevision=0,parameterStatus="loading";


const FIELD_LABELS = {
  'common.cnyToJpyRate':'CNY兑JPY汇率','common.internationalFreightRate':'国际运费单价','common.importMiscRate':'进口杂费率',
  'common.costSafetyBufferRate':'成本安全缓冲率','common.packageCostPerSaleSetJPY':'套装包装成本','common.consumptionTaxRate':'消费税率',
  'shop.platformFeeRate':'平台费率','common.settlementFeeRate':'结算手续费率','common.returnLossRate':'预计退货损失率','shop.advertisingRate':'广告费率',
  'shop.couponRate':'优惠券率','shop.pointRate':'积分成本率','shop.otherOperatingCostJPY':'其他运营成本','pricing.targetContributionProfitJPY':'最低单件贡献利润',
  'pricing.targetContributionMarginRate':'最低运营前贡献利润率','pricing.minimumGrossMarginRate':'最低毛利率','pricing.minimumCampaignContributionMarginRate':'活动最低贡献利润率',
  'pricing.officialRetailMarkupRate':'官方建议零售价上浮率','pricing.officialRetailHighMarkupRate':'官方建议零售价高上浮档','pricing.normalDisposalLossRate':'正常处理允许亏损率','pricing.maximumDisposalLossRate':'最大处理亏损率','pricing.priceEndingRule':'售价尾数规则','common.directShippingFirstWeightGram':'直发首重重量','common.directShippingFirstWeightFeeCNY':'直发首重费用','common.directShippingAdditionalWeightUnitGram':'直发续重单位','common.directShippingAdditionalWeightFeeCNY':'直发续重费用','dictionaries.customerTypes':'客户类型',
  'dictionaries.supplierTypes':'供应商类型','dictionaries.applicationTypes':'应用类型','dictionaries.storeTypes':'店铺类型','dictionaries.expenseTypes':'支出类型','dictionaries.incomeTypes':'收入类型','dictionaries.talentTypes':'人才类型','dictionaries.categoryTypes':'分类类型','dictionaries.productTypes':'商品类型','dictionaries.aiCapabilityTypes':'AI能力类型','dictionaries.sharedResourceTypes':'共享资源类型','dictionaries.miwaContentTypes':'美和之家内容类型','dictionaries.knowledgeContentTypes':'知识类型','dictionaries.notificationTypes':'通知类型'
};

const clone = (value) => JSON.parse(JSON.stringify(value));
let activeParameters = clone(INITIAL_PARAMETERS);
let draftParameters = clone(INITIAL_PARAMETERS);
let parameterHistory=[];
let returnHash = '#/selection';

function getByPath(object, path) { return path.split('.').reduce((value, key) => value?.[key], object); }
function setByPath(object, path, value) { const keys=path.split('.'); const last=keys.pop(); let target=object; keys.forEach((key)=>{ if(!target[key]||typeof target[key]!=='object') target[key]={}; target=target[key]; }); target[last]=value; }
const parseBool = (value) => value === true || value === 'true';
function readInput(input) { const type=input.dataset.paramType || (input.type==='number'?'number':'string'); if(type==='boolean') return parseBool(input.value); if(type==='csv') return String(input.value||'').split(/[,，]/).map((x)=>x.trim()).filter(Boolean); if(type==='number') return Number(input.value); return input.value; }
function writeInput(input, value) { const type=input.dataset.paramType || (input.type==='number'?'number':'string'); if(type==='boolean') input.value=String(Boolean(value)); else if(type==='csv') input.value=Array.isArray(value)?value.join('，'):''; else input.value=value ?? ''; }
function formatLocalTime(value) { if(!value) return '待形成'; const date=new Date(value); if(Number.isNaN(date.getTime())) return String(value); return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date).replaceAll('/','-'); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'\"]/g,(char)=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;' }[char])); }
function mergeDefaults(value, defaults) { if(!value||typeof value!=='object'||Array.isArray(value)) return clone(defaults); const result=clone(defaults); Object.entries(value).forEach(([key,current])=>{ if(current&&typeof current==='object'&&!Array.isArray(current)&&result[key]&&typeof result[key]==='object'&&!Array.isArray(result[key])) result[key]=mergeDefaults(current,result[key]); else result[key]=current; }); return result; }

async function loadState(){
 try{
  const response=await aioneApi("/api/v1/shared-parameters");
  activeRevision=response.version;
  activeParameters=clone(response.parameters);
  parameterHistory=[{...clone(activeParameters),active:true,changes:[]}];
  draftParameters=clone(activeParameters);
  parameterStatus="ready";
  expose();window.dispatchEvent(new Event("aione:shared-parameters-loaded"));renderMeta();syncInputs();renderHistory();renderNotice();
 }catch(error){
  parameterStatus="error";renderNotice("共享参数读取失败，禁止保存："+error.message,true);
 }
}
function saveState(){expose();}

function expose(){ window.AIONESystemParameters=clone(activeParameters); }
export function getActiveSystemParameters(){ return clone(activeParameters); }

function draftChanged(){ const a=clone(draftParameters), b=clone(activeParameters); ['version','updatedAt','updatedBy'].forEach((key)=>{delete a[key];delete b[key];}); return JSON.stringify(a)!==JSON.stringify(b); }
function nextVersion(){ const now=new Date(); const date=`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`; const prefix=`AIONE-PARAM-${date}-`; const max=parameterHistory.filter((item)=>String(item.version||'').startsWith(prefix)).reduce((current,item)=>Math.max(current,Number(String(item.version).slice(prefix.length))||0),0); return `${prefix}${String(max+1).padStart(2,'0')}`; }
function collectChanges(before,after,prefix=''){ const changes=[]; const keys=new Set([...Object.keys(before||{}),...Object.keys(after||{})]); keys.forEach((key)=>{ const path=prefix?`${prefix}.${key}`:key; if(['version','updatedAt','updatedBy','active','changes','changeReason'].includes(key)) return; const left=before?.[key],right=after?.[key]; if(left&&right&&typeof left==='object'&&typeof right==='object'&&!Array.isArray(left)&&!Array.isArray(right)) changes.push(...collectChanges(left,right,path)); else if(JSON.stringify(left)!==JSON.stringify(right)) changes.push({path,before:left,after:right}); }); return changes; }
function validate(draft){ const errors=[]; const nonnegative=(v)=>Number.isFinite(Number(v))&&Number(v)>=0; const positive=(v)=>Number.isFinite(Number(v))&&Number(v)>0; const percent=(v)=>Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=100; if(!positive(draft.common.cnyToJpyRate)) errors.push('CNY兑JPY汇率必须大于0'); ['importMiscRate','returnLossRate','settlementFeeRate','consumptionTaxRate','costSafetyBufferRate'].forEach((k)=>{if(!percent(draft.common[k]))errors.push(`${k}必须在0至100之间`)}); ['platformFeeRate','advertisingRate','couponRate','pointRate'].forEach((k)=>{if(!percent(draft.shop[k]))errors.push(`${k}必须在0至100之间`)}); if(!percent(draft.ai.autoFillConfidence)) errors.push('AI自动填充置信度必须在0至100之间'); if(!nonnegative(draft.pricing.targetContributionProfitJPY)) errors.push('最低单件贡献利润不得小于0'); return errors; }

function renderDelivery(){ const host=document.getElementById('global-settings-delivery-list'); if(!host)return; host.innerHTML=Object.entries(draftParameters.delivery||{}).sort((a,b)=>(a[1].sortOrder||0)-(b[1].sortOrder||0)).map(([code,item])=>`<div class="miwa-settings-delivery-row"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(code)}</small></div><label><input type="checkbox" data-global-delivery-enabled="${escapeHtml(code)}" ${item.enabled!==false?'checked':''}> 启用</label><div class="miwa-settings-inline-number"><input type="number" min="0" step="1" data-global-delivery-fee="${escapeHtml(code)}" value="${item.fee}"><b>JPY</b></div></div>`).join(''); host.querySelectorAll('[data-global-delivery-enabled]').forEach((input)=>input.addEventListener('change',()=>{draftParameters.delivery[input.dataset.globalDeliveryEnabled].enabled=input.checked;renderNotice();})); host.querySelectorAll('[data-global-delivery-fee]').forEach((input)=>input.addEventListener('input',()=>{draftParameters.delivery[input.dataset.globalDeliveryFee].fee=Number(input.value);renderNotice();})); }
function syncInputs(){ document.querySelectorAll('[data-global-param]').forEach((input)=>writeInput(input,getByPath(draftParameters,input.dataset.globalParam))); renderDelivery(); }
function renderMeta(){ const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;}; set('global-settings-current-version',activeParameters.version||'待形成');set('global-settings-updated-by',activeParameters.updatedBy||'系统');set('global-settings-updated-at',formatLocalTime(activeParameters.updatedAt)); }
function renderNotice(message=null,error=false){ const notice=document.getElementById('global-settings-notice');if(!notice)return;notice.classList.toggle('is-error',Boolean(error));notice.textContent=message||(draftChanged()?'有未保存修改。所有业务页面仍读取当前生效版本；保存并设为当前生效后全局同步。':'当前草稿与生效参数一致。'); }
function renderHistory(){ const host=document.getElementById('global-settings-history-list');if(!host)return;host.innerHTML=parameterHistory.map((item)=>`<details><summary><strong>${escapeHtml(item.version||'未命名版本')}</strong><span>全平台通用</span><span>${escapeHtml(formatLocalTime(item.updatedAt))}</span><span>${escapeHtml(item.updatedBy||'系统')}</span>${item.active?'<span class="active-tag">当前生效</span>':'<span>未生效</span>'}</summary>${item.changeReason?`<p><strong>变更原因：</strong>${escapeHtml(item.changeReason)}</p>`:''}${Array.isArray(item.changes)&&item.changes.length?`<ul>${item.changes.slice(0,80).map((change)=>`<li>${escapeHtml(FIELD_LABELS[change.path]||change.path)}：${escapeHtml(JSON.stringify(change.before))} → ${escapeHtml(JSON.stringify(change.after))}</li>`).join('')}</ul>`:'<p>初始建议值或无前版差异。</p>'}</details>`).join(''); }
async function saveDraft(activate){
 if(parameterStatus!=="ready"){renderNotice("共享参数服务不可用，禁止提交",true);return;}
 const errors=validate(draftParameters);
 if(errors.length){renderNotice("请修正参数："+errors.join("；"),true);return;}
 const reason=String(document.getElementById("global-settings-change-reason")?.value||"").trim();
 if(!reason){renderNotice("请输入修改原因",true);return;}
 if(!activate){renderNotice("本次只保存到Cloud SQL的正式生效版本，请点击「保存并生效」",true);return;}
 try{
  const updated=await aioneApi("/api/v1/shared-parameters",{method:"PATCH",body:JSON.stringify({expectedVersion:activeRevision,parameters:draftParameters,changeReason:reason})});
  activeRevision=updated.version;
  activeParameters=clone(updated.parameters);
  draftParameters=clone(activeParameters);
  parameterHistory=[{...clone(activeParameters),active:true,changes:[]},...parameterHistory.map(x=>({...x,active:false}))].slice(0,30);
  saveState();renderMeta();renderHistory();syncInputs();
  document.getElementById("global-settings-change-reason").value="";
  renderNotice("云端参数版本 "+activeRevision+" 已生效");
  window.dispatchEvent(new CustomEvent("aione:global-pricing-updated",{detail:{parameters:clone(activeParameters),version:activeRevision}}));
  window.dispatchEvent(new CustomEvent("aione:global-settings-updated",{detail:{parameters:clone(activeParameters),version:activeRevision}}));
 }catch(error){renderNotice("未保存："+error.message,true);}
}

function openSettings(){ const overlay=document.getElementById('miwa-global-settings');if(!overlay)return;overlay.hidden=false;document.body.classList.add('miwa-settings-open');renderMeta();syncInputs();renderHistory();renderNotice();requestAnimationFrame(()=>overlay.querySelector('[data-settings-close]')?.focus()); }
function closeSettings(){ const overlay=document.getElementById('miwa-global-settings');if(!overlay)return;overlay.hidden=true;document.body.classList.remove('miwa-settings-open');if(window.location.hash.startsWith('#/settings')){history.replaceState(null,'',returnHash||'#/selection');window.dispatchEvent(new HashChangeEvent('hashchange'));}}
function routeSettings(){ const isSettings=window.location.hash.startsWith('#/settings');if(isSettings)openSettings();else{const overlay=document.getElementById('miwa-global-settings');if(overlay&&!overlay.hidden){overlay.hidden=true;document.body.classList.remove('miwa-settings-open');}if(window.location.hash)returnHash=window.location.hash;}}

export function initSystemSettings(){ const overlay=document.getElementById('miwa-global-settings');if(!overlay||overlay.dataset.initialized==='true')return;overlay.dataset.initialized='true';attachCommerceControls();void loadState();renderMeta();syncInputs();renderHistory();renderNotice();document.querySelectorAll('[data-global-param]').forEach((input)=>{const event=input.tagName==='SELECT'?'change':'input';input.addEventListener(event,()=>{setByPath(draftParameters,input.dataset.globalParam,readInput(input));renderNotice();});});document.querySelectorAll('[data-global-settings-tab]').forEach((button)=>button.addEventListener('click',()=>{document.querySelectorAll('[data-global-settings-tab]').forEach((item)=>item.classList.toggle('is-active',item===button));document.querySelectorAll('[data-global-settings-section]').forEach((section)=>{section.hidden=section.dataset.globalSettingsSection!==button.dataset.globalSettingsTab;});}));overlay.querySelectorAll('[data-settings-close]').forEach((button)=>button.addEventListener('click',closeSettings));overlay.addEventListener('click',(event)=>{if(event.target===overlay)closeSettings();});document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&!overlay.hidden)closeSettings();});document.getElementById('global-settings-reset')?.addEventListener('click',()=>{draftParameters={...clone(INITIAL_PARAMETERS),commerce:clone(activeParameters.commerce),delivery:clone(activeParameters.delivery),settingsCatalogMeta:clone(activeParameters.settingsCatalogMeta||{})};syncInputs();renderNotice('已恢复系统建议值到草稿，尚未保存。');});document.getElementById('global-settings-save')?.addEventListener('click',()=>saveDraft(false));document.getElementById('global-settings-activate')?.addEventListener('click',()=>saveDraft(true));document.getElementById('global-settings-history-toggle')?.addEventListener('click',()=>{const history=document.getElementById('global-settings-history');if(history)history.hidden=!history.hidden;});window.addEventListener('hashchange',routeSettings);routeSettings();}

function attachCommerceControls(){
 const deliveryList=document.getElementById("global-settings-delivery-list");
 if(!deliveryList||document.getElementById("aione-commerce-logistics-fields"))return;
 const wrap=document.createElement("div");wrap.id="aione-commerce-logistics-fields";
 deliveryList.after(wrap);
 const render=()=>{
  if(parameterStatus!=="ready")return;
  wrap.innerHTML='<h3>统一物流费率</h3>'+Object.entries(draftParameters.commerce.logistics).map(([code,rule])=>{
   const fields=rule.billing==="step"?[["firstWeightG","首重g"],["firstFeeCny","首重CNY"],["additionalWeightG","续重g"],["additionalFeeCny","续重CNY"]]:[["perKgCny","CNY/kg"]];
   return '<div class="miwa-settings-delivery-row"><strong>'+escapeHtml(rule.name)+'</strong>'+fields.map(([key,label])=>'<label>'+label+'<input type="number" min="0" step="any" data-commerce-mode="'+escapeHtml(code)+'" data-commerce-key="'+key+'" value="'+rule[key]+'"></label>').join('')+'</div>';
  }).join('')+'<h3>中国包装成本（CNY/套）</h3>'+Object.entries(draftParameters.commerce.chinaPackagingCny).map(([name,price])=>'<label>'+escapeHtml(name)+' <input type="number" min="0" step="any" data-china-pack="'+escapeHtml(name)+'" value="'+price+'"></label>').join('')+'<h3>日本包装物成本（JPY/套）</h3>'+Object.entries(draftParameters.commerce.japanPackagingJpy).map(([name,price])=>'<label>'+escapeHtml(name)+' <input type="number" min="0" step="any" data-japan-pack="'+escapeHtml(name)+'" value="'+price+'"></label>').join('')+'<h3>目标和计费</h3>'+[["tariffRatePct","预估关税%"],["productMarginTargetPct","目标毛利率%"],["operatingMarginTargetPct","运营目标利润率%"],["priceRoundUnitJpy","价格步长JPY"],["priceTailJpy","售价尾数JPY"]].map(([key,label])=>'<label>'+label+' <input type="number" min="0" step="any" data-commerce-scalar="'+key+'" value="'+draftParameters.commerce[key]+'"></label>').join('');
  wrap.querySelectorAll("input").forEach(el=>el.addEventListener("change",()=>{
   const v=Number(el.value);
   if(el.dataset.commerceMode)draftParameters.commerce.logistics[el.dataset.commerceMode][el.dataset.commerceKey]=v;
   else if(el.dataset.chinaPack)draftParameters.commerce.chinaPackagingCny[el.dataset.chinaPack]=v;
   else if(el.dataset.japanPack)draftParameters.commerce.japanPackagingJpy[el.dataset.japanPack]=v;
   else if(el.dataset.commerceScalar)draftParameters.commerce[el.dataset.commerceScalar]=v;
   renderNotice();
  }));
 };
 window.addEventListener("aione:shared-parameters-loaded",render);
 document.getElementById("global-settings-reset")?.addEventListener("click",()=>queueMicrotask(render));
 render();
}

// Keep the former settings entry on the same authoritative version as the center.
window.addEventListener("aione:settings-center-saved",event=>{
 const updated=event.detail;
 if(draftChanged()){parameterStatus="conflict";renderNotice("设置中心已有更新。当前旧草稿不可直接覆盖，请重新读取后编辑。",true);return;}
 activeRevision=updated.version;activeParameters=clone(updated.parameters);draftParameters=clone(updated.parameters);
 parameterStatus="ready";expose();renderMeta();syncInputs();renderNotice();window.dispatchEvent(new Event("aione:shared-parameters-loaded"));
});
