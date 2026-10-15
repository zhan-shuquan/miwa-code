import ExcelJS from "exceljs";

// Stable business-field contract. Cell addresses belong only in the V7 WPS adapter.
export const PRODUCT_ENTRY_VERSION = "1.0-candidate";
export const FIELD_KEYS = Object.freeze([
  ["localCode", "商品货号"], ["nameZh", "商品名称"], ["material", "商品材质"], ["productSpecifications", "商品规格"], ["purchaseUrl", "采购链接"],
  ["purchaseUnitCostCny", "采购单价(CNY)"], ["domesticFreightCny", "国内运费(CNY)"],
  ["setQuantity", "套装数量"], ["weightG", "重量(g)"], ["category", "商品分类"],
  ["brand", "所属品牌"], ["logisticsMethod", "物流方式"], ["packagingMethod", "包装方式"],
  ["sizeClass", "发货尺寸"], ["packagingMaterial", "日本包装物"], ["customPackagingCostCny", "定制中国包装成本(CNY)"],
  ["packageLengthCm", "发货长(cm)"], ["packageWidthCm", "发货宽(cm)"],
  ["packageHeightCm", "发货高(cm)"], ["salePriceJpy", "实际售价(JPY)"],
  ["spec1Name", "规格1名称"], ["spec1Values", "规格1值"],
  ["spec2Name", "规格2名称"], ["spec2Values", "规格2值"],
  ["spec3Name", "规格3名称"], ["spec3Values", "规格3值"],
  ["rakutenTitle", "楽天商品名"], ["rakutenCatchCopy", "キャッチコピー"],
  ["rakutenGenreId", "楽天ジャンルID"], ["rakutenNotice", "自由入力行1"],
  ["pcDescription", "PC用商品説明文"], ["spDescription", "スマートフォン用商品説明文"],
  ["salesDescription", "PC用販売説明文"], ["targetShopRef", "目标店铺"],
  ["materialComposition", "材质成分"], ["productModel", "规格型号"], ["barcode", "条形码"], ["remarks", "备注"],
  ["actualShipmentWeightG", "发货实际重量(g)"],
  ["sellingPointCore", "核心卖点"], ["sellingPointMaterial", "材质品质"],
  ["sellingPointExperience", "使用体验"], ["sellingPointDesign", "设计特点"],
  ["sellingPointScene", "适用场景"], ["sellingPointOther", "其他卖点"]
]);

export const SKU_EXPORT_HEADERS = ["商品货号", "SKU序号", "售价覆盖(JPY)", "库存覆盖", "采购价覆盖(CNY)", "重量覆盖(g)", "发货尺寸覆盖", "SKU图片文件", "规格组合身份"];
const NUMBERS = ["purchaseUnitCostCny", "domesticFreightCny", "setQuantity", "weightG", "actualShipmentWeightG", "customPackagingCostCny", "packageLengthCm", "packageWidthCm", "packageHeightCm", "salePriceJpy"];
const TEXTS = ["nameZh", "material", "productSpecifications", "purchaseUrl", "category", "brand", "logisticsMethod", "packagingMethod", "sizeClass", "packagingMaterial", "rakutenTitle", "rakutenCatchCopy", "rakutenGenreId", "rakutenNotice", "pcDescription", "spDescription", "salesDescription", "targetShopRef", "sourcePlatform", "originCountry", "rakutenStoreCategory", "materialComposition", "productModel", "barcode", "remarks", "sellingPointCore", "sellingPointMaterial", "sellingPointExperience", "sellingPointDesign", "sellingPointScene", "sellingPointOther"];
const BAD_EXCEL_ERRORS = ["#REF!", "#VALUE!", "#N/A", "#DIV/0!", "#NAME?", "#NUM!"];

function bad(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code; error.statusCode = statusCode;
  return error;
}
function str(v) { return String(v ?? "").trim(); }
function num(v, name) {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "boolean" || !Number.isFinite(Number(v))) throw bad("invalid_number", name + "必须是有效数字。");
  return Number(v);
}
function yes(v) {
  if (v === true || v === "是" || v === "true" || v === "TRUE" || v === 1) return true;
  if (v === false || v === "" || v === null || v === undefined || v === "否" || v === "false" || v === "FALSE" || v === 0) return false;
  throw bad("invalid_auto_publish", "自动上架只能选择「是」或「否」。");
}
function values(v) {
  const arr = Array.isArray(v) ? v : str(v).split(/[|,，、;\n；\/／]/);
  return [...new Set(arr.map(str).filter(Boolean))];
}
function cellText(c) {
  const value = c?.value;
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return value;
  if (value.error) return value.error;
  if (Array.isArray(value.richText)) return value.richText.map(part => part.text || "").join("");
  if (value.formula || value.sharedFormula) return value.result ?? "";
  return value.text ?? value.result ?? "";
}
function get(sheet, cell) { return sheet ? cellText(sheet.getCell(cell)) : ""; }

