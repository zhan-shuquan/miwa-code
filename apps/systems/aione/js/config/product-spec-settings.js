import {customCategories,sortedCustomRows} from './custom-settings.js';
export const SPEC_NAMES_BINDING='$dimensions';
export const LEGACY_SPEC_NAMES=['颜色','款式','尺码','套数','型号','其他'];
const nameRows=p=>customCategories(p).find(c=>c.specBinding===SPEC_NAMES_BINDING);
const refs=r=>r.referenceNames||[r.businessValue];
export function specDimension(p,name){return nameRows(p)?.rows.find(r=>refs(r).includes(name));}
export function specValueCatalog(p,name){const dimension=specDimension(p,name);return customCategories(p).find(c=>c.specBinding&&c.specBinding!==SPEC_NAMES_BINDING&&c.specBinding===(dimension?.businessValue||name));}
export function specNameOptions(p,current='',usage={}){
 const c=nameRows(p);if(!c)return LEGACY_SPEC_NAMES.map(value=>({value,label:value}));
 const rows=sortedCustomRows(c,usage[c.id]).filter(r=>c.enabled&&r.enabled||refs(r).includes(current));
 const result=rows.map(r=>({value:refs(r).includes(current)?current:r.businessValue,label:r.name+(r.values.name_ja?' / '+r.values.name_ja:'')+(!c.enabled||!r.enabled?'（已停用）':'')}));
 if(current&&!result.some(x=>x.value===current))result.unshift({value:current,label:current+'（历史值）'});
 return result;
}
export function specValueOptions(p,name,selected=[],usage={}){
 const c=specValueCatalog(p,name);if(!c)return null;
 return sortedCustomRows(c,usage[c.id]).filter(r=>c.enabled&&r.enabled||selected.some(v=>refs(r).includes(v))).map(r=>({value:selected.find(v=>refs(r).includes(v))||r.businessValue,label:r.name+(r.values.name_ja?' / '+r.values.name_ja:'')+(!c.enabled||!r.enabled?'（已停用）':'')}));
}
export function defaultSpecValues(p,name){const c=specValueCatalog(p,name),row=c?.enabled&&c.rows.find(r=>r.enabled&&r.isDefault);return row?[row.businessValue]:[];}
export function newProductSpec(p,existing=[],usage={}){
 const available=specNameOptions(p,'',usage).filter(o=>!existing.some(s=>(specDimension(p,s.name)?.businessValue||s.name)===o.value));
 const defaultRow=nameRows(p)?.rows.find(r=>r.enabled&&r.isDefault);
 const chosen=available.find(o=>o.value===defaultRow?.businessValue)||available[0];
 return chosen?{name:chosen.value,values:defaultSpecValues(p,chosen.value)}:null;
}
export function translateSpec(p,name,value,language='ja'){
 const c=value===undefined?nameRows(p):specValueCatalog(p,name);
 const source=value===undefined?name:value,normalized=String(source||'').normalize('NFKC').toLowerCase(),matches=c?.rows.filter(r=>[...refs(r),r.values.name_ja,r.values.name_en].filter(Boolean).some(v=>String(v).normalize('NFKC').toLowerCase()===normalized))||[],r=matches.length===1?matches[0]:undefined;
 if(!c)return {value:source,mapped:false};
 if(!r)return {value:source,mapped:false,missing:true,categoryId:c.id};
 const translated=String(r.values['name_'+language]||'').trim();
 return {value:translated||source,mapped:!!translated,missing:!translated,categoryId:c.id,rowId:r.id};
}
export function validateProductSpecSettings(product,previous,p){
 const names=nameRows(p),seen=new Set();
 const reject=message=>{throw Object.assign(new Error(message),{statusCode:400,code:'inactive_product_spec_setting'});};
 for(const s of product.specs||[]){
  const old=(previous?.specs||[]).find(x=>x.name===s.name),dimension=specDimension(p,s.name),identity=dimension?.businessValue||s.name;if(seen.has(identity))reject('规格名称不能重复：'+s.name);seen.add(identity);
  if(names&&(!names.enabled||!dimension?.enabled)&&!old)reject('请选择启用的规格名称：'+s.name);
  const c=specValueCatalog(p,s.name);if(!c)continue;
  for(const value of s.values){const row=c.rows.find(r=>refs(r).includes(value));if((!c.enabled||!row?.enabled)&&!old?.values?.includes(value))reject('请在设置中心维护并启用规格值：'+s.name+' / '+value);}
 }
 return product;
}
export function addSpecCatalogPresets(parameters){
 const next=structuredClone(parameters.customSettings||{categories:[]});
 const field=(id,label)=>({id,label,type:'text',required:false});
 const languages=[field('name_ja','日文名称'),field('name_en','英文名称')];
 const names=['カラー','タイプ','サイズ','セット数','型番','その他'];
 const colors=[['黑色','ブラック','Black'],['白色','ホワイト','White'],['灰色','グレー','Gray'],['米色','ベージュ','Beige'],['粉色','ピンク','Pink'],['红色','レッド','Red'],['蓝色','ブルー','Blue'],['绿色','グリーン','Green']];
 const seeds=[{id:'spec_dimensions',name:'规格名称资料',specBinding:SPEC_NAMES_BINDING,fields:languages,rows:LEGACY_SPEC_NAMES.map((name,i)=>({name,businessValue:name,referenceNames:[name,names[i]],values:{name_ja:names[i]}}))},{id:'spec_colors',name:'颜色属性资料',specBinding:'颜色',fields:[...languages,field('swatch','色块或图标地址')],rows:colors.map(([name,ja,en])=>({name,businessValue:name,referenceNames:[name,ja,en,en.toLowerCase()],values:{name_ja:ja,name_en:en}}))}];
 for(const seed of seeds){if(next.categories.some(c=>c.specBinding===seed.specBinding))continue;if(next.categories.some(c=>c.id===seed.id||c.name===seed.name))throw new Error('已有同名资料，请先调整名称：'+seed.name);
 next.categories.push({...seed,owner:'商品之家',enabled:true,productBinding:true,dropdownSort:'usage',rows:seed.rows.map((r,i)=>({...r,id:'r_'+i,enabled:true,isDefault:false,sortOrder:i}))});}
 return next;
}
export function specReferenceNames(row){return refs(row);}
