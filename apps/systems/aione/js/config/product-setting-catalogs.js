import {customCategories,sortedCustomRows,PRODUCT_CATALOG_FIELDS} from './custom-settings.js';
export const LEGACY_CATEGORY_BRANDS={'家居用品':'HOMEONE','女袜':'SOCKONE','男袜':'SOCKONE','童袜':'SOCKONE','女帽':'HATORIA','男帽':'HATORIA','玩具用品':'TOYONE','宠物用品':'PETONE','箱包':'BAGONE','电子配件':'PHONEONE'};
export const LEGACY_CATEGORIES=['家居用品','女袜','男袜','童袜','女帽','男帽','服装服饰','鞋靴','玩具用品','宠物用品','箱包','电子配件','其他'];
export const boundProductCatalog=(p,field)=>customCategories(p).find(c=>c.productField===field);
export function productFieldOptions(p,field,current='',usage={}){
 const c=boundProductCatalog(p,field);
 if(!c)return null;
 const rows=sortedCustomRows(c,usage[c.id]).filter(r=>c.enabled&&r.enabled||r.businessValue===current);
 const options=rows.map(r=>({value:r.businessValue,label:r.name+(!c.enabled||!r.enabled?'（已停用）':'')}));
 if(current&&!options.some(r=>r.value===current))options.unshift({value:current,label:current+'（历史值）'});
 return options;
}
export function productFieldDefault(p,field,fallback=''){
 const c=boundProductCatalog(p,field);
 return c?c.enabled?c.rows.find(r=>r.enabled&&r.isDefault)?.businessValue||'':'':fallback;
}
export function suggestedProductCategory(p,name){
 const c=boundProductCatalog(p,'category');if(!c||!c.enabled)return '';
 const matches=c.rows.filter(r=>r.enabled&&String(r.values.keywords||'').split(/[\n,，、;]/).some(k=>k.trim()&&String(name||'').toLowerCase().includes(k.trim().toLowerCase())));
 return matches.length===1?matches[0].businessValue:'';
}
export function categoryBrand(p,value){
 const c=boundProductCatalog(p,'category');
 const brand=c?c.enabled?c.rows.find(r=>r.enabled&&r.businessValue===value)?.values.default_brand||'':'':LEGACY_CATEGORY_BRANDS[value]||'';
 const brands=boundProductCatalog(p,'brand');
 return brands&&(!brands.enabled||!brands.rows.some(r=>r.enabled&&r.businessValue===brand))?'':brand;
}
// Explicit draft installation: existing cloud settings remain authoritative. No automatic production seed.
export function addProductCatalogPresets(parameters){
 const next=structuredClone(parameters.customSettings||{categories:[]});
 const text=(id,label)=>({id,label,type:'text',required:false});
 const seeds={category:{name:'商品分类',fields:[text('name_ja','日文名称'),text('name_en','英文名称'),text('parent','上级分类'),text('default_brand','默认品牌引用值'),text('keywords','识别关键词')],names:LEGACY_CATEGORIES},brand:{name:'品牌资料',fields:[text('name_ja','日文名称'),text('name_en','英文名称'),text('logo','标志地址')],names:[...new Set(Object.values(LEGACY_CATEGORY_BRANDS))]},material:{name:'材质资料',fields:[text('name_ja','日文名称'),text('name_en','英文名称'),text('system_code','系统代码')],names:[]},originCountry:{name:'原产地资料',fields:[text('name_ja','日文名称'),text('name_en','英文名称')],names:['中国']}};
 for(const [field,seed] of Object.entries(seeds)){
  if(next.categories.some(c=>c.productField===field))continue;
  // A collision with a user-owned ID must never overwrite that category.
  const id='product_'+field.toLowerCase();if(next.categories.some(c=>c.id===id||c.name===seed.name))throw new Error('已有同名资料，请先调整名称：'+seed.name);
  next.categories.push({id,name:seed.name,owner:'商品之家',enabled:true,productBinding:true,productField:field,dropdownSort:'usage',fields:seed.fields,rows:seed.names.map((name,i)=>({id:'r_'+i,name,businessValue:name,enabled:true,isDefault:field==='originCountry',sortOrder:i,values:field==='category'?{default_brand:LEGACY_CATEGORY_BRANDS[name]||'',keywords:({'女袜':'女袜,女士袜,レディースソックス','男袜':'男袜,男士袜,メンズソックス','童袜':'童袜,儿童袜,キッズソックス','女帽':'女帽,女士帽','男帽':'男帽,男士帽','鞋靴':'拖鞋,棉拖,クロッグ','宠物用品':'宠物,猫粮,狗粮,猫砂','电子配件':'数据线,充电器,手机壳','家居用品':'水龙头,防冻罩,收纳盒','箱包':'背包,手提包,旅行包','玩具用品':'玩具,玩偶,积木'}[name]||'')}:field==='originCountry'?{name_ja:'中国',name_en:'China'}:{}}))});
 }
 return next;
}

export function addMaterialSystemCodeField(parameters){
 const next=structuredClone(parameters.customSettings||{categories:[]});
 const c=next.categories.find(x=>x.productField==='material');
 if(!c)throw new Error('请先安装商品基础资料模板');
 if(c.fields.some(f=>f.id==='system_code'))return next;
 if(c.fields.length>=20)throw new Error('材质字段已达上限，请先整理无用字段');
 c.fields.push({id:'system_code',label:'系统代码',type:'text',required:false});
 return next;
}
// Scalar business values keep legacy calculation/platform contracts compatible; stable IDs own references.
export function applyBoundProductSelections(product,input,previous,parameters){
 for(const c of customCategories(parameters).filter(c=>c.productField)){
  const field=c.productField,explicit=Object.hasOwn(input,field),selected=Object.hasOwn(input.customSettings||{},c.id);
  let value=explicit?String(input[field]||'').trim():previous?.[field]??product[field]??'';
  if(!previous&&!explicit&&!selected)value=productFieldDefault(parameters,field);
  let row=selected?c.rows.find(r=>r.id===input.customSettings[c.id]):c.rows.find(r=>r.businessValue===value);
  if(selected&&input.customSettings[c.id]&&!row)throw new Error('商品选项不存在');
  if(selected&&row&&explicit&&value!==row.businessValue)throw Object.assign(new Error('商品字段与设置引用不一致：'+PRODUCT_CATALOG_FIELDS[field]),{statusCode:400,code:'invalid_product_setting'});
  if(selected)value=row?.businessValue||'';
  const historical=previous?.[field]===value;
  if(value&&(!row||!c.enabled||!row.enabled)&&!historical)throw Object.assign(new Error('请选择启用的'+PRODUCT_CATALOG_FIELDS[field]),{statusCode:400,code:'inactive_product_setting'});
  product[field]=value;
  if(row)product.customSettings[c.id]=row.id;else delete product.customSettings[c.id];
 }
 return product;
}
