import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {exportCatalogWorkbook,parseCatalogWorkbook} from '../src/services/settings-catalog-workbook.js';
import {catalogRows} from '../../js/config/settings-catalog.js';
import {INITIAL_PARAMETERS} from '../../js/config/shared-parameter-defaults.js';
for(const kind of ['chinaPackaging','japanPackaging','logistics']){
 const rows=catalogRows(INITIAL_PARAMETERS,kind);
 const bytes=await exportCatalogWorkbook(kind,rows);
 assert.equal(bytes.subarray(0,2).toString(),'PK');
 const parsed=await parseCatalogWorkbook(kind,bytes);
 assert.equal(parsed.rows.length,rows.length);assert.deepEqual(parsed.errors,[]);
 assert.equal(parsed.rows[0].key,rows[0].key);assert.deepEqual(parsed.rows[0].value,rows[0].value);
 const book=new ExcelJS.Workbook();await book.xlsx.load(await exportCatalogWorkbook(kind,[],{template:true}));
 const sheet=book.getWorksheet('设置资料');
 const cells=kind==='logistics'?['ci_shipping','测试物流','日本入仓','按kg',12,null,null,null,null,1,'启用','是']:['测试包装',12,1,'启用','是'];
 sheet.getRow(2).values=cells;
 const preview=await parseCatalogWorkbook(kind,Buffer.from(await book.xlsx.writeBuffer()));assert.equal(preview.rows[0].isDefault,true);assert.equal(preview.rows[0].value.perKgCny??preview.rows[0].value,12);
 const wrong=kind==='chinaPackaging'?'japanPackaging':'chinaPackaging';await assert.rejects(parseCatalogWorkbook(wrong,bytes),/分类不匹配/);
}
const bytes=await exportCatalogWorkbook('japanPackaging',[{key:'测试',value:1,sortOrder:1,enabled:true,isDefault:false}]);
async function change(fn){const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);fn(book.getWorksheet('设置资料'));return parseCatalogWorkbook('japanPackaging',Buffer.from(await book.xlsx.writeBuffer()));}
assert.match((await change(s=>s.getCell('B2').value=-1)).errors[0].message,/非负/);
assert.match((await change(s=>s.getCell('B2').value={formula:'1+1',result:2})).errors[0].message,/不支持公式/);
assert.equal((await change(s=>{s.getRow(3).values=['测试',2,2,'启用','否'];})).errors[0].row,3);
assert.match((await change(s=>{s.getCell('E2').value='是';s.getRow(3).values=['测试2',2,2,'启用','是'];})).errors[0].message,/一个默认/);
assert.match((await change(s=>s.getCell('D2').value='错误状态')).errors[0].message,/状态/);
assert.match((await change(s=>{s.getCell('D2').value='停用';s.getCell('E2').value='是';})).errors[0].message,/必须启用/);
await assert.rejects(parseCatalogWorkbook('japanPackaging',Buffer.from('not an excel')),/无法读取/);
await assert.rejects(parseCatalogWorkbook('japanPackaging',Buffer.alloc(2*1024*1024+1)),/2MB/);
await assert.rejects(exportCatalogWorkbook('japanPackaging',Array.from({length:501},(_,i)=>({key:'pack'+i,value:1,sortOrder:i,enabled:true}))),/500/);
console.log('PASS Excel catalog template/export roundtrips, currencies, logistics modes, defaults, row-numbered errors, duplicates, formulas, wrong template and upload limits');
