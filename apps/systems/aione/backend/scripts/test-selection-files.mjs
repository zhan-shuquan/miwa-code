import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { QUICK_FIELDS } from '../src/services/selection-file-contract.js';
const origin = "http://127.0.0.1:8765",
  base = "/api/v1/selection-workspace";
const login = await fetch(origin + "/__preview/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ account: "employeeA" }),
});
const Cookie = login.headers.get("set-cookie").split(";")[0];
let checks = 0;
async function api(path, body) {
  const r = await fetch(origin + base + path, {
    method: body ? "POST" : "GET",
    headers: { Cookie, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const v = await r.json();
  assert(r.ok, JSON.stringify(v));
  checks++;
  return v;
}
const boot = await api('/bootstrap');
// The employee's mutable workbook is not a test fixture. Exercise the same
// public column/label contract with explicit values and current ERP defaults.
const defaults = Object.fromEntries(boot.fields.filter(f=>f.default!=null&&f.default!=='').map(f=>[f.id,f.default]));
const fixtureData = {...defaults,custom_商品长标题中文:'瑜伽袜测试样本',custom_单个采购价:4.7,custom_单个净重g:68};
const fixture = new ExcelJS.Workbook(), fixtureSheet=fixture.addWorksheet('录入资料');
fixtureSheet.addRow(['美和ERP字段','人工填写']);
for(const [label,key] of Object.entries(QUICK_FIELDS)) fixtureSheet.addRow([label,fixtureData[key]??'']);
fixtureSheet.addRow(['是否上架','禁止上架']);fixtureSheet.addRow(['是否美工','禁止美工']);
const template = Buffer.from(await fixture.xlsx.writeBuffer());
const preview = await api("/import", {
  filename: "快速数据录入.xlsx",
  base64: template.toString("base64"),
});
assert.equal(preview.errors.length, 0);
assert.equal(preview.items[0].data.custom_单个采购价, 4.7);
assert.equal(preview.items[0].data.custom_单个净重g, 68);
assert(preview.items[0].data.custom_商品长标题中文.includes("瑜伽袜"));
const identification = await api("/identify", { title: "厨房水槽沥水架" });
assert.equal(identification.shortName.name, "水槽沥水架");
assert.equal(identification.category, "厨房餐饮");
const data = {
  ...Object.fromEntries(
    boot.fields
      .filter((f) => f.default != null && f.default !== "")
      .map((f) => [f.id, f.default]),
  ),
  ...preview.items[0].data,
  item_code: "file" + Date.now().toString(36),
  item_name: "快速模板隔离测试",
  custom_库存类型: "直发",
  custom_实际售价: 1980,
};
const w = new ExcelJS.Workbook(),
  sheet = w.addWorksheet("SKU");
sheet.addRow(["SKU ID", "SKU名称", "原价（元）", "重量(g)", "售价(JPY)"]);
sheet.addRow(["supplier001", "黑色+M", 5, 70, 1980]);
sheet.addRow(["supplier002", "白色+L", 6, 80, 2080]);
const sku = await api("/sku-file", {
  filename: 'isolated-skus.xlsx',
  base64: Buffer.from(await w.xlsx.writeBuffer()).toString("base64"),
});
assert.equal(sku.skus.length, 2);
data.skus = sku.skus;
const prices = await api("/sku-pricing", data);
assert.equal(prices.items.length, 2);
assert.notEqual(
  prices.items[0].pricing.results.custom_到日本仓成本,
  prices.items[1].pricing.results.custom_到日本仓成本,
);
const saved = await api("/records", { data });
const response = await fetch(
  origin + base + "/records/" + encodeURIComponent(saved.id) + "/package",
  { headers: { Cookie } },
);
assert.equal(response.status, 200);
const bytes = Buffer.from(await response.arrayBuffer()),
  zip = await JSZip.loadAsync(bytes);
const file = zip.file(data.item_code + "/" + data.item_code + ".xlsx");
assert(file);
const quick = new ExcelJS.Workbook();
await quick.xlsx.load(await file.async("nodebuffer"));
assert.equal(quick.worksheets[0].getRow(1).getCell(1).value, "美和ERP字段");
const rows = [];
quick.worksheets[0].eachRow((r) => rows.push(r.values));
assert(rows.some((r) => r[1] === "是否上架" && r[2] === "禁止上架"));
const manifest = JSON.parse(
  await zip.file(data.item_code + "/aione-manifest.json").async("string"),
);
assert.equal(manifest.selectionId, saved.id);
assert.equal(manifest.allowPaidAI, false);
assert.equal(manifest.allowPublish, false);
checks += 6;
const testDir = new URL("../../../../../.local/", import.meta.url);
await mkdir(testDir, { recursive: true });
await writeFile(new URL("selection-package-test.zip", testDir), bytes);
console.log(
  JSON.stringify(
    {
      passed: checks,
      quickTemplate: "isolated-current-column-contract",
      skuCount: 2,
      packageManifest: true,
      publishingDenied: true,
      selectionId: saved.id,
    },
    null,
    2,
  ),
);
