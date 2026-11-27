import XLSX from 'xlsx';
import {createHash} from 'node:crypto';
import {csvRows} from './selection-sku-csv.js';
import {uploadPolicy} from './selection-upload-policy.js';

const fail=message=>{throw Object.assign(new Error(message),{statusCode:400})};
export const skuFileMaxBytes=uploadPolicy.maxBytes;
const norm=v=>String(v??'').normalize('NFKC').replace(/[\s_（）()]/g,'').toLowerCase();
const fields={
 product:['商品ID','供应商商品ID'],id:['SKU ID','供应商SKU ID','SKU编号'],spec:['SKU名称','规格名称','商品规格','规格'],
 image:['SKU图片链接','SKU图链接','SKU图片','参考图片','图片链接','图片URL'],title:['商品标题','商品名称'],
 cost:['原价（元）','采购价','采购价CNY','单个采购价'],weight:['重量(g)','净重(g)','单个净重(g)','重量','净重'],
 quantity:['套装数量'],price:['售价(JPY)','实际售价(JPY)'],stock:['库存','库存数量'],calculated:['计算价格（元）']
};
const labels=Object.fromEntries(Object.entries(fields).map(([key,values])=>[key,values.map(norm)]));
const validValue=v=>Boolean(String(v??'').trim())&&!/[?\uFFFD]/.test(String(v));
const attributeNames=a=>[a.name,a.attribute_name,a.label,...(Array.isArray(a.aliases)?a.aliases:[])].filter(Boolean).map(norm);
const knownValues=a=>(a.item_attribute_values||a.attributes||[]).map(x=>String(x.attribute_value??'').trim()).filter(Boolean);

