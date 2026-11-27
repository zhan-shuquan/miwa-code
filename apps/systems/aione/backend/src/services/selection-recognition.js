import { createHash } from 'node:crypto';
import { recognizeSelectionFacts } from '../ai/openai-provider.js';
const cache = new Map();
async function recognize(kind, facts, generate = recognizeSelectionFacts) {
  const key=createHash('sha256').update(JSON.stringify([kind,facts])).digest('hex');
  const prior=cache.get(key);
  if(prior && prior.expires>Date.now()) return prior.value;
  const pending=generate(kind,facts).catch(()=>null);
  cache.set(key,{expires:Date.now()+60000,value:pending});
  const value=await pending;
  cache.set(key,{expires:Date.now()+(value?3600000:60000),value});
  if(cache.size>500)cache.delete(cache.keys().next().value);
  return value;
}
export async function completeShortName(result,title,{generate}={}) {
  if(result.shortName?.name && !result.shortName.review) return result;
  const answer=await recognize('short-name',{title:String(title).slice(0,2000)},generate);
  const name=String(answer?.name||'').trim();
  // Only a compact Chinese noun supplied by the configured text provider is accepted.
  if(answer?.certain===true && /^[\p{Script=Han}A-Za-z0-9·（）() -]{2,20}$/u.test(name) && /\p{Script=Han}/u.test(name))
    return {...result,shortName:{name,review:false,source:'existing-text-provider'}};
  return result;
}
export async function completeSkuAttributes(parsed,snapshot,{generate}={}) {
  const options=(snapshot.itemAttributes||[]).filter(a=>!a.disabled);
  if(!options.length || !parsed.skus.some(s=>!Object.keys(s.attributeValues).length))return parsed;
  const rows=parsed.skus.filter(s=>!Object.keys(s.attributeValues).length);
  // One bounded classification per import; never call a model for each keystroke or row.
  if(rows.length>100)return parsed;
  const answer=await recognize('sku-attributes',{
    attributes:options.map(a=>({name:a.name,aliases:a.aliases||[],values:(a.item_attribute_values||a.attributes||[]).map(v=>v.attribute_value).filter(Boolean).slice(0,60)})),
    rows:rows.map(s=>({id:s.code,name:s.originalName})),
  },generate);
  if(!Array.isArray(answer?.rows))return parsed;
  const seen=new Set();
  for(const suggestion of answer.rows){
    if(seen.has(suggestion.id))continue;seen.add(suggestion.id);
    const row=rows.find(s=>s.code===suggestion.id);
    if(!row || suggestion.certain!==true || !suggestion.values || typeof suggestion.values!=='object')continue;
    const entries=Object.entries(suggestion.values);
    // Values must be literal spans from the source. Translation/invention is rejected.
    if(!entries.length || entries.some(([k,v])=>!options.some(a=>a.name===k)||typeof v!=='string'||!v.trim()||!row.originalName.includes(v)||v.length>200))continue;
    row.attributeValues={...row.attributeValues,...Object.fromEntries(entries.map(([k,v])=>[k,v.trim()]))};
  }
  const names=[...new Set(parsed.skus.flatMap(s=>Object.keys(s.attributeValues)))];
  for(const name of names){
    if(parsed.specificationAttributes.some(a=>a.attribute===name))continue;
    const values=parsed.skus.map(s=>s.attributeValues[name]||'');
    const fixed=values.every(Boolean)&&new Set(values).size===1&&names.length>1;
    parsed.specificationAttributes.push({attribute:name,sales:!fixed});
    if(fixed)parsed.fixedSpecifications[name]=values[0];
  }
  if(parsed.specificationAttributes.length)parsed.warnings=parsed.warnings.filter(w=>!w.startsWith('未能唯一匹配'));
  return parsed;
}
