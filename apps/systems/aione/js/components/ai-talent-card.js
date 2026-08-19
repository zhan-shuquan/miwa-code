/* ========================================
   MIWA AI Talent Card｜美和AI人材カード
   ai_talent_id からAI人材ライブラリを読み込み、カードへ反映する。
======================================== */

import { getAiTalent } from '../data/ai-talents.js';

const templateUrl = './components/ai/ai-talent-card.html';


function renderAvatar(host,talent){
  const avatarHost = host.querySelector('[data-ai-avatar]');
  if(!avatarHost) return;
  const avatar = talent.avatar || {};
  if(avatar.kind === 'image' && avatar.src){
    avatarHost.innerHTML = `<img src="${avatar.src}" alt="${avatar.label || talent.name}" loading="lazy">`;
    avatarHost.removeAttribute('aria-hidden');
    return;
  }
  avatarHost.setAttribute('aria-hidden','true');
}
function valueOrPending(value, suffix=''){
  return value === null || value === undefined || value === '' ? '待验证' : `${value}${suffix}`;
}

function performanceIcon(type){
  const icons = {
    opportunities:'<svg viewBox="0 0 24 24"><path d="M4 6h16v14H4zM8 3h8v3"></path></svg>',
    independent:'<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>',
    handoff:'<svg viewBox="0 0 24 24"><path d="M12 3v12M8 11l4 4 4-4M5 21h14"></path></svg>',
    verified:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle><path d="M12 8v5l3 2"></path></svg>'
  };
  return icons[type] || '';
}

function renderFlows(host,talent){
  const list = host.querySelector('[data-ai-flow-list]');
  list.innerHTML = talent.flows.map(flow=>{
    const execution = flow.executionCount === null ? '节点执行：待验证' : `节点执行：${flow.executionCount}次`;
    return `<button class="miwa-ai-talent-flow__row" type="button" data-ai-flow-row>
      <span class="miwa-ai-talent-flow__index">${flow.order}</span>
      <span class="miwa-ai-talent-flow__name">${flow.name}</span>
      <span class="miwa-ai-talent-flow__experience">${execution}</span>
      <span class="miwa-ai-talent-flow__status">${flow.status || '待验证'}</span>
      <span class="miwa-ai-talent-flow__detail">独立完成率：${valueOrPending(flow.independentRate,'%')}　｜　人工接管率：${valueOrPending(flow.handoffRate,'%')}　｜　人工修正率：${valueOrPending(flow.revisionRate,'%')}　｜　最近验证：${valueOrPending(flow.lastVerified)}</span>
    </button>`;
  }).join('');
}

function renderPerformance(host,talent){
  const performance = talent.performance || {};
  const items = [
    ['opportunities','实战商品机会',valueOrPending(performance.realOpportunities, performance.realOpportunities === null ? '' : '个')],
    ['independent','独立处理率',valueOrPending(performance.independentRate,'%')],
    ['handoff','人工接管率',valueOrPending(performance.handoffRate,'%')],
    ['verified','最近验证',valueOrPending(performance.lastVerified)]
  ];
  host.querySelector('[data-ai-performance]').innerHTML = items.map(([type,label,value])=>`<div class="miwa-ai-talent-performance__item">
    <div class="miwa-ai-talent-performance__label">${performanceIcon(type)}<span>${label}</span></div>
    <div class="miwa-ai-talent-performance__value">${value}</div>
  </div>`).join('');
}

function createHistoryDialog(talent){
  let dialog = document.getElementById('miwa-ai-talent-history');
  if(dialog) dialog.remove();
  dialog = document.createElement('dialog');
  dialog.className = 'miwa-ai-talent-history';
  dialog.id = 'miwa-ai-talent-history';
  dialog.innerHTML = `<div class="miwa-ai-talent-history__head"><h3>${talent.name}｜完整履历</h3><button type="button" data-ai-history-close aria-label="关闭">×</button></div>
    <div class="miwa-ai-talent-history__body">
      完整履历用于查看主卡片之外的真实证据。当前只建立数据结构，未验证的数据不填示例数字。
      <div class="miwa-ai-talent-history__grid">
        <div class="miwa-ai-talent-history__item"><b>节点执行记录</b>按商品机会、流程节点、时间和结果追溯AI实际执行。</div>
        <div class="miwa-ai-talent-history__item"><b>人工修正记录</b>记录AI结果被人工修改的次数、原因和影响。</div>
        <div class="miwa-ai-talent-history__item"><b>异常与接管记录</b>记录AI主动交还人工或运行异常的真实案例。</div>
        <div class="miwa-ai-talent-history__item"><b>能力版本记录</b>关联Skill、规则、知识、模型和最近验证时间。</div>
        <div class="miwa-ai-talent-history__item"><b>效率改善证据</b>记录人工基线、AI耗时、节省步骤和适用范围。</div>
        <div class="miwa-ai-talent-history__item"><b>服务范围</b>记录当前AI人才被授权服务的系统、业务和实例。</div>
      </div>
    </div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('[data-ai-history-close]').addEventListener('click',()=>dialog.close());
  return dialog;
}

async function ensureTemplate(dialog){
  const host = dialog.querySelector('[data-ai-talent-host]');
  if(host.dataset.loaded === 'true') return host;
  const response = await fetch(templateUrl);
  if(!response.ok) throw new Error(`AI人材カード読込失敗: ${templateUrl}`);
  host.innerHTML = await response.text();
  host.dataset.loaded = 'true';
  return host;
}

export async function openAiTalentCard(dialog, aiTalentId){
  const talent = getAiTalent(aiTalentId);
  if(!talent) throw new Error(`AI人材が見つかりません: ${aiTalentId}`);
  const host = await ensureTemplate(dialog);

  renderAvatar(host,talent);
  host.querySelector('[data-ai-name]').textContent = talent.name;
  host.querySelector('[data-ai-type]').textContent = talent.type;
  host.querySelector('[data-ai-coverage]').textContent = talent.coverageLabel;
  host.querySelector('[data-ai-description]').textContent = talent.description;
  renderFlows(host,talent);
  renderPerformance(host,talent);

  host.querySelector('[data-ai-talent-close]').onclick = ()=>dialog.close();
  host.querySelectorAll('[data-ai-flow-row]').forEach(row=>{
    row.onclick = ()=>row.classList.toggle('is-open');
  });
  host.querySelector('[data-ai-history]').onclick = ()=>createHistoryDialog(talent).showModal();

  if(!dialog.open) dialog.showModal();
}
