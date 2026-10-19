import {boundProductCatalog} from './product-setting-catalogs.js';
// Profiles extend the shared field manager. store_id refers to the canonical stores table.
const fields=[['store_id','正式店铺编号','text'],['platform_fee_rate','平台交易费率（%）','number'],['coupon_rate','默认优惠券费率（%）','number'],['point_rate','默认积分费率（%）','number'],['advertising_rate','默认广告费率（%）','number'],['pc_description','PC说明模板','longtext'],['sp_description','手机说明模板','longtext'],['sales_description','销售说明模板','longtext'],['delivery_set_id','乐天配送方式候选编号','text'],['normal_delivery_date_id','乐天纳期候选编号','text']];
export function addStoreCatalogPreset(parameters,stores){
 if(!Array.isArray(stores)||!stores.length)throw new Error('暂无正式店铺，请先在店铺主数据中登记；不会创建另一份店铺名单。');
 const next=structuredClone(parameters.customSettings||{categories:[]});
 let c=next.categories.find(c=>c.productField==='targetShopRef');
 if(!c){if(next.categories.some(c=>c.id==='product_stores'||c.name==='店铺默认设置'))throw new Error('已有同名分类，请先调整名称');c={id:'product_stores',name:'店铺默认设置',owner:'渠道之家',enabled:true,productBinding:true,productField:'targetShopRef',dropdownSort:'usage',fields:fields.map(([id,label,type])=>({id,label,type,required:id==='store_id'})),rows:[]};next.categories.push(c);}
 for(const [id,label,type] of fields)if(!c.fields.some(f=>f.id===id))c.fields.push({id,label,type,required:id==='store_id'});
 for(const store of stores){if(c.rows.some(r=>r.values.store_id===store.id))continue;c.rows.push({id:'store_'+store.id,name:store.name,businessValue:store.name,enabled:store.status==='active'&&store.platform_status!=='inactive',isDefault:false,sortOrder:c.rows.length+1,values:{store_id:store.id}});}
 return next;
}
export function storeProfile(parameters,shopRef){return boundProductCatalog(parameters,'targetShopRef')?.rows.find(r=>r.businessValue===shopRef);}
export function storePlatformRate(parameters,shopRef){return storeProfile(parameters,shopRef)?.values.platform_fee_rate??parameters?.shop?.platformFeeRate;}
const blank=v=>v===undefined||v===null||v==='';
// Only raw, blank inputs receive defaults. Persisted values and deliberate zero rates are preserved.
export function applyStoreDefaults(product,input,previous,parameters){
 const c=boundProductCatalog(parameters,'targetShopRef'),r=storeProfile(parameters,product.targetShopRef);
 if(!c?.enabled||!r?.enabled)return product;
 for(const [field,key] of [['pcDescription','pc_description'],['spDescription','sp_description'],['salesDescription','sales_description']])if(blank(input[field])&&blank(previous?.[field])&&!blank(r.values[key]))product[field]=r.values[key];
 product.rates??={};
 for(const [field,key] of [['coupon','coupon_rate'],['points','point_rate'],['ads','advertising_rate']])if(blank(input.rates?.[field])&&blank(previous?.rates?.[field])&&!blank(r.values[key]))product.rates[field]=r.values[key];
 product.extraAttributes??={};
 for(const [field,key] of [['rakutenDeliverySetId','delivery_set_id'],['rakutenNormalDeliveryDateId','normal_delivery_date_id']])if(blank(input.extraAttributes?.[field])&&blank(previous?.extraAttributes?.[field])&&!blank(r.values[key]))product.extraAttributes[field]=r.values[key];
 return product;
}
export function validateStoreProfiles(parameters){
 const c=boundProductCatalog(parameters,'targetShopRef');if(!c)return;
 for(const [id,,type] of fields){const field=c.fields.find(f=>f.id===id);if((id==='store_id'&&!field)||(field&&field.type!==type))throw new Error('店铺引用与默认字段的类型不能更改；可编辑字段标签或新增字段');}
 const ids=new Set();
 for(const r of c.rows){const v=r.values;if(typeof v.store_id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v.store_id)||ids.has(v.store_id))throw new Error('店铺设置必须关联不重复的正式店铺编号');ids.add(v.store_id);
  for(const key of ['platform_fee_rate','coupon_rate','point_rate','advertising_rate'])if(!blank(v[key])&&(typeof v[key]!=='number'||!Number.isFinite(v[key])||v[key]<0||v[key]>=100))throw new Error('店铺费率必须在0至100%之间（不含100%）');
  for(const key of ['delivery_set_id','normal_delivery_date_id'])if(!blank(v[key])&&!/^\d{1,20}$/.test(v[key]))throw new Error('乐天配送和纳期编号必须为数字；使用前仍需匹配平台候选项');
 }
}
