/* ========================================
   Preview Opportunity Store｜商品機会プレビューデータ層
   正式DBではなく、現在のブラウザ内で商品機会の業務フロー検証状態を保持する。
======================================== */

import { selectionOpportunities } from './selection-opportunities.js';
import { getSelectionRecordInputSchema } from '../config/field-registry.js';

const DRAFT_PREFIX = 'aione:selection:draft:';
const WORKFLOW_PREFIX = 'aione:selection:workflow:';
const IMPORTED_KEY = 'aione:selection:preview:imported-opportunities';

function safeParse(raw){
  if(!raw) return null;
  try{return JSON.parse(raw);}catch(_){return null;}
}

function readLocal(key){
  try{return safeParse(window.localStorage.getItem(key));}catch(_){return null;}
}

function sourceLabelFromUrl(url, fallback=''){
  const value=String(url||'').toLowerCase();
  if(value.includes('1688.com')) return '1688';
  if(value.includes('taobao.com')) return '淘宝';
  if(value.includes('tmall.com')) return '天猫';
  if(value.includes('alibaba.com')) return 'Alibaba';
  return fallback;
}

function derivePreviewItem(base){
  const item={...base,platforms:[...(base.platforms||[])]};
  // V1.17.0: AI选品已退出业务类型。旧预演数据仅为本地测试数据，统一按常规选品展示，避免出现废止类型。
  if(item.type === 'AI选品') item.type = '常规选品';
  // V1.18.0: 旧プレビューデータの測样／推进判断ステージを新しい5段階主フローへ移行する。
  if(item.stage === 'sample'){
    item.stage = 'decision';
    item.stageName = '上架判断';
    item.info = item.info || '按需测样进行中，可辅助上架判断';
  }else if(item.stage === 'decision' && item.stageName === '推进判断'){
    item.stageName = '上架判断';
  }
  const draft=readLocal(`${DRAFT_PREFIX}${base.id}`);
  const workflow=readLocal(`${WORKFLOW_PREFIX}${base.id}`);

  if(base.isVoided){
    item.stage='decision';
    item.stageName='上架判断';
    item.result='已作废';
    item.info='商品机会已作废';
    item.rule='保留历史记录，不再继续推进';
    return item;
  }

  if(draft?.representativeImage?.type==='url' && draft.representativeImage.url){
    item.representativeImage={type:'url',url:String(draft.representativeImage.url).trim()};
  }

  if(draft?.fields){
    const name=String(draft.fields['selection-record-name']||'').trim();
    const sourceUrl=String(draft.fields['selection-record-source']||'').trim();
    if(name) item.name=name;
    if(sourceUrl){
      item.sourceUrl=sourceUrl;
      item.source=sourceLabelFromUrl(sourceUrl,item.source);
    }
    item.stage='data';
    item.stageName='数据录入';
    item.info='预演草稿已保存';
  }

  if(workflow?.lastPricingResult){
    item.stage='decision';
    item.stageName='上架判断';
    item.info='成本与定价已形成，待上架判断';
  }

  if(workflow?.sampleState?.status==='draft'){
    item.stage='decision';
    item.stageName='上架判断';
    item.info='按需测样进行中，可辅助上架判断';
  }

  if(workflow?.sampleState?.status==='completed'){
    item.stage='decision';
    item.stageName='上架判断';
    item.info='测样证据已回写，可用于上架判断';
  }

  if(workflow?.finalDecisionState){
    item.stage='decision';
    item.stageName='上架判断';
    item.result=workflow.finalDecisionSnapshot?.result || (workflow.finalDecisionState==='LIST'?'上架':'不上架');
    item.info='预演最终判断已保存';
    item.rule=item.result==='上架'?'预演流程已完成：上架':'预演流程已完成：不上架';
  }

  return item;
}

function getImportedBaseOpportunities(){
  const value=readLocal(IMPORTED_KEY);
  return Array.isArray(value) ? value : [];
}

function getAllBaseOpportunities(){
  const persisted=getImportedBaseOpportunities();
  return persisted.length ? persisted : selectionOpportunities;
}

// 商品機会の保存先を一本化し、手動作成と一括取込を同じ一覧へ反映する。
export function upsertPreviewOpportunity(base){
  if(!base?.id) return null;
  const persisted=getImportedBaseOpportunities();
  const items=(persisted.length ? persisted : selectionOpportunities).map(item=>({...item,platforms:[...(item.platforms||[])]}));
  const index=items.findIndex(item=>item.id===base.id);
  const previous=index>=0 ? items[index] : {};
  const next={
    ...previous,
    ...base,
    platforms:[...(base.platforms || previous.platforms || ['楽天'])]
  };
  if(index>=0) items[index]=next;
  else items.unshift(next);
  writeImportedBaseOpportunities(items);
  return derivePreviewItem(next);
}

