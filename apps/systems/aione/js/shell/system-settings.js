/* ========================================
   MIWA Global System Settings｜美和全局系统参数
   一处配置、全局继承、版本化生效。保留既有价格参数键，兼容选品详情页。
======================================== */

const STORAGE_KEY = 'miwa-aione:restored-preview:v0.4:pricing-profiles';

const INITIAL_PARAMETERS = {
  version: 'AIONE-PARAM-20260822-02', updatedBy: '系统建议值', updatedAt: '2026-08-22T13:43:00+09:00',
  platform: { defaultLanguage: 'zh-CN', timeZone: 'Asia/Tokyo', pageSize: 12 },
  governance: { inheritanceEnabled: true, defaultScope: 'group' },
  permissions: { mode: 'open', defaultDataScope: 'group', allowCreate: true, allowImport: true, allowExport: true, auditSensitiveExport: true },
  dictionaries: {
    customerTypes: ['批发客户','电商客户','美和留学客户','物流客户','不动产客户','商务咨询客户'],
    applicationTypes: ['业务系统','物流应用','办公协作','云盘/文件','采购/购物平台','邮箱/通讯','其他应用'],
    storeTypes: ['跨境电商店铺','实体/线下店铺','其他事业店铺'],
    expenseTypes: ['固定支出','经营支出','采购成本','物流费用','人员费用','应用费用','广告费用','现金支出'],
    incomeTypes: ['电商销售收入','批发收入','服务收入','其他收入'],
    cashExpenseSources: ['Money软件导入','Excel/CSV导入','手工补录'],
    talentTypes: ['正式员工','兼职/时薪','其他内部协作'],
    categoryTypes: ['有形商品分类','无形业务分类','其他分类'],
    productTypes: ['有形商品','无形商品/服务','其他商品'],
    aiCapabilityTypes: ['AI人才','Skill','Agent','Connector','传统自动化/API','Computer Use'],
    sharedResourceTypes: ['文件资产','账号资产','共用素材','共用模板','共享工具','公共资源','可复用能力','代码资产'],
    miwaContentTypes: ['企业介绍','美和精神','美和准则','美和传承','发展历程','集团事业','组织与品牌','企业资料'],
    knowledgeContentTypes: ['方法论','标准','制度','SOP','业务知识','培训资料','案例/研究','系统/AI知识'],
    notificationTypes: ['重要通知','会议通知','制度/规则通知','业务通知','系统通知']
  },
  business: { priorityTypeCount: 3, overviewActionEnabled: true, createActionEnabled: true, requireMiwaNineElements: true },
  finance: { defaultCurrency: 'JPY', moneyFactRequired: true, autoAggregateExpense: true, autoAggregateIncome: true },
  assets: { checkStoreLinks: true, checkApplicationLinks: true, accountCompletenessReminder: true },
  io: { allowCsv: true, allowExcel: true, duplicateCheck: true, keepSourceId: true },
  notifications: { autoNotifyOnCreate: true, defaultScope: '相关人员', importantRequiresAck: true },
  ai: { pageAssistantEnabled: true, autoClassify: true, autoFillConfidence: 85, humanConfirmHighRisk: true },
  audit: { versionHistory: true, changeReasonRequired: true, lockedRuleProtection: true },
  common: {
    cnyToJpyRate: 25, internationalFreightRate: 20, packageCostPerSaleSetJPY: 50, importMiscRate: 10,
    returnLossRate: 3, settlementFeeRate: 0, consumptionTaxRate: 10, costSafetyBufferRate: 1,
    directShippingFirstWeightGram: 500, directShippingFirstWeightFeeCNY: 36,
    directShippingAdditionalWeightUnitGram: 500, directShippingAdditionalWeightFeeCNY: 7
  },
  shop: { platformFeeRate: 10, advertisingRate: 15, couponRate: 0, pointRate: 1, otherOperatingCostJPY: 0, pricingScenario: 'normal' },
  delivery: {
    THIN_3CM: { name: '3cm薄型', fee: 200, enabled: true, sortOrder: 1 }, SIZE_60: { name: '60サイズ', fee: 500, enabled: true, sortOrder: 2 },
    SIZE_80: { name: '80サイズ', fee: 600, enabled: true, sortOrder: 3 }, SIZE_100: { name: '100サイズ', fee: 700, enabled: true, sortOrder: 4 },
    SIZE_120: { name: '120サイズ', fee: 800, enabled: true, sortOrder: 5 }
  },
  pricing: {
    minimumGrossMarginRate: 50, targetContributionProfitJPY: 500, targetContributionMarginRate: 30,
    directSelectionMinimumProfitJPY: 500, officialRetailMarkupRate: 50, officialRetailHighMarkupRate: 100,
    minimumCampaignContributionMarginRate: 15, normalDisposalLossRate: 30, maximumDisposalLossRate: 50,
    selectionPassScore: 70, priceRoundingUnit: 0, priceEndingRule: 80
  }
};

