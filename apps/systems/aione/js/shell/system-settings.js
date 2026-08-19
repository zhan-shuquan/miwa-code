/* ========================================
   MIWA Global System Settings｜美和全局系统参数
   Header设置入口统一维护AIONE公共参数。业务工作台仅消费当前生效版本。
======================================== */

const STORAGE_KEY = 'miwa-aione:restored-preview:v0.4:pricing-profiles';

const INITIAL_PARAMETERS = {
  version: 'PRICING-20260817-03',
  updatedBy: '系统建议值',
  updatedAt: '2026-08-15T20:08:00+09:00',
  common: {
    cnyToJpyRate: 25,
    internationalFreightRate: 20,
    packageCostPerSaleSetJPY: 50,
    importMiscRate: 10,
    returnLossRate: 3,
    settlementFeeRate: 0,
    consumptionTaxRate: 10,
    costSafetyBufferRate: 1,
    directShippingFirstWeightGram: 500,
    directShippingFirstWeightFeeCNY: 36,
    directShippingAdditionalWeightUnitGram: 500,
    directShippingAdditionalWeightFeeCNY: 7
  },
  shop: {
    platformFeeRate: 10,
    advertisingRate: 15,
    couponRate: 0,
    pointRate: 1,
    otherOperatingCostJPY: 0,
    pricingScenario: 'normal'
  },
  delivery: {
    THIN_3CM: { name: '3cm薄型', fee: 200, enabled: true, sortOrder: 1 },
    SIZE_60: { name: '60サイズ', fee: 500, enabled: true, sortOrder: 2 },
    SIZE_80: { name: '80サイズ', fee: 600, enabled: true, sortOrder: 3 },
    SIZE_100: { name: '100サイズ', fee: 700, enabled: true, sortOrder: 4 },
    SIZE_120: { name: '120サイズ', fee: 800, enabled: true, sortOrder: 5 }
  },
  pricing: {
    minimumGrossMarginRate: 50,
    targetContributionProfitJPY: 500,
    targetContributionMarginRate: 30,
    directSelectionMinimumProfitJPY: 500,
    officialRetailMarkupRate: 50,
    officialRetailHighMarkupRate: 100,
    minimumCampaignContributionMarginRate: 15,
    normalDisposalLossRate: 30,
    maximumDisposalLossRate: 50,
    selectionPassScore: 70,
    priceRoundingUnit: 0,
    priceEndingRule: 80
  }
};

const FIELD_LABELS = {
  'common.cnyToJpyRate': 'CNY兑JPY汇率',
  'common.internationalFreightRate': '国际运费单价',
  'common.importMiscRate': '进口杂费率',
  'common.costSafetyBufferRate': '成本安全缓冲率',
  'common.packageCostPerSaleSetJPY': '套装包装成本',
  'common.consumptionTaxRate': '消费税率',
  'shop.platformFeeRate': '平台费率',
  'common.settlementFeeRate': '结算手续费率',
  'common.returnLossRate': '预计退货损失率',
  'shop.advertisingRate': '广告费率',
  'shop.couponRate': '优惠券率',
  'shop.pointRate': '积分成本率',
  'shop.otherOperatingCostJPY': '其他运营成本',
  'pricing.targetContributionProfitJPY': '最低单件贡献利润',
  'pricing.targetContributionMarginRate': '最低运营前贡献利润率',
  'pricing.minimumGrossMarginRate': '最低毛利率',
  'pricing.directSelectionMinimumProfitJPY': '直发选品最低单件利润',
  'common.directShippingFirstWeightGram': '直发首重重量',
  'common.directShippingFirstWeightFeeCNY': '直发首重费用',
  'common.directShippingAdditionalWeightUnitGram': '直发续重单位',
  'common.directShippingAdditionalWeightFeeCNY': '直发续重费用',
  'pricing.minimumCampaignContributionMarginRate': '活动最低贡献利润率',
  'pricing.officialRetailMarkupRate': '官方建议零售价上浮率',
  'pricing.officialRetailHighMarkupRate': '官方建议零售价高上浮档',
  'pricing.normalDisposalLossRate': '正常处理允许亏损率',
  'pricing.maximumDisposalLossRate': '最大处理亏损率',
  'pricing.priceEndingRule': '售价尾数规则'
};

const clone = (value) => JSON.parse(JSON.stringify(value));
let activeParameters = clone(INITIAL_PARAMETERS);
let draftParameters = clone(INITIAL_PARAMETERS);
let parameterHistory = [{ ...clone(INITIAL_PARAMETERS), active: true, changes: [] }];
let returnHash = '#/selection';

function getByPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function setByPath(object, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  let target = object;
  keys.forEach((key) => {
    if (!target[key] || typeof target[key] !== 'object') target[key] = {};
    target = target[key];
  });
  target[last] = value;
}

function formatLocalTime(value) {
  if (!value) return '待形成';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date).replaceAll('/', '-');
}

function mergeDefaults(value, defaults) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return clone(defaults);
  const result = clone(defaults);
  Object.entries(value).forEach(([key, current]) => {
    if (current && typeof current === 'object' && !Array.isArray(current) && result[key] && typeof result[key] === 'object') {
      result[key] = mergeDefaults(current, result[key]);
    } else {
      result[key] = current;
    }
  });
  return result;
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (state?.active) activeParameters = mergeDefaults(state.active, INITIAL_PARAMETERS);
    if (Array.isArray(state?.history) && state.history.length) {
      parameterHistory = state.history.map((item) => mergeDefaults(item, INITIAL_PARAMETERS));
    }
    // V1.16.6移行：旧20%検証値だけを新しい30%検証値へ一度移行する。利用者が既に別値へ変更済みの場合は保持する。
    if (String(activeParameters.version || '') !== INITIAL_PARAMETERS.version && Number(activeParameters.pricing?.targetContributionProfitJPY) === 500 && Number(activeParameters.pricing?.targetContributionMarginRate) === 20) {
      activeParameters.pricing.targetContributionMarginRate = 30;
      activeParameters.version = INITIAL_PARAMETERS.version;
      activeParameters.updatedAt = new Date().toISOString();
      activeParameters.updatedBy = 'V1.16.6参数迁移';
    }
  } catch (_) {
    // ブラウザ保存が利用できない場合も初期値で検証を継続する。
  }
  draftParameters = clone(activeParameters);
}

function saveState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ active: activeParameters, history: parameterHistory }));
  } catch (_) {
    // プレビュー環境で保存不可の場合は画面内状態のみ維持する。
  }
}

function draftChanged() {
  const a = clone(draftParameters);
  const b = clone(activeParameters);
  ['version', 'updatedAt', 'updatedBy'].forEach((key) => { delete a[key]; delete b[key]; });
  return JSON.stringify(a) !== JSON.stringify(b);
}

