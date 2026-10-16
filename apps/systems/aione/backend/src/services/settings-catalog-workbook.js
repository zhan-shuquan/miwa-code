import ExcelJS from 'exceljs';
import {SETTINGS_CATALOGS} from '../../../js/config/settings-catalog.js';
const MAX_ROWS=500;
const bad=message=>Object.assign(new Error(message),{code:'invalid_settings_workbook',statusCode:400});
const modeLabels={direct:'中国直发',warehouse:'日本入仓',kg:'按kg',step:'首重续重'};
function definition(kind){if(!Object.hasOwn(SETTINGS_CATALOGS,kind))throw bad('未知设置分类');return SETTINGS_CATALOGS[kind];}
function columns(kind){
 const d=definition(kind);
 return kind==='delivery'?['固定编号','名称','配送费(JPY)','排序','状态','默认项']:kind==='logistics'?['固定编号','名称','履约方式','计费方式','每kg费用(CNY)','首重(g)','首重费用(CNY)','续重(g)','续重费用(CNY)','排序','状态','默认项']:['名称',`单套成本(${d.currency})`,'排序','状态','默认项'];
}
function number(value,label,{integer=false,positive=false}={}){
 if(value===null||value===undefined||String(value).trim()===''||!['string','number'].includes(typeof value))throw bad(label+'不能为空且必须为数字');
 const n=Number(value);
 if(!Number.isFinite(n)||n<0||positive&&n<=0||integer&&!Number.isSafeInteger(n))throw bad(label+'必须为'+(positive?'正':'非负')+(integer?'整数':'数'));
 return n;
}
function validateRow(kind,row){
 const key=String(row?.key||'').trim();
 if(!key||key.length>80||['__proto__','constructor','prototype','定制包装'].includes(key))throw bad('名称或编号无效');
 if(typeof row.enabled!=='boolean'||row.isDefault!==undefined&&typeof row.isDefault!=='boolean')throw bad('状态或默认项无效');
 if(row.isDefault&&row.enabled===false)throw bad('默认项必须启用');
 const result={key,enabled:row.enabled,sortOrder:number(row.sortOrder,'排序',{integer:true}),isDefault:row.isDefault===true};
 if(kind==='delivery'){if(!/^[A-Za-z0-9_-]+$/.test(key)||!row.value||typeof row.value.name!=='string'||!row.value.name.trim()||row.value.name.length>80)throw bad('配送编号或名称无效');result.value={name:row.value.name.trim(),fee:number(row.value.fee,'配送费'),enabled:row.enabled};return result;}
 if(kind!=='logistics'){result.value=number(row.value,'单套成本');return result;}
 const v=row.value;
 if(!/^[a-zA-Z0-9_-]+$/.test(key)||!v||typeof v.name!=='string'||!v.name.trim()||v.name.length>80)throw bad('物流编号或名称无效');
 if(!['direct','warehouse'].includes(v.fulfillment)||!['kg','step'].includes(v.billing))throw bad('履约方式或计费方式无效');
 result.value={name:v.name.trim(),fulfillment:v.fulfillment,billing:v.billing};
 if(v.billing==='kg')result.value.perKgCny=number(v.perKgCny,'每kg费用');
 else for(const [k,label] of [['firstWeightG','首重'],['firstFeeCny','首重费用'],['additionalWeightG','续重'],['additionalFeeCny','续重费用']])result.value[k]=number(v[k],label,k.endsWith('WeightG')?{integer:true,positive:true}:{});
 return result;
}
export function validateWorkbookRows(kind,rows){
 definition(kind);
 if(!Array.isArray(rows)||rows.length>MAX_ROWS)throw bad('每次最多500条设置');
 const keys=new Set(),names=new Set();let defaults=0;const errors=[],valid=[];
 rows.forEach((raw,index)=>{try{const row=validateRow(kind,raw);if(keys.has(row.key))throw bad('名称或编号重复');keys.add(row.key);if(kind==='logistics'){if(names.has(row.value.name))throw bad('物流名称重复');names.add(row.value.name);}if(row.isDefault&&++defaults>1)throw bad('每个分类只能有一个默认项');valid.push(row);}catch(e){errors.push({row:index+2,message:e.message});}});
 return {catalog:kind,rows:valid,errors,totalRows:rows.length};
}
export async function exportCatalogWorkbook(kind,rows,{template=false}={}){
 const d=definition(kind),book=new ExcelJS.Workbook();book.creator='AIONE';
 const ws=book.addWorksheet('设置资料',{views:[{state:'frozen',ySplit:1}]});
 ws.addRow(columns(kind));
 const checked=validateWorkbookRows(kind,rows);if(checked.errors.length)throw bad('导出资料无效：第'+checked.errors[0].row+'行 '+checked.errors[0].message);
 for(const row of checked.rows){const v=row.value;ws.addRow(kind==='delivery'?[row.key,v.name,v.fee,row.sortOrder,row.enabled?'启用':'停用',row.isDefault?'是':'否']:kind==='logistics'?[row.key,v.name,modeLabels[v.fulfillment],modeLabels[v.billing],v.billing==='kg'?v.perKgCny:null,v.billing==='step'?v.firstWeightG:null,v.billing==='step'?v.firstFeeCny:null,v.billing==='step'?v.additionalWeightG:null,v.billing==='step'?v.additionalFeeCny:null,row.sortOrder,row.enabled?'启用':'停用',row.isDefault?'是':'否']:[row.key,v,row.sortOrder,row.enabled?'启用':'停用',row.isDefault?'是':'否']);}
 ws.getRow(1).height=28;ws.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF21825C'}};});
 ws.columns.forEach((col,i)=>{col.width=i<2?24:18;});ws.autoFilter={from:{row:1,column:1},to:{row:1,column:columns(kind).length}};
 const stateCol=kind==='logistics'?11:kind==='delivery'?5:4,defaultCol=stateCol+1;
 for(let r=2;r<=501;r++){
  for(const [col,values] of [[stateCol,'启用,停用'],[defaultCol,'是,否'],...(kind==='logistics'?[[3,'中国直发,日本入仓'],[4,'按kg,首重续重']]:[])])ws.getCell(r,col).dataValidation={type:'list',allowBlank:col===defaultCol,formulae:['"'+values+'"'],showErrorMessage:true,errorTitle:'选项不正确',error:'请使用下拉选项'};
 }
 const help=book.addWorksheet('填写说明');help.getColumn(1).width=105;
 for(const line of [`AIONE · ${d.label} · ${d.currency}`,template?'空白模板：在“设置资料”中从第2行开始填写。':'导出包含当前页面草稿；并不代表所有内容已经保存生效。','请保留工作表名、表头和“模板信息”。最多500条，每次上传不超过2MB。','状态填写“启用”或“停用”；默认项填写“是”或“否”，每个分类最多一个默认项且必须启用。','费用填写非负数字。排序填写非负整数。中国包装以CNY计，日本包装以JPY计。','物流编号保持不变；履约方式选择中国直发或日本入仓；计费选择按kg或首重续重，仅填写适用的费用列。','已有资料按名称或固定编号更新。导入不会删除未列出的资料。已有物流名称不可直接更改。','导入后先检查预览及错误，应用到草稿后仍需填写变更原因并保存生效。','请填写固定数值，不要使用公式、宏或外部链接。'])help.addRow([line]);
 const meta=book.addWorksheet('模板信息',{state:'veryHidden'});meta.addRow(['AIONE_SETTINGS_CATALOG',1,kind]);
 return Buffer.from(await book.xlsx.writeBuffer());
}
function value(cell){const v=cell.value;if(v&&typeof v==='object')throw bad('请填写固定文字或数字，不支持公式及其他对象');return v;}
export async function parseCatalogWorkbook(kind,bytes){
 definition(kind);if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>2*1024*1024)throw bad('文件不能为空或超过2MB');
 const book=new ExcelJS.Workbook();try{await book.xlsx.load(bytes);}catch{throw bad('无法读取文件，请使用下载的Excel .xlsx模板');}
 const meta=book.getWorksheet('模板信息');if(!meta||meta.getCell('A1').value!=='AIONE_SETTINGS_CATALOG'||meta.getCell('B1').value!==1||meta.getCell('C1').value!==kind)throw bad('模板分类不匹配，请下载当前分类的模板');
 const ws=book.getWorksheet('设置资料'),headers=columns(kind);if(!ws||headers.some((h,i)=>ws.getCell(1,i+1).value!==h))throw bad('表头不匹配，请保留原模板的列名和顺序');
 if(ws.rowCount>10000)throw bad('表格行数过多，请按500条拆分');
 const rows=[],parseErrors=[],sourceRows=[];
 for(let r=2;r<=ws.rowCount;r++){
  const raw=headers.map((_,i)=>ws.getCell(r,i+1).value);if(raw.every(v=>v===null||v===undefined||v===''))continue;
  if(sourceRows.length+parseErrors.length>=MAX_ROWS)throw bad('每次最多500条设置');
  try{
   const cells=headers.map((_,i)=>value(ws.getCell(r,i+1))),logistics=kind==='logistics',delivery=kind==='delivery',state=cells[logistics?10:delivery?4:3],def=cells[logistics?11:delivery?5:4];
   if(!['启用','停用'].includes(state)||![null,undefined,'','是','否'].includes(def))throw bad('状态使用启用/停用，默认项使用是/否');
   const row={key:String(cells[0]??'').trim(),enabled:state==='启用',isDefault:def==='是',sortOrder:cells[logistics?9:delivery?3:2]??sourceRows.length+1};
   row.value=delivery?{name:cells[1],fee:cells[2],enabled:row.enabled}:logistics?{name:cells[1],fulfillment:{'中国直发':'direct','日本入仓':'warehouse'}[cells[2]],billing:{'按kg':'kg','首重续重':'step'}[cells[3]],perKgCny:cells[4],firstWeightG:cells[5],firstFeeCny:cells[6],additionalWeightG:cells[7],additionalFeeCny:cells[8]}:cells[1];
   rows.push(row);sourceRows.push(r);
  }catch(e){parseErrors.push({row:r,message:e.message});}
 }
 if(!rows.length&&!parseErrors.length)throw bad('没有可导入的资料，请从第2行开始填写');
 const result=validateWorkbookRows(kind,rows);result.errors=result.errors.map(e=>({...e,row:sourceRows[e.row-2]})).concat(parseErrors).sort((a,b)=>a.row-b.row);result.totalRows=sourceRows.length+parseErrors.length;
 return result;
}