export function removePreviewOpportunity(id){
  const recordId=String(id||'').trim();
  if(!recordId) return false;
  const persisted=getImportedBaseOpportunities();
  const items=(persisted.length ? persisted : selectionOpportunities).filter(item=>item.id!==recordId);
  writeImportedBaseOpportunities(items);
  try{
    window.localStorage.removeItem(`${DRAFT_PREFIX}${recordId}`);
    window.localStorage.removeItem(`${WORKFLOW_PREFIX}${recordId}`);
  }catch(_){ }
  return true;
}

export function voidPreviewOpportunity(id){
  const recordId=String(id||'').trim();
  if(!recordId) return null;
  const base=getAllBaseOpportunities().find(item=>item.id===recordId);
  if(!base) return null;
  return upsertPreviewOpportunity({
    ...base,
    isVoided:true,
    stage:'decision',
    stageName:'上架判断',
    result:'已作废',
    info:'商品机会已作废',
    rule:'保留历史记录，不再继续推进'
  });
}

function writeImportedBaseOpportunities(items){
  window.localStorage.setItem(IMPORTED_KEY,JSON.stringify(items));
}

function nextPreviewIds(count){
  const now=new Date();
  const prefix=`XP${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const all=getAllBaseOpportunities();
  let max=0;
  all.forEach(item=>{
    const match=String(item.id||'').match(new RegExp(`^${prefix}(\\d{6})$`));
    if(match) max=Math.max(max,Number(match[1]));
  });
  return Array.from({length:count},(_,index)=>`${prefix}${String(max+index+1).padStart(6,'0')}`);
}

function draftFieldsFromImport(row){
  const fields = {};
  getSelectionRecordInputSchema().forEach((field) => {
    if (!field.storageKey || field.key === "representativeImage") return;
    const aliases = [...(field.importAliases || []), field.label, field.key].filter(Boolean);
    let value = "";
    for (const alias of aliases) {
      if (Object.prototype.hasOwnProperty.call(row || {}, alias)) { value = row[alias]; break; }
    }
    fields[field.storageKey] = String(value ?? "").trim();
  });
  return fields;
}

export function importPreviewOpportunities(rows,selectionType){
  const validRows=(Array.isArray(rows)?rows:[]).filter(row=>Object.values(row||{}).some(value=>String(value??'').trim()));
  if(!validRows.length) return [];
  const previous=getImportedBaseOpportunities();
  previous.forEach(item=>{
    try{
      window.localStorage.removeItem(`${DRAFT_PREFIX}${item.id}`);
      window.localStorage.removeItem(`${WORKFLOW_PREFIX}${item.id}`);
    }catch(_){ }
  });
  const imported=[];
  const ids=nextPreviewIds(validRows.length);
  const createdAt=new Date();
  const created=[];

  validRows.forEach((row,index)=>{
    const id=ids[index];
    const sourceUrl=String(row['采购来源链接'] || row['采购来源网址'] || '').trim();
    const name=String(row['商品名称'] || '').trim() || `待完善商品机会 ${index+1}`;
    const item={
      name,id,type:selectionType,stage:'data',stageName:'数据录入',owner:'张美和',platforms:['楽天'],
      time:createdAt.toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).replace(/-/g,'/').replace(',', ''),
      cost:0,info:'批量导入｜预演数据已保存',rule:'等待完成资料录入',ai:'待后续流程验证',elements:'9/9',result:'待形成',
      source:sourceLabelFromUrl(sourceUrl,'采购来源'),sourceUrl,
      representativeImage:String(row['选品代表图链接']||'').trim()?{type:'url',url:String(row['选品代表图链接']).trim()}:{type:'none',url:''}
    };
    imported.push(item);
    const draft={
      version:'1.2',opportunityId:id,selectionType,owner:'张美和',createdAt:item.time,mode:'create',savedAt:new Date().toISOString(),
      fields:draftFieldsFromImport(row),
      representativeImage:String(row['选品代表图链接']||'').trim()?{type:'url',url:String(row['选品代表图链接']).trim()}:{type:'none',url:''},
      importMeta:{source:'batch_excel',note:String(row['备注']||'').trim()}
    };
    window.localStorage.setItem(`${DRAFT_PREFIX}${id}`,JSON.stringify(draft));
    created.push(item);
  });
  writeImportedBaseOpportunities(imported);
  return created.map(derivePreviewItem);
}

export function getPreviewOpportunities(){
  return getAllBaseOpportunities().map(derivePreviewItem);
}

export function getPreviewOpportunity(id){
  const base=getAllBaseOpportunities().find(item=>item.id===id);
  return base ? derivePreviewItem(base) : null;
}

export function exportPreviewDataset(){
  const records=getAllBaseOpportunities().map(item=>({
    id:item.id,
    draft:readLocal(`${DRAFT_PREFIX}${item.id}`),
    workflow:readLocal(`${WORKFLOW_PREFIX}${item.id}`)
  }));
  return {
    schemaVersion:'1.0',
    exportedAt:new Date().toISOString(),
    purpose:'AIONE商品机会全流程预演验证',
    records
  };
}