export function normalizeProductEntry(input = {}) {
  const p = {};
  p.localCode = str(input.localCode).toLowerCase();
  if (!/^[a-z][a-z0-9-]{2,63}$/.test(p.localCode)) throw bad("invalid_local_code", "商品货号须为3至64位英文、数字或短横线，以字母开头。");
  for (const key of TEXTS) p[key] = str(input[key]);
  for (const key of NUMBERS) p[key] = num(input[key], key);
  if (!p.sourcePlatform && p.purchaseUrl) {
    try {
      const host = new URL(p.purchaseUrl).hostname.toLowerCase();
      if (host === "1688.com" || host.endsWith(".1688.com")) p.sourcePlatform = "1688";
      else if (host === "taobao.com" || host.endsWith(".taobao.com")) p.sourcePlatform = "淘宝";
      else if (host === "tmall.com" || host.endsWith(".tmall.com")) p.sourcePlatform = "天猫";
      else if (host === "alibaba.com" || host.endsWith(".alibaba.com")) p.sourcePlatform = "Alibaba";
    } catch { /* Unknown supplier links remain unclassified. */ }
  }
  p.logisticsMethod ||= "空运大件（普货）";
  p.packagingMethod ||= "原装";
  // Catalog membership is checked against active shared settings inside the save transaction.
  if(p.packagingMethod.length>80)throw bad("invalid_packaging_method","包装方式名称过长");
  if(p.packagingMethod==="定制包装"&&(p.customPackagingCostCny===null||p.customPackagingCostCny<0))throw bad("custom_packaging_cost_required","定制包装需要实际中国包装成本");
  p.packagingMaterial ||= "A4信封";
  p.originCountry ||= "中国";
  p.setQuantity ??= 1;
  p.domesticFreightCny ??= 0;
  if (p.actualShipmentWeightG !== null && p.actualShipmentWeightG <= 0) throw bad("invalid_shipment_weight", "实际发货重量必须大于0，未称重请留空。");
  p.extraAttributes = {};
  if (input.extraAttributes && typeof input.extraAttributes === "object" && !Array.isArray(input.extraAttributes)) {
    for (const [key, value] of Object.entries(input.extraAttributes).slice(0, 80)) {
      const name = str(key).slice(0, 80);
      if (name) p.extraAttributes[name] = str(value).slice(0, 500);
    }
  }
  p.defaultStock = input.defaultStock === undefined || input.defaultStock === null || input.defaultStock === "" ? 1000 : num(input.defaultStock, "SKU默认库存");
  if (!Number.isSafeInteger(p.defaultStock) || p.defaultStock < 0) throw bad("invalid_stock", "默认库存必须是非负整数。");
  const rates = input.rates && typeof input.rates === "object" ? input.rates : {};
  p.rates = {};
  for (const key of ["coupon", "points", "ads", "other", "platform"]) {
    const raw = rates[key];
    const rate = raw === undefined || raw === null || raw === "" ? (key==="platform"?10:0) : num(raw, key+"费率");
    if (!(rate >= 0 && rate <= 100)) throw bad("invalid_rate", key+"费率必须在0至100之间。");
    p.rates[key] = rate;
  }
  const goals = input.profitTargets && typeof input.profitTargets === "object" ? input.profitTargets : {};
  p.profitTargets = {};
  for (const [key,def] of [["productMargin",40],["operationMargin",20]]) {
    const val = goals[key] === undefined || goals[key] === null || goals[key] === "" ? def : num(goals[key], key);
    if (!(val >= 0 && val < 100)) throw bad("invalid_margin_target", key+"利润目标必须在0至100%之间。");
    p.profitTargets[key] = val;
  }
  p.autoPublish = yes(input.autoPublish);
  if (!p.nameZh) throw bad("name_required", "商品名称不能为空。");
  if (p.salePriceJpy !== null && (!Number.isInteger(p.salePriceJpy) || p.salePriceJpy < 0)) throw bad("invalid_price", "实际售价必须是非负整数日元。");
  for (const key of ["purchaseUnitCostCny", "domesticFreightCny", "weightG", "customPackagingCostCny", "packageLengthCm", "packageWidthCm", "packageHeightCm"]) {
    if (p[key] !== null && p[key] < 0) throw bad("invalid_cost_or_size", key + "不能为负数。");
  }
  if (p.setQuantity !== null && (!Number.isInteger(p.setQuantity) || p.setQuantity < 1)) throw bad("invalid_set_quantity", "套装数量必须是正整数。");
  p.specs = [];
  if (Array.isArray(input.specs)) {
    for (const item of input.specs) if (str(item?.name)) p.specs.push({ name: str(item.name), values: values(item.values) });
  } else {
    for (let i = 1; i <= 3; i++) {
      const name = str(input["spec" + i + "Name"]);
      if (name) p.specs.push({ name, values: values(input["spec" + i + "Values"]) });
    }
  }
  if (p.specs.some(s => s.values.length === 0)) throw bad("missing_spec_values", "已填写的规格名称必须至少有一个规格值。");
  const overrides = Array.isArray(input.skuOverrides) ? input.skuOverrides : [];
  p.skuOverrides = overrides.map(o => {
    const index = Number(o.index);
    if (!Number.isSafeInteger(index) || index < 1) throw bad("invalid_sku_index", "SKU序号必须为正整数。");
    const priceJpy = num(o.priceJpy, "SKU售价");
    const stock = num(o.stock, "SKU库存");
    const purchaseCostCny = num(o.purchaseCostCny, "SKU采购价");
    const weightG = num(o.weightG, "SKU重量");
    if (priceJpy !== null && (!Number.isInteger(priceJpy) || priceJpy < 0)) throw bad("invalid_sku_price", "SKU售价必须是非负整数。");
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) throw bad("invalid_sku_stock", "SKU库存必须是非负整数。");
    if (purchaseCostCny !== null && purchaseCostCny < 0) throw bad("invalid_sku_cost", "SKU采购价不能为负数。");
    if (weightG !== null && weightG < 0) throw bad("invalid_sku_weight", "SKU重量不能为负数。");
    return { index, identity: str(o.identity), priceJpy, stock, purchaseCostCny, weightG, sizeClass: str(o.sizeClass), imageFile: str(o.imageFile) };
  });
  if (new Set(p.skuOverrides.map(x => x.index)).size !== p.skuOverrides.length) throw bad("duplicate_sku_override", "SKU覆盖行的序号重复。");
  const sku = buildSkuEntries(p);
  if (p.skuOverrides.some(o => o.index > sku.length)) throw bad("sku_override_out_of_range", "SKU覆盖序号超过实际规格组合数量。");
  return p;
}