export function parseSupplierFile(bytes,sourceUrl,filename='sku.csv',snapshot={}){
 if(!bytes.length||bytes.length>skuFileMaxBytes)fail('SKU表格为空或超过'+uploadPolicy.maxMB+'MB');
 const extension=String(filename).split('.').pop().toLowerCase();
 if(!['csv','xlsx','xls'].includes(extension))fail('请选择Excel（xlsx、xls）或CSV表格');
 const attributes=(snapshot.itemAttributes||[]).filter(a=>!a.disabled);
 const isHeader=row=>row.some(v=>labels.id.includes(norm(v))||labels.spec.includes(norm(v))||attributes.some(a=>attributeNames(a).includes(norm(v))));
 let matrices=[],encoding=extension;
 if(extension==='csv'){
  for(const candidate of ['utf-8','utf-16le','utf-16be','gb18030','shift_jis']){
   try{
    let text=new TextDecoder(candidate,{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');
    if(text.includes('\0'))continue;
    const rows=csvRows(text);
    if(rows.slice(0,20).some(isHeader)){matrices=[{name:'CSV',rows}];encoding=candidate;break;}
   }catch{/* Detect from a recognized header, not from successful decoding alone. */}
  }
  if(!matrices.length)fail('未识别到SKU表头或文件编码；请检查SKU名称、SKU ID或ERP规格属性列');
 }else{
  const zip=bytes[0]===0x50&&bytes[1]===0x4b,ole=bytes.subarray(0,4).equals(Buffer.from([0xd0,0xcf,0x11,0xe0]));
  if(extension==='xlsx'&&!zip||extension==='xls'&&!ole)fail('文件内容与扩展名不符，请保存为真正的Excel文件');
  let book;try{book=XLSX.read(bytes,{type:'buffer',cellFormula:true,sheetRows:522,cellHTML:false});}catch{fail('Excel文件损坏、加密或格式不支持，请重新另存为xlsx或CSV');}
  matrices=book.SheetNames.map(name=>{
   const sheet=book.Sheets[name];
   for(const [address,cell] of Object.entries(sheet))if(!address.startsWith('!')){
    if(cell.f)fail('表格含公式（'+name+'!'+address+'），请将公式结果粘贴为值后上传');
    if(cell.l?.Target&&/^https?:\/\//i.test(cell.l.Target))cell.v=cell.l.Target;
   }
   return {name,rows:XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true,blankrows:false})};
  });
 }
 const candidates=matrices.map(m=>({...m,index:m.rows.slice(0,20).findIndex(isHeader)})).filter(m=>m.index>=0);
 if(candidates.length!==1)fail(candidates.length?'有多个SKU工作表，请每次仅保留一个需要导入的SKU工作表':'未找到SKU名称、SKU ID或ERP规格属性表头');
 const {rows,index,name:sheetName}=candidates[0],headers=rows[index].map(v=>String(v??'').trim());
 const positions=Object.fromEntries(Object.entries(labels).map(([k,v])=>[k,headers.findIndex(h=>v.includes(norm(h)))]));
 const mapped=attributes.map(a=>({attribute:a.name,column:headers.findIndex(h=>attributeNames(a).includes(norm(h)))})).filter(a=>a.column>=0);
 const body=rows.slice(index+1).filter(row=>row.some(v=>String(v??'').trim()));
 if(!body.length)fail('表格只有表头，没有可导入的SKU数据');
 if(body.length>500)fail('SKU表格超过500行，请核对后分批录入');
 const product=String(sourceUrl||'').match(/detail\.1688\.com\/offer\/(\d+)\.html/)?.[1];
 const seen=new Map(),warnings=new Set();
 const cell=(row,k)=>positions[k]<0?'':String(row[positions[k]]??'').trim();
 const numeric=(value,label,line)=>{
  if(!value)return null;
  const number=Number(value.replace(/,/g,''));
  if(!Number.isFinite(number)||number<0)fail('第'+line+'行'+label+'不是有效非负数字');
  return number;
 };
 for(let n=0;n<body.length;n++){
  const row=body[n],line=index+n+2,id=cell(row,'id'),productId=cell(row,'product');
  for(const key of ['id','product'])if(typeof row[positions[key]]==='number'&&!Number.isSafeInteger(row[positions[key]]))fail('第'+line+'行编号精度已丢失，请将原始编号以文本格式重新导出');
  if(productId&&product&&productId!==product)fail('第'+line+'行商品ID与采购链接不一致');
  if(id&&!/^[\w-]{1,100}$/.test(id))fail('第'+line+'行供应商SKU ID无效');
  const values=Object.fromEntries(mapped.map(a=>[a.attribute,String(row[a.column]??'').trim()]));
  const originalName=cell(row,'spec')||Object.values(values).filter(Boolean).join(' / ');
  if(!originalName&&!id)fail('第'+line+'行没有SKU名称或属性值');
  const parts=originalName.split(/[+；;]/).map(v=>v.trim());
  for(const part of parts){
   const explicit=part.match(/^([^:：]+)[:：](.+)$/);
   const matches=attributes.filter(a=>explicit?attributeNames(a).includes(norm(explicit[1])):knownValues(a).some(v=>norm(v)===norm(part)));
   if(matches.length===1&&!values[matches[0].name])values[matches[0].name]=(explicit?explicit[2]:part).trim();
  }
  const image=cell(row,'image');
  if(image){try{if(!['https:','http:'].includes(new URL(image).protocol))throw Error();}catch{fail('第'+line+'行SKU图片链接无效');}}
  const code=id||'source_'+createHash('sha256').update(JSON.stringify([productId,originalName,values])).digest('hex').slice(0,24);
  const sku={code,supplierSkuId:id,supplierProductId:productId||product||'',originalName,spec:originalName,sourceParts:parts,
   selected:true,confirmed:false,attributeValues:values,supplierTitle:cell(row,'title'),supplierImageUrl:image,
   supplierCost:numeric(cell(row,'cost'),'采购价',line),supplierCalculatedCost:numeric(/^[-—–]+$/.test(cell(row,'calculated'))?'':cell(row,'calculated'),'计算价格',line),supplierStock:numeric(cell(row,'stock'),'库存',line),
   warnings:/[?\uFFFD]/.test(originalName)?['原始规格含缺失字符，请核实修正']:[]};
  for(const key of ['cost','weight','quantity','price']){const value=numeric(cell(row,key),key,line);if(value!==null)sku[key]=value;}
  sku.referenceWeight=sku.weight??(Number(originalName.match(/(\d+(?:\.\d+)?)\s*g\b/i)?.[1])||null);
  if(seen.has(code)){if(JSON.stringify(seen.get(code))!==JSON.stringify(sku))fail('供应商SKU ID或规格存在冲突行：'+(id||originalName));warnings.add('相同重复行已合并');}
  seen.set(code,sku);
 }
 const skus=[...seen.values()],axes=[],fixed={};
 for(const a of attributes){
  const values=skus.map(s=>s.attributeValues[a.name]||'');
  if(!values.some(Boolean))continue;
  const single=values.every(validValue)&&new Set(values).size===1;
  axes.push({attribute:a.name,sales:!single});if(single)fixed[a.name]=values[0];
 }
 if(skus.some(s=>s.warnings.length))warnings.add('原始资料含缺字，须人工核实后确认');
 if(!axes.length)warnings.add('未能唯一匹配ERP属性，请在商品规格属性中选择并填写实际值');
 return {skus,specificationAttributes:axes,fixedSpecifications:fixed,source:{filename:String(filename).slice(0,200),encoding,format:extension,sheetName,
  sha256:createHash('sha256').update(bytes).digest('hex'),base64:bytes.toString('base64'),headers,productId:product||''},warnings:[...warnings]};
}
