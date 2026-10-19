// Shared Google Sheets material-master mapping. Preview only; Cloud SQL remains authoritative.
// Extend this registry only after verifying exact AIONE field IDs and native Sheet headers.
export const SETTINGS_SHEET_ID='1mLvyt4mEzqoe95452P_aAIqMsbtZlnyfgCmGZeS7f2o';
export const SETTINGS_SHEET_TABS=Object.freeze({material:'材质资料'});
export const MATERIAL_HEADERS=Object.freeze(['正式资料ID','中文名称','日文名称','英文名称','状态','备注','系统代码']);
const invalid=message=>Object.assign(new Error(message),{code:'invalid_google_settings_sheet',statusCode:400});
const clean=v=>String(v??'').trim();
export function previewMaterialRows(category,values){
 if(category?.productField!=='material')throw invalid('当前只支持商品主要材质资料，请选择材质资料分类');
 if(!Array.isArray(values)||values.length<1||MATERIAL_HEADERS.some((v,i)=>clean(values[0]?.[i])!==v))throw invalid('Google 表格材质资料表头与已确认模板不一致');
 const required=['name_ja','name_en','system_code'];
 if(required.some(id=>!category.fields?.some(f=>f.id===id&&f.type==='text')))throw invalid('AIONE材质字段定义发生变化，请先核对绑定');
 const rows=[],errors=[],pending=[],seen=new Set(),codes=new Set();
 for(let i=1;i<values.length;i++){
  const cells=values[i]||[];
  if(!cells.some(x=>clean(x)))continue;
  const n=i+1,name=clean(cells[1]),status=clean(cells[4]),key=name.toLocaleLowerCase(),code=clean(cells[6]);
  if(!name){errors.push('第'+n+'行：中文名称不能为空');continue;}
  if(seen.has(key)){errors.push('第'+n+'行：材质名称重复 '+name);continue;}
  seen.add(key);
  if(!/^MAT_[A-Z0-9]+(?:_[A-Z0-9]+)*$/.test(code)||code.length>64){errors.push('第'+n+'行：系统代码必须以 MAT_ 开头且使用大写字母、数字与下划线');continue;}
  if(codes.has(code)){errors.push('第'+n+'行：系统代码重复 '+code);continue;}
  codes.add(code);
  if(!['启用','停用','待确认'].includes(status)){errors.push('第'+n+'行：状态仅允许启用、停用、待确认');continue;}
  if(status==='待确认'){pending.push({line:n,name});continue;}
  const previous=category.rows?.find(r=>r.businessValue===name||r.name===name);
  const sheetId=clean(cells[0]);
  if(sheetId&&sheetId!==previous?.id){errors.push('第'+n+'行：正式资料ID不匹配；不允许新建时自行填写ID');continue;}
  if(!previous&&category.rows?.length+rows.filter(r=>r.mode==='新增').length>=500){errors.push('超过资料数量上限500');continue;}
  const ja=clean(cells[2]),en=clean(cells[3]);
  if(!ja||!en){errors.push('第'+n+'行：启用或停用资料必须有日文和英文名称');continue;}
  if([name,ja,en].some(x=>x.length>80)){errors.push('第'+n+'行：名称超过80字');continue;}
  if(previous?.values?.system_code&&previous.values.system_code!==code){errors.push('第'+n+'行：已建立的系统代码不可更改');continue;}
  if(category.rows?.some(r=>r!==previous&&r.values?.system_code===code)){errors.push('第'+n+'行：系统代码已被其他资料使用');continue;}
  rows.push({mode:previous?'更新':'新增',line:n,name,systemCode:code,enabled:status==='启用',id:previous?.id||'',values:{...previous?.values,name_ja:ja,name_en:en,system_code:code}});
 }
 if(values.length>502)throw invalid('Google 表格最多读取500条资料');
 return {rows,errors,pending,summary:{ready:rows.length,waiting:pending.length,errors:errors.length},sheetId:SETTINGS_SHEET_ID,tab:SETTINGS_SHEET_TABS.material};
}