const FIELD_LABELS = {
  'common.cnyToJpyRate':'CNY兑JPY汇率','common.internationalFreightRate':'国际运费单价','common.importMiscRate':'进口杂费率',
  'common.costSafetyBufferRate':'成本安全缓冲率','common.packageCostPerSaleSetJPY':'套装包装成本','common.consumptionTaxRate':'消费税率',
  'shop.platformFeeRate':'平台费率','common.settlementFeeRate':'结算手续费率','common.returnLossRate':'预计退货损失率','shop.advertisingRate':'广告费率',
  'shop.couponRate':'优惠券率','shop.pointRate':'积分成本率','shop.otherOperatingCostJPY':'其他运营成本','pricing.targetContributionProfitJPY':'最低单件贡献利润',
  'pricing.targetContributionMarginRate':'最低运营前贡献利润率','pricing.minimumGrossMarginRate':'最低毛利率','pricing.minimumCampaignContributionMarginRate':'活动最低贡献利润率',
  'pricing.officialRetailMarkupRate':'官方建议零售价上浮率','pricing.officialRetailHighMarkupRate':'官方建议零售价高上浮档','pricing.normalDisposalLossRate':'正常处理允许亏损率','pricing.maximumDisposalLossRate':'最大处理亏损率','pricing.priceEndingRule':'售价尾数规则','common.directShippingFirstWeightGram':'直发首重重量','common.directShippingFirstWeightFeeCNY':'直发首重费用','common.directShippingAdditionalWeightUnitGram':'直发续重单位','common.directShippingAdditionalWeightFeeCNY':'直发续重费用','dictionaries.customerTypes':'客户类型',
  'dictionaries.applicationTypes':'应用类型','dictionaries.storeTypes':'店铺类型','dictionaries.expenseTypes':'支出类型','dictionaries.incomeTypes':'收入类型','dictionaries.talentTypes':'人才类型','dictionaries.categoryTypes':'分类类型','dictionaries.productTypes':'商品类型','dictionaries.aiCapabilityTypes':'AI能力类型','dictionaries.sharedResourceTypes':'共享资源类型','dictionaries.miwaContentTypes':'美和之家内容类型','dictionaries.knowledgeContentTypes':'知识类型','dictionaries.notificationTypes':'通知类型'
};

const clone = (value) => JSON.parse(JSON.stringify(value));
let activeParameters = clone(INITIAL_PARAMETERS);
let draftParameters = clone(INITIAL_PARAMETERS);
let parameterHistory = [{ ...clone(INITIAL_PARAMETERS), active: true, changes: [] }];
let returnHash = '#/selection';

