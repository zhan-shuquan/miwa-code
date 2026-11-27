import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,readdir,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import ExcelJS from '../backend/node_modules/exceljs/excel.js';
import { executeProductFiles } from '../backend/scripts/product-file-command.mjs';
const root=await mkdtemp(join(tmpdir(),'miwa-command-test-'));
const previous=process.env.AIONE_PRODUCT_FILE_STATE;
try {
  await mkdir(join(root,'employee'));
  process.env.AIONE_PRODUCT_FILE_STATE=join(root,'private-cache');
  const w=new ExcelJS.Workbook(),s=w.addWorksheet('录入资料');
  for(const row of [['美和ERP字段','人工填写'],['采购URL','OLD'],['单个采购价（CNY）',99],['是否上架','可以上架'],['是否美工','可以美工']])s.addRow(row);
  await writeFile(join(root,'template.xlsx'),Buffer.from(await w.xlsx.writeBuffer()));
  const payload={selectionId:'isolated:command',status:'confirmed',data:{item_code:'tst001',skus:[{supplierSkuId:'123',supplierImageUrl:'https://example.com/image.jpg',selected:true}]},assets:[]};
  const command={id:randomUUID(),payload};
  let downloads=0,acknowledgements=0;
  const erp=async(_name,input)=>{
    if(input.action==='acknowledge'){acknowledgements++;return {status:'succeeded',result:{verified:true}};}
    return {status:'succeeded',result:{root,prefixDirectories:{tst:'employee'},prefix:'tst',template:'template.xlsx',reservationVerified:true}};
  };
  const api=async()=>{downloads++;return {base64:Buffer.from('isolated image bytes').toString('base64')};};
  const first=await executeProductFiles(command,{erp,api});
  assert.equal(first.status,'succeeded');
  const before=await readFile(join(first.result.folder,'tst001.xlsx'));
  const second=await executeProductFiles(command,{erp,api});
  assert.equal(second.status,'succeeded');
  assert.equal(downloads,1);
  assert.equal(acknowledgements,2);
  assert.deepEqual(await readFile(join(first.result.folder,'tst001.xlsx')),before);
  assert.deepEqual((await readdir(first.result.folder)).sort(),['123.jpg','SKU.xlsx','aione-manifest.json','tst001.xlsx'].sort());
  console.log('PASS: complete flat bundle, supplier image persistence, repeat command uses identical cached XLSX bytes, ERP readback acknowledgement');
} finally {
  if(previous===undefined)delete process.env.AIONE_PRODUCT_FILE_STATE;else process.env.AIONE_PRODUCT_FILE_STATE=previous;
  await rm(root,{recursive:true,force:true});
}