export function buildSkuEntries(p) {
  let combinations = [{}];
  for (const spec of p.specs || []) {
    combinations = combinations.flatMap(item => spec.values.map(v => ({ ...item, [spec.name]: v })));
    // SKU quantity is not a catalog-entry business limit. Channel rules are checked at publication.
  }
  return combinations.map((attributes, i) => {
    const identity = Object.entries(attributes).map(([key,value])=>key+"="+value).join("|") || "default";
    const override = (p.skuOverrides || []).find(o => o.identity === identity) || (p.skuOverrides || []).find(o => !o.identity && o.index === i + 1) || {};
    return {
      index: i + 1, identity, attributes, priceJpy: p.salePriceJpy ?? null,
      stock: override.stock ?? p.defaultStock ?? 1000, purchaseCostCny: override.purchaseCostCny ?? p.purchaseUnitCostCny ?? null,
      weightG: override.weightG ?? p.weightG ?? null,
      sizeClass: override.sizeClass || p.sizeClass || "",
      imageFile: override.imageFile || (p.localCode + "_c" + String(i + 1).padStart(2, "0") + ".jpg")
    };
  });
}

export function readinessWarnings(p) {
  const out = [];
  if (!p.targetShopRef) out.push("尚未核实目标RMS店铺");
  if (!p.rakutenGenreId) out.push("尚未核实乐天末级ジャンルID和必填属性");
  if (!p.rakutenTitle || !p.rakutenCatchCopy) out.push("乐天标题或キャッチコピー不完整");
  if (!p.pcDescription || !p.spDescription || !p.salesDescription) out.push("PC/手机/销售说明文尚未分别确认");
  out.push("商品图片和R-Cabinet发布证据尚待关联核验");
  return out;
}