function getByPath(object, path) { return path.split('.').reduce((value, key) => value?.[key], object); }
function setByPath(object, path, value) { const keys=path.split('.'); const last=keys.pop(); let target=object; keys.forEach((key)=>{ if(!target[key]||typeof target[key]!=='object') target[key]={}; target=target[key]; }); target[last]=value; }
const parseBool = (value) => value === true || value === 'true';
function readInput(input) { const type=input.dataset.paramType || (input.type==='number'?'number':'string'); if(type==='boolean') return parseBool(input.value); if(type==='csv') return String(input.value||'').split(/[,，]/).map((x)=>x.trim()).filter(Boolean); if(type==='number') return Number(input.value); return input.value; }
function writeInput(input, value) { const type=input.dataset.paramType || (input.type==='number'?'number':'string'); if(type==='boolean') input.value=String(Boolean(value)); else if(type==='csv') input.value=Array.isArray(value)?value.join('，'):''; else input.value=value ?? ''; }
function formatLocalTime(value) { if(!value) return '待形成'; const date=new Date(value); if(Number.isNaN(date.getTime())) return String(value); return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date).replaceAll('/','-'); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'\"]/g,(char)=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;' }[char])); }
function mergeDefaults(value, defaults) { if(!value||typeof value!=='object'||Array.isArray(value)) return clone(defaults); const result=clone(defaults); Object.entries(value).forEach(([key,current])=>{ if(current&&typeof current==='object'&&!Array.isArray(current)&&result[key]&&typeof result[key]==='object'&&!Array.isArray(result[key])) result[key]=mergeDefaults(current,result[key]); else result[key]=current; }); return result; }

function loadState() { try { const raw=window.localStorage.getItem(STORAGE_KEY); if(raw){ const state=JSON.parse(raw); if(state?.active) activeParameters=mergeDefaults(state.active,INITIAL_PARAMETERS); if(Array.isArray(state?.history)&&state.history.length) parameterHistory=state.history.map((item)=>mergeDefaults(item,INITIAL_PARAMETERS)); } } catch(_){} draftParameters=clone(activeParameters); expose(); }
function saveState() { try { window.localStorage.setItem(STORAGE_KEY,JSON.stringify({active:activeParameters,history:parameterHistory})); } catch(_){} expose(); }
function expose(){ window.AIONESystemParameters=clone(activeParameters); }
export function getActiveSystemParameters(){ return clone(activeParameters); }

function draftChanged(){ const a=clone(draftParameters), b=clone(activeParameters); ['version','updatedAt','updatedBy'].forEach((key)=>{delete a[key];delete b[key];}); return JSON.stringify(a)!==JSON.stringify(b); }
function nextVersion(){ const now=new Date(); const date=`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`; const prefix=`AIONE-PARAM-${date}-`; const max=parameterHistory.filter((item)=>String(item.version||'').startsWith(prefix)).reduce((current,item)=>Math.max(current,Number(String(item.version).slice(prefix.length))||0),0); return `${prefix}${String(max+1).padStart(2,'0')}`; }
function collectChanges(before,after,prefix=''){ const changes=[]; const keys=new Set([...Object.keys(before||{}),...Object.keys(after||{})]); keys.forEach((key)=>{ const path=prefix?`${prefix}.${key}`:key; if(['version','updatedAt','updatedBy','active','changes','changeReason'].includes(key)) return; const left=before?.[key],right=after?.[key]; if(left&&right&&typeof left==='object'&&typeof right==='object'&&!Array.isArray(left)&&!Array.isArray(right)) changes.push(...collectChanges(left,right,path)); else if(JSON.stringify(left)!==JSON.stringify(right)) changes.push({path,before:left,after:right}); }); return changes; }
function validate(draft){ const errors=[]; const nonnegative=(v)=>Number.isFinite(Number(v))&&Number(v)>=0; const positive=(v)=>Number.isFinite(Number(v))&&Number(v)>0; const percent=(v)=>Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=100; if(!positive(draft.common.cnyToJpyRate)) errors.push('CNY兑JPY汇率必须大于0'); ['importMiscRate','returnLossRate','settlementFeeRate','consumptionTaxRate','costSafetyBufferRate'].forEach((k)=>{if(!percent(draft.common[k]))errors.push(`${k}必须在0至100之间`)}); ['platformFeeRate','advertisingRate','couponRate','pointRate'].forEach((k)=>{if(!percent(draft.shop[k]))errors.push(`${k}必须在0至100之间`)}); if(!percent(draft.ai.autoFillConfidence)) errors.push('AI自动填充置信度必须在0至100之间'); if(!nonnegative(draft.pricing.targetContributionProfitJPY)) errors.push('最低单件贡献利润不得小于0'); return errors; }