function nextVersion() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const prefix = `PRICING-${date}-`;
  const max = parameterHistory
    .filter((item) => String(item.version || '').startsWith(prefix))
    .reduce((current, item) => Math.max(current, Number(String(item.version).slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(2, '0')}`;
}

function collectChanges(before, after, prefix = '') {
  const changes = [];
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  keys.forEach((key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (['version', 'updatedAt', 'updatedBy', 'active', 'changes'].includes(key)) return;
    const left = before?.[key];
    const right = after?.[key];
    if (left && right && typeof left === 'object' && typeof right === 'object' && !Array.isArray(left) && !Array.isArray(right)) {
      changes.push(...collectChanges(left, right, path));
    } else if (JSON.stringify(left) !== JSON.stringify(right)) {
      changes.push({ path, before: left, after: right });
    }
  });
  return changes;
}

function validate(draft) {
  const errors = [];
  const nonnegative = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;
  const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
  const percent = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;

  if (!positive(draft.common.cnyToJpyRate)) errors.push('CNY兑JPY汇率必须大于0');
  if (!nonnegative(draft.common.internationalFreightRate)) errors.push('国际运费单价不得小于0');
  if (!nonnegative(draft.common.packageCostPerSaleSetJPY)) errors.push('套装包装成本不得小于0');
  ['importMiscRate', 'returnLossRate', 'settlementFeeRate', 'consumptionTaxRate', 'costSafetyBufferRate'].forEach((key) => {
    if (!percent(draft.common[key])) errors.push(`${FIELD_LABELS[`common.${key}`] || key}必须在0至100之间`);
  });
  ['platformFeeRate', 'advertisingRate', 'couponRate', 'pointRate'].forEach((key) => {
    if (!percent(draft.shop[key])) errors.push(`${FIELD_LABELS[`shop.${key}`] || key}必须在0至100之间`);
  });
  if (!nonnegative(draft.shop.otherOperatingCostJPY)) errors.push('其他运营成本不得小于0');
  if (!positive(draft.common.directShippingFirstWeightGram)) errors.push('直发首重重量必须大于0');
  if (!nonnegative(draft.common.directShippingFirstWeightFeeCNY)) errors.push('直发首重费用不得小于0');
  if (!positive(draft.common.directShippingAdditionalWeightUnitGram)) errors.push('直发续重单位必须大于0');
  if (!nonnegative(draft.common.directShippingAdditionalWeightFeeCNY)) errors.push('直发续重费用不得小于0');
  Object.values(draft.delivery || {}).forEach((item) => {
    if (!nonnegative(item.fee)) errors.push(`${item.name}配送费不得小于0`);
  });
  if (!percent(draft.pricing.minimumGrossMarginRate)) errors.push('最低毛利率必须在0至100之间');
  if (!nonnegative(draft.pricing.targetContributionProfitJPY)) errors.push('最低单件贡献利润不得小于0');
  if (!percent(draft.pricing.targetContributionMarginRate)) errors.push('最低运营前贡献利润率必须在0至100之间');
  if (!nonnegative(draft.pricing.directSelectionMinimumProfitJPY)) errors.push('直发选品最低单件利润不得小于0');
  if (!percent(draft.pricing.minimumCampaignContributionMarginRate)) errors.push('活动最低贡献利润率必须在0至100之间');
  if (Number(draft.pricing.minimumCampaignContributionMarginRate) > Number(draft.pricing.targetContributionMarginRate)) errors.push('活动最低贡献利润率不得高于目标单件贡献利润率');
  if (!percent(draft.pricing.normalDisposalLossRate)) errors.push('正常处理允许亏损率必须在0至100之间');
  if (!percent(draft.pricing.maximumDisposalLossRate)) errors.push('最大处理亏损率必须在0至100之间');
  if (Number(draft.pricing.normalDisposalLossRate) > Number(draft.pricing.maximumDisposalLossRate)) errors.push('正常处理允许亏损率不得高于最大处理亏损率');
  return errors;
}

function renderDelivery() {
  const host = document.getElementById('global-settings-delivery-list');
  if (!host) return;
  host.innerHTML = Object.entries(draftParameters.delivery || {})
    .sort((a, b) => (a[1].sortOrder || 0) - (b[1].sortOrder || 0))
    .map(([code, item]) => `<div class="miwa-settings-delivery-row">
      <div><strong>${item.name}</strong><small>${code}</small></div>
      <label><input type="checkbox" data-global-delivery-enabled="${code}" ${item.enabled !== false ? 'checked' : ''}> 启用</label>
      <div class="miwa-settings-inline-number"><input type="number" min="0" step="1" data-global-delivery-fee="${code}" value="${item.fee}"><b>JPY</b></div>
    </div>`).join('');

  host.querySelectorAll('[data-global-delivery-enabled]').forEach((input) => {
    input.addEventListener('change', () => {
      draftParameters.delivery[input.dataset.globalDeliveryEnabled].enabled = input.checked;
      renderNotice();
    });
  });
  host.querySelectorAll('[data-global-delivery-fee]').forEach((input) => {
    input.addEventListener('input', () => {
      draftParameters.delivery[input.dataset.globalDeliveryFee].fee = Number(input.value);
      renderNotice();
    });
  });
}

function syncInputs() {
  document.querySelectorAll('[data-global-param]').forEach((input) => {
    input.value = getByPath(draftParameters, input.dataset.globalParam);
  });
  renderDelivery();
}

function renderMeta() {
  const set = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  set('global-settings-current-version', activeParameters.version || '待形成');
  set('global-settings-updated-by', activeParameters.updatedBy || '系统');
  set('global-settings-updated-at', formatLocalTime(activeParameters.updatedAt));
}

function renderNotice(message = null, error = false) {
  const notice = document.getElementById('global-settings-notice');
  if (!notice) return;
  notice.classList.toggle('is-error', Boolean(error));
  notice.textContent = message || (draftChanged()
    ? '有未保存修改。各业务工作台仍使用当前生效版本；只有“保存并设为当前生效”后才会切换。'
    : '当前草稿与生效参数一致。');
}

function renderHistory() {
  const host = document.getElementById('global-settings-history-list');
  if (!host) return;
  host.innerHTML = parameterHistory.map((item) => `<details>
    <summary><strong>${item.version || '未命名版本'}</strong><span>全平台通用</span><span>${formatLocalTime(item.updatedAt)}</span><span>${item.updatedBy || '系统'}</span>${item.active ? '<span class="active-tag">当前生效</span>' : '<span>未生效</span>'}</summary>
    ${Array.isArray(item.changes) && item.changes.length
      ? `<ul>${item.changes.map((change) => `<li>${FIELD_LABELS[change.path] || change.path}：${JSON.stringify(change.before)} → ${JSON.stringify(change.after)}</li>`).join('')}</ul>`
      : '<p>初始建议值或无前版差异。</p>'}
  </details>`).join('');
}

function saveDraft(activate) {
  const errors = validate(draftParameters);
  if (errors.length) {
    renderNotice(`请修正参数：${errors.join('；')}`, true);
    return;
  }

  const version = nextVersion();
  const candidate = clone(draftParameters);
  candidate.version = version;
  candidate.updatedAt = new Date().toISOString();
  candidate.updatedBy = '当前用户';
  const changes = collectChanges(activeParameters, candidate);

  if (activate) {
    parameterHistory = parameterHistory.map((item) => ({ ...item, active: false }));
    activeParameters = clone(candidate);
    draftParameters = clone(activeParameters);
  }

  parameterHistory = [{ ...clone(candidate), active: activate, changes }, ...parameterHistory];
  saveState();
  renderMeta();
  renderHistory();
  syncInputs();
  renderNotice(activate
    ? `新的全局参数版本 ${version} 已生效。成本试算与智能定价将在业务页面重新读取该版本。`
    : `已保存新参数版本 ${version}，但未设为当前生效；业务页面仍使用 ${activeParameters.version}。`);

  if (activate) {
    window.dispatchEvent(new CustomEvent('aione:global-pricing-updated', { detail: { parameters: clone(activeParameters) } }));
  }
}

function openSettings() {
  const overlay = document.getElementById('miwa-global-settings');
  if (!overlay) return;
  overlay.hidden = false;
  document.body.classList.add('miwa-settings-open');
  renderMeta();
  syncInputs();
  renderHistory();
  renderNotice();
  requestAnimationFrame(() => overlay.querySelector('[data-settings-close]')?.focus());
}

function closeSettings() {
  const overlay = document.getElementById('miwa-global-settings');
  if (!overlay) return;
  overlay.hidden = true;
  document.body.classList.remove('miwa-settings-open');
  if (window.location.hash.startsWith('#/settings')) {
    history.replaceState(null, '', returnHash || '#/selection');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

function routeSettings() {
  const isSettings = window.location.hash.startsWith('#/settings');
  if (isSettings) {
    openSettings();
  } else {
    const overlay = document.getElementById('miwa-global-settings');
    if (overlay && !overlay.hidden) {
      overlay.hidden = true;
      document.body.classList.remove('miwa-settings-open');
    }
    if (window.location.hash) returnHash = window.location.hash;
  }
}

export function initSystemSettings() {
  const overlay = document.getElementById('miwa-global-settings');
  if (!overlay || overlay.dataset.initialized === 'true') return;
  overlay.dataset.initialized = 'true';

  loadState();
  renderMeta();
  syncInputs();
  renderHistory();
  renderNotice();

  document.querySelectorAll('[data-global-param]').forEach((input) => {
    input.addEventListener('input', () => {
      setByPath(draftParameters, input.dataset.globalParam, Number(input.value));
      renderNotice();
    });
  });

  document.querySelectorAll('[data-global-settings-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-global-settings-tab]').forEach((item) => item.classList.toggle('is-active', item === button));
      document.querySelectorAll('[data-global-settings-section]').forEach((section) => {
        section.hidden = section.dataset.globalSettingsSection !== button.dataset.globalSettingsTab;
      });
    });
  });

  overlay.querySelectorAll('[data-settings-close]').forEach((button) => button.addEventListener('click', closeSettings));
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeSettings();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.hidden) closeSettings();
  });

  document.getElementById('global-settings-reset')?.addEventListener('click', () => {
    draftParameters = clone(INITIAL_PARAMETERS);
    syncInputs();
    renderNotice('已恢复首版建议值到草稿，尚未保存。');
  });
  document.getElementById('global-settings-save')?.addEventListener('click', () => saveDraft(false));
  document.getElementById('global-settings-activate')?.addEventListener('click', () => saveDraft(true));
  document.getElementById('global-settings-history-toggle')?.addEventListener('click', () => {
    const history = document.getElementById('global-settings-history');
    if (!history) return;
    history.hidden = !history.hidden;
  });

  window.addEventListener('hashchange', routeSettings);
  routeSettings();
}
