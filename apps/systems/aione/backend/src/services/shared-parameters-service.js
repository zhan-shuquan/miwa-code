// Cloud SQL single source of active shared parameters, with versioned audit.
import pool,{withTransaction} from "../../db.js";
import {INITIAL_PARAMETERS} from "../../../js/config/shared-parameter-defaults.js";

const fail=(code,message,statusCode=400)=>Object.assign(new Error(message),{code,statusCode});
const clone=x=>JSON.parse(JSON.stringify(x));
const nonneg=x=>typeof x==="number"&&Number.isFinite(x)&&x>=0;
const pct=x=>nonneg(x)&&x<=100;
export function validateSharedParameters(p){
 if(!p||typeof p!=="object"||Array.isArray(p))throw fail("invalid_shared_parameters","共享参数必须是对象");
 const c=p.commerce,common=p.common,shop=p.shop,delivery=p.delivery;
 if(!c||!common||!shop||!delivery)throw fail("shared_parameters_incomplete","共享参数缺少必需模块");
 if(!nonneg(common.cnyToJpyRate)||!common.cnyToJpyRate)throw fail("invalid_currency_rate","汇率必须大于0");
 for(const key of ["platformFeeRate","couponRate","pointRate","advertisingRate"]){
  if(!pct(shop[key]))throw fail("invalid_shop_rate","运营费率必须在0-100%");
 }
 for(const key of ["tariffRatePct","productMarginTargetPct","operatingMarginTargetPct"]){
  if(!pct(c[key]))throw fail("invalid_commerce_rate","利润目标和预估关税必须在0-100%");
 }
 if(!Number.isSafeInteger(c.priceRoundUnitJpy)||c.priceRoundUnitJpy<=0||!nonneg(c.priceTailJpy)||c.priceTailJpy>=c.priceRoundUnitJpy)
  throw fail("invalid_price_tail","售价取整参数无效");
 if(!c.logistics||Array.isArray(c.logistics)||Object.keys(c.logistics).some(k=>["__proto__","constructor","prototype"].includes(k)))throw fail("invalid_logistics_modes","物流目录无效");
 const rules=Object.values(c.logistics);
 if(!rules.length||rules.length>500||new Set(rules.map(x=>x?.name)).size!==rules.length)throw fail("invalid_logistics_modes","物流方式不能为空、重复或超过500项");
 for(const rule of rules){
  if(!rule||typeof rule.name!=="string"||!rule.name.trim()||rule.name.length>80)throw fail("invalid_logistics_name","物流名称无效");
  if(!["direct","warehouse"].includes(rule.fulfillment)||!["step","kg"].includes(rule.billing))throw fail("invalid_logistics_mode","物流履约或计费模式无效");
  if(rule.billing==="step" && (![rule.firstWeightG,rule.additionalWeightG].every(v=>Number.isSafeInteger(v)&&v>0)||![rule.firstFeeCny,rule.additionalFeeCny].every(nonneg)))throw fail("invalid_step_rate","首重续重参数无效");
  if(rule.billing==="kg"&&!nonneg(rule.perKgCny))throw fail("invalid_kg_rate","每kg费率无效");
 }
 for(const key of ["THIN_3CM","SIZE_60","SIZE_80","SIZE_100","SIZE_120"]){if(!nonneg(delivery[key]?.fee))throw fail("missing_japan_delivery","日本配送费率缺失");}
 for(const map of [c.chinaPackagingCny,c.japanPackagingJpy]){
  if(!map||Array.isArray(map)||!Object.keys(map).length||Object.keys(map).length>500)throw fail("invalid_packaging_catalog","包装目录无效");
  for(const [name,cost] of Object.entries(map))if(!name.trim()||name.length>80||["__proto__","constructor","prototype","定制包装"].includes(name)||!nonneg(cost))throw fail("invalid_packaging_cost","包装名称或成本无效");
 }
 for(const [kind,items] of Object.entries(p.settingsCatalogMeta||{})){
  const values={chinaPackaging:c.chinaPackagingCny,japanPackaging:c.japanPackagingJpy,logistics:c.logistics}[kind];
  if(!["chinaPackaging","japanPackaging","logistics"].includes(kind)||!values||!items||Array.isArray(items))throw fail("invalid_catalog_metadata","设置目录无效");
  if(Object.values(items).filter(item=>item?.isDefault===true).length>1)throw fail("invalid_catalog_default","每个目录只能有一个默认选项");
  for(const [key,item] of Object.entries(items))if(Object.keys(item||{}).some(k=>!["enabled","sortOrder","isDefault"].includes(k))||(item?.isDefault!==undefined&&typeof item.isDefault!=="boolean")||(item?.isDefault===true&&item.enabled===false)||!Object.hasOwn(values,key)||!item||typeof item.enabled!=="boolean"||!Number.isSafeInteger(item.sortOrder)||item.sortOrder<0)throw fail("invalid_catalog_metadata","设置状态或排序无效");
 }
 return clone(p);
}
export async function readSharedParameters(db=pool){
 // One idempotent bootstrap on fresh DB. Do not import historical browser localStorage.
 await db.query("INSERT INTO public.aione_shared_parameters(scope,version,payload,updated_by) VALUES('global',1,$1::jsonb,'owner-approved-bootstrap') ON CONFLICT(scope) DO NOTHING",[JSON.stringify(INITIAL_PARAMETERS)]);
 await db.query("INSERT INTO public.aione_shared_parameter_history(scope,version,payload,updated_by,change_reason) SELECT scope,version,payload,updated_by,'Owner-approved initial parameters' FROM public.aione_shared_parameters WHERE scope='global' ON CONFLICT(scope,version) DO NOTHING");
 const r=await db.query("SELECT version,payload,updated_at,updated_by FROM public.aione_shared_parameters WHERE scope='global'");
 if(r.rowCount!==1)throw fail("shared_parameters_not_ready","共享参数未就绪",503);
 return {version:Number(r.rows[0].version),parameters:r.rows[0].payload,updatedAt:r.rows[0].updated_at,updatedBy:r.rows[0].updated_by};
}
export async function activateSharedParameters({expectedVersion,parameters,updatedBy,changeReason}){
 if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1||!updatedBy||!String(changeReason||"").trim())throw fail("invalid_shared_update","需要当前版本、负责人及变更原因");
 const candidate=validateSharedParameters(parameters);
 return withTransaction(async db=>{
  await readSharedParameters(db);
  const locked=await db.query("SELECT version,payload FROM public.aione_shared_parameters WHERE scope='global' FOR UPDATE");
  const current=Number(locked.rows[0]?.version);
  if(current!==expectedVersion)throw fail("shared_parameters_version_conflict","共享参数版本已变化，请刷新再修改",409);
  const previous=locked.rows[0].payload?.commerce;
  if(previous){
   const fields={chinaPackagingCny:"packagingMethod",japanPackagingJpy:"packagingMaterial",logistics:"logisticsMethod"};
   const removed=[];
   for(const [field,productField] of Object.entries(fields)){
    for(const [key,value] of Object.entries(previous[field]||{})){
     if(Object.hasOwn(candidate.commerce[field],key)){
      if(field==="logistics"&&candidate.commerce.logistics[key].name!==value.name)throw fail("referenced_catalog_change","已有物流名称不能直接改名，请新增方式");
     }else removed.push({productField,name:field==="logistics"?value.name:key});
    }
   }
   if(removed.length){
    // Product writers acquire the parameter row in SHARE mode before product locks.
    // The table lock additionally excludes older writers during reference checking.
    await db.query("LOCK TABLE public.products IN SHARE MODE");
    for(const {productField,name} of removed){
     const used=await db.query("SELECT product_code FROM public.products WHERE metadata->'manualEntry'->>$1=$2 OR metadata->>$1=$2 LIMIT 1",[productField,name]);
     if(used.rows.length)throw fail("settings_item_in_use",name+" 已被商品 "+used.rows[0].product_code+" 引用，请恢复该项并停用",409);
    }
   }
  }
  const version=current+1;
  await db.query("UPDATE public.aione_shared_parameters SET version=$1,payload=$2::jsonb,updated_at=now(),updated_by=$3 WHERE scope='global'",[version,JSON.stringify(candidate),updatedBy]);
  await db.query("INSERT INTO public.aione_shared_parameter_history(scope,version,payload,updated_by,change_reason) VALUES('global',$1,$2::jsonb,$3,$4)",[version,JSON.stringify(candidate),updatedBy,String(changeReason).trim().slice(0,500)]);
  return {version,parameters:candidate};
 });
}
