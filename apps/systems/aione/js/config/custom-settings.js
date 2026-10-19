import {HOME_REGISTRY} from './home-registry.js';
// Validated extension namespace in the existing versioned Cloud SQL settings payload.
// Extension selections store IDs; display labels are never product references.
export const PRODUCT_CATALOG_FIELDS={category:'商品分类',brand:'所属品牌',material:'主要材质',originCountry:'原产地',targetShopRef:'目标店铺'};
export const CUSTOM_FIELD_TYPES=['text','longtext','number','select','boolean','date'];
export const SETTINGS_OWNERS=Object.values(HOME_REGISTRY).map(home=>home.label);
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const fail=message=>{throw Object.assign(new Error(message),{code:'invalid_custom_settings',statusCode:400});};
const id=v=>typeof v==='string'&&/^[a-z][a-z0-9_-]{0,63}$/.test(v)&&!['constructor','prototype','__proto__'].includes(v);
const text=(v,max=80)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
export const customCategories=p=>p?.customSettings?.categories||[];
export function validateCustomRow(category,row){
 if(!object(row)||!id(row.id)||!text(row.name)||typeof row.enabled!=='boolean'||typeof row.isDefault!=='boolean'||!Number.isSafeInteger(row.sortOrder)||row.sortOrder<0||row.isDefault&&!row.enabled||!object(row.values))fail('资料编号、名称、排序、状态或默认项无效');
 if(row.pinned!==undefined&&typeof row.pinned!=='boolean')fail('置顶状态无效');
 const keys=new Set(category.fields.map(f=>f.id));
 if(Object.keys(row.values).some(k=>!keys.has(k)))fail('资料包含未定义字段');
 for(const f of category.fields){const v=row.values[f.id];const blank=v===undefined||v===null||v==='';
  if(blank){if(f.required)fail(f.label+'为必填项');continue;}
  if(f.type==='number'&&(typeof v!=='number'||!Number.isFinite(v)))fail(f.label+'必须是数字');
  if(f.type==='boolean'&&typeof v!=='boolean')fail(f.label+'必须是是或否');
  if(['text','select','date'].includes(f.type)&&(typeof v!=='string'||v.length>500))fail(f.label+'格式无效或超过500字');
  if(f.type==='longtext'&&(typeof v!=='string'||v.length>10000))fail(f.label+'必须为文本且不能超过10000字');
  if(f.type==='select'&&!f.options.includes(v))fail(f.label+'请选择有效选项');
  if(f.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v))fail(f.label+'日期无效');
 }
 return row;
}
export function validateCustomSettings(settings,{singleCategory=false}={}){
 if(settings===undefined)return;
 if(!object(settings)||Object.keys(settings).some(k=>k!=='categories')||!Array.isArray(settings.categories)||settings.categories.length>30)fail('自定义分类最多30个');
 const ids=new Set(),names=new Set(),bindings=new Set(),specBindings=new Set();
 for(const c of settings.categories){
  if(!object(c)||!id(c.id)||ids.has(c.id)||!text(c.name)||names.has(c.name)||!SETTINGS_OWNERS.includes(c.owner)||typeof c.enabled!=='boolean'||typeof c.productBinding!=='boolean'||!Array.isArray(c.fields)||c.fields.length>20||!Array.isArray(c.rows)||c.rows.length>500)fail('分类编号/名称重复，或分类定义无效（每类最多20字段、500条资料）');
  if(c.productField!==undefined){if(!Object.hasOwn(PRODUCT_CATALOG_FIELDS,c.productField)||bindings.has(c.productField)||!c.productBinding)fail('商品字段绑定无效或重复');bindings.add(c.productField);}
  if(c.specBinding!==undefined){if(!text(c.specBinding)||specBindings.has(c.specBinding)||c.productField||!c.productBinding)fail('规格资料用途重复或无效');specBindings.add(c.specBinding);}
  if(c.dropdownSort!==undefined&&!['usage','manual','name'].includes(c.dropdownSort))fail('下拉排序方式无效');
  ids.add(c.id);names.add(c.name);const fields=new Set(),labels=new Set();
  for(const f of c.fields){
   if(!object(f)||!id(f.id)||fields.has(f.id)||!text(f.label)||labels.has(f.label)||!CUSTOM_FIELD_TYPES.includes(f.type)||typeof f.required!=='boolean')fail('字段名称重复或类型无效');
   fields.add(f.id);labels.add(f.label);
   if(f.hidden!==undefined&&typeof f.hidden!=='boolean'||f.hidden&&f.required)fail('隐藏字段不能设为必填');
   if(f.type==='select'&&(!Array.isArray(f.options)||!f.options.length||f.options.length>50||f.options.some(x=>!text(x,100))||new Set(f.options).size!==f.options.length))fail('单选字段需要1至50个不重复选项');
  }
  const rows=new Set(),rowNames=new Set(),businessValues=new Set(),referenceNames=new Set();let defaults=0;
  for(const r of c.rows){validateCustomRow(c,r);if(c.productField||c.specBinding){if(!text(r.businessValue)||businessValues.has(r.businessValue))fail('业务引用值为空或重复');businessValues.add(r.businessValue);if(r.referenceNames!==undefined&&(!Array.isArray(r.referenceNames)||!r.referenceNames.length||r.referenceNames.length>20||!r.referenceNames.includes(r.businessValue)||r.referenceNames.some(x=>!text(x))))fail('历史引用名称无效');for(const ref of r.referenceNames||[r.businessValue]){if(referenceNames.has(ref))fail('历史引用名称重复');referenceNames.add(ref);}}if(rows.has(r.id)||rowNames.has(r.name))fail('资料编号或名称重复');rows.add(r.id);rowNames.add(r.name);if(r.isDefault&&++defaults>1)fail('每类只能有一个默认项');}
 }
 const dimensions=settings.categories.find(c=>c.specBinding==='$dimensions');
 for(const c of settings.categories)if(!singleCategory&&c.specBinding&&c.specBinding!=='$dimensions'&&!dimensions?.rows.some(r=>r.businessValue===c.specBinding))fail('规格值资料需要关联有效的规格名称');
 if(JSON.stringify(settings).length>500000)fail('自定义设置总量超过限制，请拆分资料');
}
export function sortedCustomRows(category,usage={},mode=category.dropdownSort||'usage'){
 return [...category.rows].sort((a,b)=>Number(b.pinned===true)-Number(a.pinned===true)||(mode==='usage'?(Number(usage[b.id])||0)-(Number(usage[a.id])||0):mode==='name'?a.name.localeCompare(b.name):0)||a.sortOrder-b.sortOrder||a.name.localeCompare(b.name));
}
export function customProductSelections(parameters,input,previous){
 const selections=input===undefined?{...(previous||{})}:input;
 if(!object(selections)||Object.keys(selections).length>30)fail('商品自定义选项格式无效');
 const result={};
 for(const [key,value] of Object.entries(selections)){
  if(!id(key)||typeof value!=='string'||value&&!id(value))fail('商品选项编号无效');
  if(!value)continue;
  const c=customCategories(parameters).find(x=>x.id===key),r=c?.rows.find(x=>x.id===value);
  if(!c||!r)fail('商品自定义选项已不存在，请重新选择');
  if(c.specBinding)fail('规格资料请通过规格字段选用');
  if(!c.productField&&!c.specBinding&&(!c.enabled||!c.productBinding||!r.enabled)&&previous?.[key]!==value)fail(c.name+'已停用或未绑定商品');
  result[key]=value;
 }
 for(const c of customCategories(parameters))if(!c.productField&&!c.specBinding&&c.enabled&&c.productBinding&&!Object.hasOwn(selections,c.id)&&!previous?.[c.id]){const row=c.rows.find(r=>r.enabled&&r.isDefault);if(row)result[c.id]=row.id;}
 return result;
}
export function assertCustomSchemaTransition(previous,next){
 for(const old of previous?.categories||[]){const c=next?.categories?.find(x=>x.id===old.id);
  if(!c)continue; // Database reference protection checks category/row removal.
  if(old.productField!==c.productField||old.specBinding!==c.specBinding)fail('已有分类不能更换商品字段绑定');
  for(const row of old.rows){const nr=c.rows.find(r=>r.id===row.id);if((old.productField||old.specBinding)&&nr&&(nr.businessValue!==row.businessValue||JSON.stringify(nr.referenceNames)!==JSON.stringify(row.referenceNames)))fail('已有资料的业务引用值不能更改');}
  for(const f of old.fields){const nf=c.fields.find(x=>x.id===f.id);
   if(old.rows.some(r=>r.values[f.id]!==undefined&&r.values[f.id]!==null&&r.values[f.id]!=='')){
    if(!nf||nf.type!==f.type)fail('字段“'+f.label+'”已有资料，不能删除或改变类型');
    if(f.type==='select'&&old.rows.some(r=>r.values[f.id]&&!nf.options.includes(r.values[f.id])))fail('单选选项仍被资料使用，请先调整资料');
   }
  }
 }
}