function renderDelivery(){ const host=document.getElementById('global-settings-delivery-list'); if(!host)return; host.innerHTML=Object.entries(draftParameters.delivery||{}).sort((a,b)=>(a[1].sortOrder||0)-(b[1].sortOrder||0)).map(([code,item])=>`<div class="miwa-settings-delivery-row"><div><strong>${item.name}</strong><small>${code}</small></div><label><input type="checkbox" data-global-delivery-enabled="${code}" ${item.enabled!==false?'checked':''}> 启用</label><div class="miwa-settings-inline-number"><input type="number" min="0" step="1" data-global-delivery-fee="${code}" value="${item.fee}"><b>JPY</b></div></div>`).join(''); host.querySelectorAll('[data-global-delivery-enabled]').forEach((input)=>input.addEventListener('change',()=>{draftParameters.delivery[input.dataset.globalDeliveryEnabled].enabled=input.checked;renderNotice();})); host.querySelectorAll('[data-global-delivery-fee]').forEach((input)=>input.addEventListener('input',()=>{draftParameters.delivery[input.dataset.globalDeliveryFee].fee=Number(input.value);renderNotice();})); }
function syncInputs(){ document.querySelectorAll('[data-global-param]').forEach((input)=>writeInput(input,getByPath(draftParameters,input.dataset.globalParam))); renderDelivery(); }
function renderMeta(){ const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;}; set('global-settings-current-version',activeParameters.version||'待形成');set('global-settings-updated-by',activeParameters.updatedBy||'系统');set('global-settings-updated-at',formatLocalTime(activeParameters.updatedAt)); }
function renderNotice(message=null,error=false){ const notice=document.getElementById('global-settings-notice');if(!notice)return;notice.classList.toggle('is-error',Boolean(error));notice.textContent=message||(draftChanged()?'有未保存修改。所有业务页面仍读取当前生效版本；保存并设为当前生效后全局同步。':'当前草稿与生效参数一致。'); }
function renderHistory(){ const host=document.getElementById('global-settings-history-list');if(!host)return;host.innerHTML=parameterHistory.map((item)=>`<details><summary><strong>${escapeHtml(item.version||'未命名版本')}</strong><span>全平台通用</span><span>${escapeHtml(formatLocalTime(item.updatedAt))}</span><span>${escapeHtml(item.updatedBy||'系统')}</span>${item.active?'<span class="active-tag">当前生效</span>':'<span>未生效</span>'}</summary>${item.changeReason?`<p><strong>变更原因：</strong>${escapeHtml(item.changeReason)}</p>`:''}${Array.isArray(item.changes)&&item.changes.length?`<ul>${item.changes.slice(0,80).map((change)=>`<li>${escapeHtml(FIELD_LABELS[change.path]||change.path)}：${escapeHtml(JSON.stringify(change.before))} → ${escapeHtml(JSON.stringify(change.after))}</li>`).join('')}</ul>`:'<p>初始建议值或无前版差异。</p>'}</details>`).join(''); }
function saveDraft(activate){ const errors=validate(draftParameters);if(errors.length){renderNotice(`请修正参数：${errors.join('；')}`,true);return;} const reason=String(document.getElementById('global-settings-change-reason')?.value||'').trim(); if(draftChanged()&&draftParameters.audit?.changeReasonRequired!==false&&!reason){renderNotice('请填写本次参数变更原因后再保存。',true);document.getElementById('global-settings-change-reason')?.focus();return;} const candidate=clone(draftParameters);candidate.version=nextVersion();candidate.updatedAt=new Date().toISOString();candidate.updatedBy='当前用户';candidate.changeReason=reason;const changes=collectChanges(activeParameters,candidate);if(activate){parameterHistory=parameterHistory.map((item)=>({...item,active:false}));activeParameters=clone(candidate);draftParameters=clone(activeParameters);}parameterHistory=[{...clone(candidate),active:activate,changes},...parameterHistory];saveState();renderMeta();renderHistory();syncInputs();const reasonInput=document.getElementById('global-settings-change-reason');if(reasonInput)reasonInput.value='';renderNotice(activate?`新的系统参数版本 ${candidate.version} 已生效。所有二级业务页面将在下一次渲染时读取新参数。`:`已保存参数版本 ${candidate.version}，但未设为当前生效。`);if(activate){window.dispatchEvent(new CustomEvent('aione:global-pricing-updated',{detail:{parameters:clone(activeParameters)}}));window.dispatchEvent(new CustomEvent('aione:global-settings-updated',{detail:{parameters:clone(activeParameters)}}));}}
function openSettings(){ const overlay=document.getElementById('miwa-global-settings');if(!overlay)return;overlay.hidden=false;document.body.classList.add('miwa-settings-open');renderMeta();syncInputs();renderHistory();renderNotice();requestAnimationFrame(()=>overlay.querySelector('[data-settings-close]')?.focus()); }
function closeSettings(){ const overlay=document.getElementById('miwa-global-settings');if(!overlay)return;overlay.hidden=true;document.body.classList.remove('miwa-settings-open');if(window.location.hash.startsWith('#/settings')){history.replaceState(null,'',returnHash||'#/selection');window.dispatchEvent(new HashChangeEvent('hashchange'));}}
function routeSettings(){ const isSettings=window.location.hash.startsWith('#/settings');if(isSettings)openSettings();else{const overlay=document.getElementById('miwa-global-settings');if(overlay&&!overlay.hidden){overlay.hidden=true;document.body.classList.remove('miwa-settings-open');}if(window.location.hash)returnHash=window.location.hash;}}

