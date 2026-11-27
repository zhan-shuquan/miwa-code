import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveProductFiles, digest } from '../backend/scripts/product-file-store.mjs';
import { quickWorkbook, skuWorkbook } from '../backend/src/services/selection-file-contract.js';
import ExcelJS from '../backend/node_modules/exceljs/excel.js';

const root = await mkdtemp(join(tmpdir(), 'miwa-file-test-'));
try {
  await mkdir(join(root, 'configured-employee'));
  const config = { root, prefixDirectories: { tst: 'configured-employee' } };
  const bytes = Buffer.from('confirmed product source');
  const request = { selectionId: 'isolated:test', code: 'tst001', prefix: 'tst', status: 'confirmed', reservationVerified: true,
    files: [{ name: 'supplier-123.jpg', role: 'reference', bytes, sha256: digest(bytes) }] };
  await assert.rejects(saveProductFiles(config, { ...request, status: 'draft' }), /已确认/);
  assert.deepEqual(await readdir(join(root, 'configured-employee')), []);
  await assert.rejects(saveProductFiles(config, { ...request, prefix: 'missing' }), /前缀/);
  await assert.rejects(saveProductFiles(config, { ...request, files: [{ ...request.files[0], name: 'tst001_c01.jpg' }] }), /可发布/);
  const concurrent = await Promise.all([saveProductFiles(config, request), saveProductFiles(config, request)]);
  assert.deepEqual(concurrent.map(r => r.state), ['saved', 'saved']);
  assert.equal((await readdir(concurrent[0].folder)).length, 1);
  const changed = Buffer.from('different');
  const conflict = await saveProductFiles(config, { ...request, files: [{ ...request.files[0], bytes: changed, sha256: digest(changed) }] });
  assert.equal(conflict.state, 'conflict');
  assert.deepEqual(await readFile(join(conflict.folder, 'supplier-123.jpg')), bytes);
  assert.equal(conflict.wps, 'unverified');
  assert.equal(conflict.allowPublish, false);

  const template = new ExcelJS.Workbook();
  const sheet = template.addWorksheet('录入资料');
  sheet.addRow(['美和ERP字段', '人工填写', '默认值']);
  sheet.addRow(['采购URL', 'OLD PRODUCT', '']);
  sheet.addRow(['单个采购价（CNY）', 123, '']);
  sheet.addRow(['中国国内运费（CNY）', 9, '']);
  sheet.addRow(['是否上架', '可以上架', '']);
  sheet.addRow(['是否美工', '可以美工', '']);
  const rendered = new ExcelJS.Workbook();
  await rendered.xlsx.load(await quickWorkbook({ custom_中国国内运费: 0 }, await template.xlsx.writeBuffer()));
  assert.equal(rendered.worksheets[0].getCell('B2').value, '');
  assert.equal(rendered.worksheets[0].getCell('B3').value, '');
  assert.equal(rendered.worksheets[0].getCell('B4').value, 0);
  assert.equal(rendered.worksheets[0].getCell('B5').value, '禁止上架');
  assert.equal(rendered.worksheets[0].getCell('B6').value, '禁止美工');
  const sku = new ExcelJS.Workbook();
  await sku.xlsx.load(await skuWorkbook({ skus: [
    { code: 'draft-row', supplierSkuId: '12345678901234567', supplierImageUrl: 'https://example.com/a.jpg', spec: '真实规格', cost: 0 },
    { code: 'excluded', supplierSkuId: '999', selected: false },
  ] }));
  assert.equal(sku.worksheets[0].rowCount, 2);
  assert.equal(sku.worksheets[0].getCell('B2').value, '12345678901234567');
  assert.equal(sku.worksheets[0].getCell('D2').value, 0);
  assert.equal(sku.worksheets[0].getCell('F2').value, 'https://example.com/a.jpg');
  console.log('PASS: draft exclusion, concurrent idempotency, conflict preservation, no publish names, template clearing, zero preservation, supplier ID/image and excluded SKU export');
} finally { await rm(root, { recursive: true, force: true }); }
