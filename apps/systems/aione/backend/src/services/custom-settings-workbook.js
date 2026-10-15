import ExcelJS from 'exceljs';
import {validateCustomSettings,validateCustomRow} from '../../../js/config/custom-settings.js';
const bad=message=>Object.assign(new Error(message),{code:'invalid_custom_workbook',statusCode:400});
const signature=c=>JSON.stringify({id:c.id,fields:c.fields});
const headers=c=>['固定编号（新增留空）','名称',...c.fields.map(f=>f.label),'排序','状态','默认项'];
export async function customSettingsWorkbook(category,{template=false}={}){
 validateCustomSettings({categories:[category]});
 const book=new ExcelJS.Workbook(),ws=book.addWorksheet('设置资料',{views:[{state:'frozen',ySplit:1}]});
 ws.addRow(headers(category));
 if(!template)for(const r of category.rows)ws.addRow([r.id,r.name,...category.fields.map(f=>f.type==='boolean'?(r.values[f.id]===undefined?null:r.values[f.id]?'是':'否'):r.values[f.id]??null),r.sortOrder,r.enabled?'启用':'停用',r.isDefault?'是':'否']);
 ws.columns.forEach(c=>c.width=24);ws.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF21825C'}};});
 ws.autoFilter={from:{row:1,column:1},to:{row:1,column:headers(category).length}};
 const meta=book.addWorksheet('模板信息',{state:'veryHidden'});meta.addRow(['AIONE_CUSTOM_V1',signature(category)]);
 const help=book.addWorksheet('填写说明');help.getColumn(1).width=100;
 for(const line of ['新增资料的固定编号留空；导出的已有编号不要修改。名称不可重复。','状态填启用/停用，默认项填是/否；布尔字段填是/否；日期使用YYYY-MM-DD文本。','最多500条、2MB；不能包含公式。模板字段改变后请重新下载。','导入按编号更新；新增按名称匹配已有资料；不删除表格中未列出的资料。','先预览，再应用到草稿，填写原因并保存后生效。自定义资料不自动参与成本或平台接口。'])help.addRow([line]);
 return Buffer.from(await book.xlsx.writeBuffer());
}
export async function parseCustomSettingsWorkbook(category,buffer){
 validateCustomSettings({categories:[category]});
 if(!buffer?.length||buffer.length>2*1024*1024)throw bad('请选择不超过2MB的xlsx文件');
 const book=new ExcelJS.Workbook();try{await book.xlsx.load(buffer);}catch{throw bad('无法读取Excel文件');}
 const meta=book.getWorksheet('模板信息');if(meta?.getCell('A1').value!=='AIONE_CUSTOM_V1'||meta?.getCell('B1').value!==signature(category))throw bad('分类或字段版本不一致，请重新下载模板');
 const ws=book.getWorksheet('设置资料'),cols=headers(category);
 if(!ws||cols.some((h,i)=>ws.getCell(1,i+1).value!==h)||ws.columnCount>cols.length)throw bad('表头不匹配');
 if(ws.rowCount>10000)throw bad('行数过多');
 const rows=[],errors=[],ids=new Set(),names=new Set();let totalRows=0,defaults=0;
 for(let n=2;n<=ws.rowCount;n++){
  const cells=cols.map((_,i)=>ws.getCell(n,i+1).value);if(cells.every(x=>x===null||x===undefined||x===''))continue;
  if(++totalRows>500)throw bad('每次最多500条');
  try{
   if(cells.some(x=>x!==null&&typeof x==='object'))throw bad('请使用固定数值或文本，不能包含公式或对象');
   const name=String(cells[1]??'').trim();
   const supplied=String(cells[0]??'').trim();
   if(supplied&&!category.rows.some(r=>r.id===supplied))throw bad('固定编号不存在；新增资料请留空');
   const id=supplied||category.rows.find(r=>r.name===name)?.id||'r_'+crypto.randomUUID();
   const offset=2+category.fields.length,state=cells[offset+1],def=cells[offset+2];
   if(!['启用','停用'].includes(state)||!['是','否',null,undefined,''].includes(def))throw bad('状态或默认项无效');
   const row={id,name,values:{},sortOrder:cells[offset]===null?totalRows:Number(cells[offset]),enabled:state==='启用',isDefault:def==='是'};
   category.fields.forEach((f,i)=>{const raw=cells[i+2];if(raw===null||raw===undefined||raw==='')return;
    if(f.type==='boolean'){if(!['是','否'].includes(raw))throw bad(f.label+'必须填写是/否');row.values[f.id]=raw==='是';}
    else row.values[f.id]=f.type==='number'?Number(raw):String(raw);
   });
   validateCustomRow(category,row);if(ids.has(id)||names.has(name))throw bad('编号或名称重复');
   ids.add(id);names.add(name);if(row.isDefault&&++defaults>1)throw bad('只能有一个默认项');rows.push(row);
  }catch(e){errors.push({row:n,message:e.message});}
 }
 if(!totalRows)throw bad('没有可导入资料');
 return {rows,errors,totalRows};
}
