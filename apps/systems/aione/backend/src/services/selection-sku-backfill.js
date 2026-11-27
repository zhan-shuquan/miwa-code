import ExcelJS from 'exceljs';
import JSZip from 'jszip';
const xmlEscape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
// Modify only ERP SKU cells in the existing XLSX archive. All other ZIP entries,
// formulas, styles, images and employee edits remain byte-for-byte untouched.
export async function backfillSkuWorkbook(bytes,erpSkus,{offerId}={}) {
  const w=new ExcelJS.Workbook();await w.xlsx.load(bytes);
  const matches=w.worksheets.filter(s=>s.getRow(1).values.includes('SKU ID')&&s.getRow(1).values.includes('ERP SKU'));
  if(matches.length!==1)throw Error('SKU表头不唯一，未修改表格');
  const sheet=matches[0],header=sheet.getRow(1).values,idCol=header.indexOf('SKU ID'),erpCol=header.indexOf('ERP SKU'),offerCol=header.indexOf('商品ID');
  const ids=new Map();
  for(const sku of erpSkus){const id=String(sku.supplier_sku_id||sku.custom_miwa_supplier_sku_id||'');if(!id)continue;if(ids.has(id))throw Error('ERP供应商SKU关联不唯一');ids.set(id,sku.name);}
  const edits=[],seen=new Set(),verified=[];
  sheet.eachRow((row,n)=>{
    if(n===1)return;
    const id=String(row.getCell(idCol).value??'').trim();if(!id)return;
    if(seen.has(id))throw Error('本地供应商SKU重复，未修改表格');seen.add(id);
    if(offerId && String(row.getCell(offerCol).value??'').trim()!==offerId)throw Error('本地SKU商品ID不一致');
    const actual=ids.get(id);if(!actual)throw Error('ERP未返回供应商SKU映射：'+id);
    const cell=row.getCell(erpCol),current=String(cell.value??'').trim();
    if(current && current!==actual)throw Error('本地已有不同ERP SKU，未覆盖：'+id);
    verified.push({supplierSkuId:id,erpSku:actual});
    if(!current)edits.push({address:cell.address,value:actual,row:n});
  });
  if(!verified.length)throw Error('没有可核对的供应商SKU');
  if(!edits.length)return {bytes:Buffer.from(bytes),updated:0,mappings:verified};
  const zip=await JSZip.loadAsync(bytes);
  const book=await zip.file('xl/workbook.xml').async('string');
  const tags=book.match(/<sheet\b[^>]*\/?\s*>/g)||[];
  const tag=tags.find(t=>t.match(/\bname="([^"]*)"/)?.[1]===xmlEscape(sheet.name));
  const rid=tag?.match(/\br:id="([^"]+)"/)?.[1];
  const rel=await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const relation=(rel.match(/<Relationship\b[^>]*\/?\s*>/g)||[]).find(t=>t.match(/\bId="([^"]+)"/)?.[1]===rid);
  const target=relation?.match(/\bTarget="([^"]+)"/)?.[1];
  if(!target || target.includes('..'))throw Error('SKU工作表路径无法核实');
  const path=target.startsWith('/')?target.slice(1):'xl/'+target;
  let xml=await zip.file(path).async('string');
  for(const e of edits){
    const cell=new RegExp('<c\\b(?=[^>]*\\br="'+e.address+'")([^>]*?)(?:\\s*/>|>[\\s\\S]*?</c>)');
    const old=xml.match(cell),style=old?.[1].match(/\bs="[^"]*"/)?.[0]||'';
    const replacement=`<c r="${e.address}" ${style} t="inlineStr"><is><t>${xmlEscape(e.value)}</t></is></c>`;
    if(old)xml=xml.replace(cell,replacement);
    else {
      const row=new RegExp('(<row\\b(?=[^>]*\\br="'+e.row+'")[^>]*>)([\\s\\S]*?)(</row>)');
      if(!row.test(xml))throw Error('SKU工作表行无法核实');
      xml=xml.replace(row,(_,open,body,close)=>{
        const column=address=>[...address.match(/^[A-Z]+/)[0]].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
        const next=[...body.matchAll(/<c\b[^>]*\br="([A-Z]+\d+)"/g)].find(m=>column(m[1])>erpCol);
        const at=next?.index??body.length;
        return open+body.slice(0,at)+replacement+body.slice(at)+close;
      });
    }
  }
  zip.file(path,xml);return {bytes:await zip.generateAsync({type:'nodebuffer'}),updated:edits.length,mappings:verified};
}
