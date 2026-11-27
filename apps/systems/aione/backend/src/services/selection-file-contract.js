import ExcelJS from "exceljs";
// Labels confirmed against the current 快速数据录入.xlsx and ERP product_source.inputs.
export const QUICK_FIELDS = {
  采购URL: "sourceUrl",
  "商品长标题（中文）": "custom_商品长标题中文",
  "单个采购价（CNY）": "custom_单个采购价",
  国际物流方式: "custom_国际物流方式",
  发货尺寸: "custom_日本发货尺寸",
  "单个净重（g）": "custom_单个净重g",
  日本包装物: "custom_日本包装物",
  中国包装方式: "custom_中国包装方式",
  计量单位: "stock_uom",
  套装数量: "custom_套装数量",
  商品分类: "item_group",
  主要材质: "custom_主要材质1",
  "中国国内运费（CNY）": "custom_中国国内运费",
};
export function readQuickWorkbook(workbook, filename) {
  const data = {};
  let found = false;
  for (const sheet of workbook.worksheets) {
    let keyCol, valueCol;
    sheet.eachRow((row) => {
      const cells = row.values;
      if (cells.some((v) => v === "美和ERP字段" || v === "ERP字段")) {
        keyCol = cells.findIndex((v) => v === "美和ERP字段" || v === "ERP字段");
        valueCol = cells.findIndex(
          (v) => typeof v === "string" && /^人工填写|^人工选择/.test(v),
        );
        found = valueCol > 0;
        return;
      }
      if (!keyCol || !valueCol) return;
      const key = QUICK_FIELDS[cells[keyCol]];
      if (!key) return;
      const value = cells[valueCol];
      if (value != null && typeof value === "object")
        throw Error("快速录入表不接受公式或复杂单元格");
      if (data[key] != null && data[key] !== value)
        throw Error("快速录入表存在冲突字段");
      if (value != null) data[key] = value;
    });
  }
  if (!found) return null;
  const code = String(filename || "").replace(/\.xlsx$/i, "");
  if (/^[a-z]{2,8}\d{2,6}$/.test(code)) data.item_code = code;
  return data;
}
export async function quickWorkbook(data, template) {
  const w = new ExcelJS.Workbook();
  const values = Object.fromEntries(Object.entries(QUICK_FIELDS).map(([label, key]) => [label, data[key] ?? ""]));
  // Exports never grant publishing or paid design consent.
  Object.assign(values, { 是否美工: "禁止美工", 是否上架: "禁止上架", 特殊说明: data.custom_miwa_selection_notes ?? "" });
  if (template) {
    await w.xlsx.load(template);
    let matched = 0;
    const applied = new Set();
    for (const s of w.worksheets) {
      if (s.state !== 'visible') continue;
      let keyCol, valueCol;
      s.eachRow(row => {
        const cells = row.values;
        const header = cells.findIndex(v => v === '美和ERP字段' || v === 'ERP字段');
        if (header > 0) {
          keyCol = header;
          valueCol = cells.findIndex(v => typeof v === 'string' && /^人工填写|^人工选择/.test(v));
          if (valueCol < 1) throw Error('商品资料模板缺少人工填写列');
          return;
        }
        if (!keyCol || !valueCol) return;
        const label = cells[keyCol];
        if (!Object.hasOwn(values, label)) return;
        // Never inherit product examples or formulas from the shared template.
        row.getCell(valueCol).value = values[label];
        applied.add(label);
        matched++;
      });
    }
    if (matched < 3) throw Error('未识别现有商品资料模板，未生成替代模板');
    if (!applied.has('是否上架') || !applied.has('是否美工')) throw Error('商品资料模板缺少自动化授权控制字段');
  } else {
    const s = w.addWorksheet('录入资料');
    s.addRow(['美和ERP字段', '人工填写']);
    for (const entry of Object.entries(values)) s.addRow(entry);
    s.columns = [{ width: 28 }, { width: 75 }];
  }
  return w.xlsx.writeBuffer();
}
export async function skuWorkbook(data, erpSkus = []) {
  const w = new ExcelJS.Workbook(),
    s = w.addWorksheet("SKU");
  s.addRow([
    "商品ID",
    "SKU ID",
    "SKU名称",
    "原价（元）",
    "重量(g)",
    "SKU图链接",
    "ERP SKU",
  ]);
  const offer =
    String(data.sourceUrl || "").match(/\/offer\/(\d+)\.html/)?.[1] || "";
  for (const sku of (data.skus || []).filter(s => s.selected !== false)) {
    const actual = erpSkus.filter(s => sku.supplierSkuId ?
      (s.supplier_sku_id || s.custom_miwa_supplier_sku_id) === sku.supplierSkuId :
      JSON.stringify(Object.entries(s.attributes || s.attributeValues || {}).sort()) === JSON.stringify(Object.entries(sku.attributeValues || {}).sort()));
    if (actual.length > 1) throw Error('ERP SKU关联不唯一');
    s.addRow([
      offer,
      sku.supplierSkuId || "",
      sku.spec,
      sku.cost ?? data.custom_单个采购价,
      sku.weight ?? data.custom_单个净重g,
      sku.supplierImageUrl || "",
      actual[0]?.name || "",
    ]);
  }
  return w.xlsx.writeBuffer();
}
