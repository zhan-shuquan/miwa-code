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
export async function quickWorkbook(data) {
  const w = new ExcelJS.Workbook(),
    s = w.addWorksheet("录入资料");
  s.addRow(["美和ERP字段", "人工填写"]);
  for (const [label, key] of Object.entries(QUICK_FIELDS))
    s.addRow([label, data[key] ?? ""]);
  // Exports never grant publishing or paid design consent.
  s.addRow(["是否美工", "禁止美工"]);
  s.addRow(["是否上架", "禁止上架"]);
  s.addRow(["特殊说明", "AIONE隔离验收资料，禁止自动发布与付费AI"]);
  s.columns = [{ width: 28 }, { width: 75 }];
  return w.xlsx.writeBuffer();
}
export async function skuWorkbook(data) {
  const w = new ExcelJS.Workbook(),
    s = w.addWorksheet("SKU");
  s.addRow([
    "商品ID",
    "SKU ID",
    "SKU名称",
    "原价（元）",
    "重量(g)",
    "SKU图链接",
  ]);
  const offer =
    String(data.sourceUrl || "").match(/\/offer\/(\d+)\.html/)?.[1] || "";
  for (const sku of data.skus || [])
    s.addRow([
      offer,
      sku.code,
      sku.spec,
      sku.cost ?? data.custom_单个采购价,
      sku.weight ?? data.custom_单个净重g,
      "",
    ]);
  return w.xlsx.writeBuffer();
}