function fromWps(workbook, filename) {
  const ws = workbook.getWorksheet("商品信息");
  if (!ws) throw bad("invalid_wps", "缺少商品信息工作表。");
  const input = {
    localCode: get(ws, "C3"), nameZh: get(ws, "C4"), purchaseUrl: get(ws, "C5"),
    purchaseUnitCostCny: get(ws, "C6"), domesticFreightCny: get(ws, "C7"),
    setQuantity: get(ws, "C8"), weightG: get(ws, "C9"), category: get(ws, "C10"),
    brand: get(ws, "C11"), logisticsMethod: get(ws, "C13"), packagingMethod: get(ws, "C14"),
    sizeClass: get(ws, "C15"), packagingMaterial: get(ws, "C16"),
    packageLengthCm: get(ws, "C17"), packageWidthCm: get(ws, "C18"), packageHeightCm: get(ws, "C19"),
    salePriceJpy: get(ws, "C38"), rakutenTitle: get(ws, "I3"),
    rakutenCatchCopy: get(ws, "I4"), rakutenGenreId: get(ws, "I5"),
    rakutenNotice: get(ws, "I13"), autoPublish: get(ws, "I30"),
    specs: [22, 23, 24].map(row => ({ name: get(ws, "I" + row), values: Array.from({length: 10}, (_, n) => get(ws, ws.getCell(row, 10 + n).address)).filter(v => str(v) !== "") }))
  };
  const skuSheet = workbook.getWorksheet("sku生成器");
  input.skuOverrides = [];
  for (let row = 9; row <= 20; row++) {
    if (!skuSheet) break;
    const o = {
      index: row - 8, priceJpy: get(skuSheet, "L" + row), stock: get(skuSheet, "AD" + row),
      purchaseCostCny: get(skuSheet, "M" + row), weightG: get(skuSheet, "N" + row),
      sizeClass: get(skuSheet, "O" + row)
    };
    if (Object.values(o).some((v, i) => i > 0 && str(v) !== "")) input.skuOverrides.push(o);
  }
  const warnings = ["WPS导入仅建立AIONE草稿，不会自动发布到外部平台。旧「自动上架」单元格只作为历史兼容读取。"];
  if (skuSheet) {
    let invalidFormulas = 0;
    skuSheet.eachRow(row => row.eachCell(c => {
      if (typeof c.value === "object" && c.value && str(c.value.formula).includes("#REF!")) invalidFormulas++;
    }));
    if (invalidFormulas) warnings.push("旧SKU生成器有" + invalidFormulas + "处损坏引用；SKU以原始规格值在AIONE重新组合");
  }
  // Stock defaults to 1000 for each generated SKU unless overridden.
  if (str(get(ws, "C24")) === "0") warnings.push("中国包装成本单元格为0，请与共享参数核对");
  return { items: [normalizeProductEntry(input)], sourceKind: "wps-single", filename, warnings };
}