export function initSystemSettings(){ const overlay=document.getElementById('miwa-global-settings');if(!overlay||overlay.dataset.initialized==='true')return;overlay.dataset.initialized='true';loadState();renderMeta();syncInputs();renderHistory();renderNotice();document.querySelectorAll('[data-global-param]').forEach((input)=>{const event=input.tagName==='SELECT'?'change':'input';input.addEventListener(event,()=>{setByPath(draftParameters,input.dataset.globalParam,readInput(input));renderNotice();});});document.querySelectorAll('[data-global-settings-tab]').forEach((button)=>button.addEventListener('click',()=>{document.querySelectorAll('[data-global-settings-tab]').forEach((item)=>item.classList.toggle('is-active',item===button));document.querySelectorAll('[data-global-settings-section]').forEach((section)=>{section.hidden=section.dataset.globalSettingsSection!==button.dataset.globalSettingsTab;});}));overlay.querySelectorAll('[data-settings-close]').forEach((button)=>button.addEventListener('click',closeSettings));overlay.addEventListener('click',(event)=>{if(event.target===overlay)closeSettings();});document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&!overlay.hidden)closeSettings();});document.getElementById('global-settings-reset')?.addEventListener('click',()=>{draftParameters=clone(INITIAL_PARAMETERS);syncInputs();renderNotice('已恢复系统建议值到草稿，尚未保存。');});document.getElementById('global-settings-save')?.addEventListener('click',()=>saveDraft(false));document.getElementById('global-settings-activate')?.addEventListener('click',()=>saveDraft(true));document.getElementById('global-settings-history-toggle')?.addEventListener('click',()=>{const history=document.getElementById('global-settings-history');if(history)history.hidden=!history.hidden;});window.addEventListener('hashchange',routeSettings);routeSettings();}
