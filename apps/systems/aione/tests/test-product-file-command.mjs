import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,readdir,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
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
  let downloads=0,acknowledgements=0,erpSkus=[];
  const erp=async(_name,input)=>{
    if(input.action==='acknowledge'){acknowledgements++;return {status:'succeeded',result:{verified:true}};}
    return {status:'succeeded',result:{root,prefixDirectories:{tst:'employee'},prefix:'tst',template:'template.xlsx',reservationVerified:true,erpSkus}};
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
  const updated=await executeProductFiles({id:randomUUID(),payload:{...payload,version:2,data:{...payload.data,custom_单个采购价:12}}},{erp,api});
  assert.equal(updated.status,'succeeded');
  assert.equal(updated.result.files.find(f=>f.name==='tst001.xlsx').state,'updated');
  assert.deepEqual(await readFile(updated.result.files.find(f=>f.name==='tst001.xlsx').backup),before);
  const userEdit=Buffer.from('external edit must survive');
  await writeFile(join(first.result.folder,'tst001.xlsx'),userEdit);
  const conflicted=await executeProductFiles({id:randomUUID(),payload:{...payload,version:3,data:{...payload.data,custom_单个采购价:20}}},{erp,api});
  assert.equal(conflicted.status,'failed');
  assert.equal(conflicted.result.state,'conflict');
  assert.deepEqual(await readFile(join(first.result.folder,'tst001.xlsx')),userEdit);
  const skuPath=join(first.result.folder,'SKU.xlsx');
  const manualBook=new ExcelJS.Workbook();await manualBook.xlsx.load(await readFile(skuPath));
  manualBook.worksheets[0].getCell('H2').value='员工保留内容';
  await writeFile(skuPath,Buffer.from(await manualBook.xlsx.writeBuffer()));
  const manualBytes=await readFile(skuPath);
  erpSkus=[{supplier_sku_id:'123',name:'tst001_actual77'}];
  const formalCommand={id:randomUUID(),payload:{...payload,status:'submitted',version:4}};
  if(process.platform==='win32') {
    const locker=spawn('powershell.exe',['-NoProfile','-Command',"$f=[IO.File]::Open($env:AIONE_TEST_LOCK_FILE,'Open','ReadWrite','None'); try { [Console]::WriteLine('LOCKED'); [Console]::ReadLine() | Out-Null } finally { $f.Dispose() }"],{env:{...process.env,AIONE_TEST_LOCK_FILE:skuPath},stdio:['pipe','pipe','pipe'],windowsHide:true});
    const exited=new Promise((resolve,reject)=>{locker.on('error',reject);locker.on('exit',resolve);});
    try {
      await new Promise((resolve,reject)=>{let output='';locker.stdout.on('data',chunk=>{output+=chunk;if(output.includes('LOCKED'))resolve();});locker.on('error',reject);locker.on('exit',()=>reject(new Error('File lock helper exited early')));});
      await assert.rejects(executeProductFiles(formalCommand,{erp,api}),/EBUSY|EPERM|EACCES/);
    } finally { locker.stdin.end('\n');await exited; }
    assert.deepEqual(await readFile(skuPath),manualBytes);
  }
  const backfilled=await executeProductFiles(formalCommand,{erp,api});
  assert.equal(backfilled.status,'succeeded');assert.equal(backfilled.result.skuCellsUpdated,1);
  const filledBook=new ExcelJS.Workbook();await filledBook.xlsx.load(await readFile(skuPath));
  assert.equal(filledBook.worksheets[0].getCell('G2').value,'tst001_actual77');
  assert.equal(filledBook.worksheets[0].getCell('H2').value,'员工保留内容');
  assert.deepEqual(await readFile(backfilled.result.files.find(f=>f.name==='SKU.xlsx').backup),manualBytes);
  assert.deepEqual(await readFile(join(first.result.folder,'tst001.xlsx')),userEdit);
  assert.equal((await executeProductFiles(formalCommand,{erp,api})).result.skuCellsUpdated,0);
  console.log('PASS: flat bundle, supplier images, byte-identical retry, ERP acknowledgement, managed update backup, external edits preserved, Windows file lock followed by successful retry');
} finally {
  if(previous===undefined)delete process.env.AIONE_PRODUCT_FILE_STATE;else process.env.AIONE_PRODUCT_FILE_STATE=previous;
  await rm(root,{recursive:true,force:true});
}