function batchField(obj, n, key) { obj[key] = n === null || n === undefined ? "" : n; }
function fromBatch(workbook, filename) {
  const ws = workbook.getWorksheet("商品一览");
  if (!ws) throw bad("unknown_excel_format", "文件必须包含「商品信息」（WPS单品）或「商品一览」（批量导入）工作表。");
  const columns = new Map();
  ws.getRow(1).eachCell((cell, col) => columns.set(str(cellText(cell)), col));
  for (const [, label] of FIELD_KEYS) if (!columns.has(label)) throw bad("missing_batch_header", "批量表缺少列：" + label);
  const overrideRows = new Map();
  const skuSheet = workbook.getWorksheet("SKU明细");
  if (skuSheet) {
    for (let rowNo = 2; rowNo <= skuSheet.rowCount; rowNo++) {
      const row = skuSheet.getRow(rowNo);
      const code = str(cellText(row.getCell(1))).toLowerCase();
      if (!code) continue;
      const o = {
        index: cellText(row.getCell(2)), priceJpy: cellText(row.getCell(3)),
        stock: cellText(row.getCell(4)), purchaseCostCny: cellText(row.getCell(5)),
        weightG: cellText(row.getCell(6)), sizeClass: cellText(row.getCell(7)), imageFile: cellText(row.getCell(8)), identity: cellText(row.getCell(9))
      };
      if (!overrideRows.has(code)) overrideRows.set(code, []);
      overrideRows.get(code).push(o);
    }
  }
  const items = [];
  for (let rowNo = 2; rowNo <= ws.rowCount; rowNo++) {
    const row = ws.getRow(rowNo); const raw = {};
    for (const [key, label] of FIELD_KEYS) batchField(raw, cellText(row.getCell(columns.get(label))), key);
    if (!str(raw.localCode) && !str(raw.nameZh)) continue;
    raw.skuOverrides = overrideRows.get(str(raw.localCode).toLowerCase()) || [];
    const extended = {
      defaultStock:"SKU默认库存", sourcePlatform:"来源", originCountry:"原产国",
      rakutenStoreCategory:"乐天店铺分类", rates:"运营费率JSON", profitTargets:"利润目标JSON", specs:"完整规格JSON"
    };
    for (const [key,header] of Object.entries(extended)) {
      const col=columns.get(header); if(!col)continue;
      const rawCell=cellText(row.getCell(col));
      if(["rates","profitTargets","specs"].includes(key) && str(rawCell)) {
        try {raw[key]=JSON.parse(rawCell);}catch {throw bad("invalid_json_field","第"+rowNo+"行"+header+"不是有效JSON。");}
      }else if(str(rawCell))raw[key]=rawCell;
    }
    try { items.push(normalizeProductEntry(raw)); }
    catch (e) { throw bad("batch_row_invalid", "批量导入第" + rowNo + "行：" + e.message); }
    if (items.length > 200) throw bad("batch_limit", "一次批量导入最多200件商品。");
  }
  if (new Set(items.map(x => x.localCode)).size !== items.length) throw bad("duplicate_local_code", "批量Excel里有重复货号。");
  return { items, sourceKind: "aione-batch", filename, warnings: [] };
}

export async function parseProductEntryWorkbook(bytes, filename = "") {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 10 * 1024 * 1024) throw bad("invalid_excel_size", "仅支持不超过10MB的xlsx文件。");
  if (!str(filename).toLowerCase().endsWith(".xlsx")) throw bad("not_xlsx", "请上传.xlsx文件。");
  const book = new ExcelJS.Workbook();
  try { await book.xlsx.load(bytes); }
  catch (e) { throw bad("invalid_xlsx", "文件无法解析为有效的xlsx。"); }
  return book.getWorksheet("商品信息") ? fromWps(book, filename) : fromBatch(book, filename);
}

export async function exportProductEntries(items) {
  const book = new ExcelJS.Workbook();
  book.creator = "AIONE";
  const main = book.addWorksheet("商品一览");
  const extras = [["extraAttributes","其他属性JSON"],["defaultStock","SKU默认库存"],["sourcePlatform","来源"],["originCountry","原产国"],["rakutenStoreCategory","乐天店铺分类"],["rates","运营费率JSON"],["profitTargets","利润目标JSON"],["specs","完整规格JSON"]];
  main.addRow([...FIELD_KEYS.map(pair => pair[1]),...extras.map(pair=>pair[1])]);
  const sku = book.addWorksheet("SKU明细");
  sku.addRow(SKU_EXPORT_HEADERS);
  for (const p of items) {
    const row = {};
    for (const [key] of FIELD_KEYS) {
      const match = /^spec([123])(Name|Values)$/.exec(key);
      if (match) {
        const spec = (p.specs || [])[Number(match[1]) - 1] || {};
        row[key] = match[2] === "Name" ? (spec.name || "") : (spec.values || []).join("|");
      } else row[key] = p[key] ?? "";
    }
    main.addRow([...FIELD_KEYS.map(pair => row[pair[0]]),...extras.map(([key])=>["rates","profitTargets","specs","extraAttributes"].includes(key)?JSON.stringify(p[key]||{}):(p[key]??""))]);
    for (const o of p.skuOverrides || []) sku.addRow([p.localCode, o.index, o.priceJpy ?? "", o.stock ?? "", o.purchaseCostCny ?? "", o.weightG ?? "", o.sizeClass || "", o.imageFile || "", o.identity || ""]);
  }
  for (const ws of [main, sku]) {
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF28785C" } };
    ws.getRow(1).height = 23;
    ws.columns.forEach(col => { col.width = 20; });
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  }
  main.getColumn(2).width = 38;
  return Buffer.from(await book.xlsx.writeBuffer());
}
