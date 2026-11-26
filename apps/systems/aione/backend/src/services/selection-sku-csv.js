import { createHash } from 'node:crypto';

const fail = (message) => { const e = new Error(message); e.statusCode = 400; throw e; };
export function csvRows(text) {
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else if (quoted || !value) quoted = !quoted;
      else fail('CSV引号格式无效');
    } else if (!quoted && (c === ',' || c === '\n' || c === '\r')) {
      row.push(value); value = '';
      if (c !== ',') { if (row.some(Boolean)) rows.push(row); row = []; if (c === '\r' && text[i+1] === '\n') i++; }
    } else value += c;
  }
  if (quoted) fail('CSV引号未闭合');
  row.push(value); if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function parseSupplierCSV(bytes, sourceUrl, filename = 'sku.csv') {
  if (!bytes.length || bytes.length > 2000000) fail('CSV文件须为1字节至2MB');
  let text, encoding;
  for (const candidate of ['utf-8', 'gb18030', 'shift_jis', 'utf-16le']) {
    try {
      const decoded = new TextDecoder(candidate, { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
      if (decoded.split(/\r?\n/)[0].includes('商品ID') && decoded.includes('SKU名称')) {
        text = decoded; encoding = candidate; break;
      }
    } catch { /* Try the next explicitly supported encoding. */ }
  }
  if (!text) fail('无法识别1688 CSV编码或表头，请导出UTF-8文件');
  const rows = csvRows(text), headers = rows.shift().map(x => x.trim());
  const required = ['商品ID', 'SKU ID', 'SKU名称', '原价（元）'];
  if (required.some(k => !headers.includes(k)) || headers.length !== 8) fail('CSV不符合已支持的1688八列表头');
  const product = String(sourceUrl || '').match(/detail\.1688\.com\/offer\/(\d+)\.html/)?.[1];
  if (!product) fail('请先填写有效1688采购链接');
  if (!rows.length || rows.length > 500) fail('SKU须为1至500行');
  const seen = new Map();
  const num = (value, label) => { if (value === '') return null; const n = Number(value); if (!Number.isFinite(n) || n < 0) fail(label + '无效'); return n; };
  for (const row of rows) {
    if (row.length !== headers.length) fail('CSV列数不一致');
    if (row[1].trim() !== product) fail('供应商商品ID与采购链接不一致');
    const id = row[2].trim(); if (!/^\d+$/.test(id)) fail('供应商SKU ID无效');
    const originalName = row[3].trim();
    let image; try { image = new URL(row[4]); } catch { fail('SKU图片链接无效'); }
    if (!['https:', 'http:'].includes(image.protocol)) fail('SKU图片链接无效');
    const parts = originalName.split('+');
    const sku = { code: id, supplierSkuId: id, supplierProductId: product,
      originalName, spec: originalName, selected: true, confirmed: false,
      supplierTitle: row[0], supplierImageUrl: image.href,
      supplierCost: num(row[5], '供应商原价'), supplierCalculatedCost: num(row[6], '供应商计算价'),
      supplierStock: num(row[7], '供应商库存'),
      attributeValues: {}, sourceParts: parts,
      referenceWeight: Number(originalName.match(/(\d+(?:\.\d+)?)\s*g\b/i)?.[1]) || null,
      warnings: /[?\uFFFD]/.test(originalName) ? ['原始规格含缺失字符，请人工修正并确认'] : [] };
    if (seen.has(id) && JSON.stringify(seen.get(id)) !== JSON.stringify(sku)) fail('同一供应商SKU ID存在冲突行');
    seen.set(id, sku);
  }
  return { skus: [...seen.values()], source: { filename: String(filename).slice(0,200), encoding,
    sha256: createHash('sha256').update(bytes).digest('hex'), base64: bytes.toString('base64'),
    headers, productId: product }, warnings: /[?\uFFFD]/.test(text) ? ['文件原文含缺失字符；切换编码无法恢复，需人工核实'] : [] };
}

