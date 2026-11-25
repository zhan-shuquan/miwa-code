import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import JSZip from "jszip";
import ExcelJS from "exceljs";
import pg from "pg";
const origin = "http://127.0.0.1:8765",
  base = "/api/v1/selection-workspace";
let checks = 0;
async function login(account) {
  const r = await fetch(origin + "/__preview/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account }),
  });
  return r.headers.get("set-cookie").split(";")[0];
}
const employee = await login("employee"),
  partner = await login("partner"),
  admin = await login("admin");
async function api(
  path,
  method = "GET",
  body,
  status = 200,
  cookie = employee,
) {
  const r = await fetch(origin + base + path, {
    method,
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const v = await r.json();
  assert.equal(r.status, status, JSON.stringify(v));
  checks++;
  return v;
}
const boot = await api("/bootstrap");
const previous = new URL(
  "../../../../../.local/pre-v35-layout.json",
  import.meta.url,
);
try {
  await readFile(previous);
} catch {
  await writeFile(previous, JSON.stringify(boot.layout, null, 2));
}
await api("/layout", "PUT", boot.defaults, 200, admin);
assert.equal(boot.defaults.fields[0].id, "sourceUrl");
assert.equal(boot.defaults.fields[1].id, "custom_商品长标题中文");
const snap = JSON.parse(
  await readFile(
    new URL("../../../../../.local/erp-snapshot.json", import.meta.url),
  ),
);
const { validateData } = await import(
  "../src/services/selection-workspace-contract.js"
);
assert.equal(validateData({ item_code: "zyl001" }, snap).item_code, "zyl001");
assert.throws(() => validateData({ item_code: "zyl001中" }, snap));
checks += 2;
const code = "v35" + Date.now().toString(36);
const data = {
  item_code: code,
  item_name: "V3.5隔离验收",
  sourceUrl: "https://supplier.example.com/product/" + code,
  custom_商品长标题中文: "厨房水槽沥水架",
  custom_库存类型: "直发",
  custom_单个采购价: 4.7,
  custom_单个净重g: 68,
  custom_套装数量: 1,
  stock_uom: "Nos",
  custom_国际物流方式: "空运直发（普货）",
  custom_中国包装方式: "原装",
  custom_日本包装物: "A4信封",
  custom_日本发货尺寸: "3cm厚",
  custom_实际售价: 1980,
  referenceLinks: [
    "https://www.amazon.co.jp/dp/TEST",
    "https://example.org/market",
  ],
  selectionRationale: "市场需求待验证，不虚构销量",
  operatingStrategy: "先直发测款，人工确认运营方案",
  skus: [],
};
let record = await api("/records", "POST", { data }, 201);
const id = encodeURIComponent(record.id);
assert.equal(record.data.selectionRationale, data.selectionRationale);
assert.equal(record.data.operatingStrategy, data.operatingStrategy);
assert.equal(
  (await api("/source-check", "POST", { sourceUrl: data.sourceUrl })).duplicates
    .length,
  1,
);
assert.equal(
  (
    await api(
      "/source-check",
      "POST",
      { sourceUrl: data.sourceUrl },
      200,
      partner,
    )
  ).duplicates.length,
  0,
);
await api("/source-check", "POST", { sourceUrl: "javascript:alert(1)" }, 400);
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
const product = await api("/records/" + id + "/assets", "POST", {
  filename: "product.png",
  base64: png,
});
await api(
  "/records/" + id + "/assets",
  "POST",
  { filename: "competitor.png", base64: png, kind: "market" },
  409,
);
const market = await api("/records/" + id + "/assets", "POST", {
  filename: "research.pdf",
  base64: Buffer.from("%PDF-1.4\nTest report only\n%%EOF").toString("base64"),
  kind: "market",
});
const details = await api("/records/" + id);
assert.equal(details.assets.length, 1);
assert.equal(details.marketAssets.length, 1);
await api(
  "/records/" + id + "/assets/" + market.id,
  "GET",
  undefined,
  404,
  partner,
);
await api("/records/" + id + "/assets", "PUT", { ids: [market.id] }, 403);
record = await api("/records/" + id, "PATCH", {
  data,
  version: record.version,
});
assert.equal((await api("/records/" + id)).marketAssets.length, 1);
const confirm = await api("/batch", "POST", {
  action: "confirm",
  items: [{ id: record.id, version: record.version }],
});
record = confirm.items[0];
assert.equal(record.status, "confirmed");
assert.equal((await api("/records/" + id)).jobs.length, 0);
await api(
  "/batch",
  "POST",
  { action: "submit", items: [{ id: record.id, version: record.version }] },
  400,
);
record = await api("/records/" + id, "PATCH", {
  data: { ...data, skus: [{ code: "secondstage", spec: "资料完善" }] },
  version: record.version,
});
assert.equal(record.status, "confirmed");
const copied = await api("/batch", "POST", {
  action: "copy",
  items: [{ id: record.id, version: record.version }],
});
const copy = await api("/records/" + encodeURIComponent(copied.items[0].id));
assert.equal(copy.marketAssets.length, 1);
assert.equal(copy.assets.length, 1);
const zipResponse = await fetch(origin + base + "/records/" + id + "/package", {
  headers: { Cookie: employee },
});
assert.equal(zipResponse.status, 200);
const zip = await JSZip.loadAsync(await zipResponse.arrayBuffer());
assert(!Object.keys(zip.files).some((n) => n.includes(market.id)));
assert(Object.keys(zip.files).some((n) => n.includes(product.id)));
checks++;
const original = await api("/calculate", "POST", data);
const adjusted = await api("/calculate", "POST", {
  ...data,
  custom_aione_ads: 10,
});
assert(
  original.results.custom_运营后毛利润 > adjusted.results.custom_运营后毛利润,
);
assert.equal(
  original.results.custom_运营后毛利润 - adjusted.results.custom_运营后毛利润,
  198,
);
const incomplete = await api("/calculate", "POST", {});
assert.equal(incomplete.status, "incomplete");
const ai = await api("/assist-context", "POST", {
  data,
  id: record.id,
  objective: "市场分析",
});
assert.equal(ai.enabled, false);
assert.equal(ai.proposal, null);
assert.deepEqual(ai.context.marketAttachmentIds, [market.id]);
assert.deepEqual(ai.context.productAttachmentIds, [product.id]);
const exported = await fetch(origin + base + "/export?format=xlsx&q=" + code, {
  headers: { Cookie: employee },
});
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(Buffer.from(await exported.arrayBuffer()));
assert(wb.worksheets[0].getRow(1).values.includes("selectionRationale"));
checks++;
const moved = structuredClone(boot.defaults);
moved.fields.find((f) => f.id === "selectionRationale").group = "strategy";
moved.fields.find((f) => f.id === "images").width = 6;
await api("/layout", "PUT", moved, 200, admin);
assert.equal(
  (await api("/bootstrap")).layout.fields.find((f) => f.id === "images").width,
  6,
);
await api("/layout", "PUT", boot.defaults, 200, admin);
await api("/records/" + id + "/assets", "PUT", { ids: [], kind: "market" });
const after = await api("/records/" + id);
assert.equal(after.assets.length, 1);
assert.equal(after.marketAssets.length, 0);
const onlyMarket = await api(
  "/records",
  "POST",
  {
    data: {
      ...data,
      item_code: code + "m",
      skus: [{ code: "marketcheck", spec: "隔离测试" }],
    },
  },
  201,
);
const marketOnlyId = encodeURIComponent(onlyMarket.id);
const reportAsset = await api("/records/" + marketOnlyId + "/assets", "POST", {
  kind: "market",
  filename: "report.pdf",
  base64: Buffer.from("%PDF-1.4\nIsolated report\n%%EOF").toString("base64"),
});
await api(
  "/batch",
  "POST",
  {
    action: "submit",
    items: [{ id: onlyMarket.id, version: onlyMarket.version }],
  },
  400,
);
const originalAsset = await api(
  "/records/" + marketOnlyId + "/assets",
  "POST",
  { filename: "original.png", base64: png },
);
const queued = await api("/batch", "POST", {
  action: "submit",
  items: [{ id: onlyMarket.id, version: onlyMarket.version }],
});
const pool = new pg.Pool({
  connectionString:
    "postgres://aione_test:isolated-local-test-only@127.0.0.1:55432/aione_selection",
});
try {
  const payload = (
    await pool.query("SELECT payload FROM selection_erp_jobs WHERE id=$1", [
      queued.items[0].id,
    ])
  ).rows[0].payload;
  assert.deepEqual(
    payload.assets.map((a) => a.id),
    [originalAsset.id],
  );
  assert.deepEqual(
    payload.researchMaterials.map((a) => a.id),
    [reportAsset.id],
  );
  assert.equal(payload.data.operatingStrategy, data.operatingStrategy);
  checks++;
} finally {
  await pool.end();
}
await writeFile(
  new URL("../../../../../.local/v35-test-result.json", import.meta.url),
  JSON.stringify(
    {
      passed: checks,
      recordId: record.id,
      confirmedWithoutERP: true,
      marketSeparated: true,
      paidAI: false,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      passed: checks,
      recordId: record.id,
      confirmedWithoutERP: true,
      marketSeparated: true,
      paidAI: false,
    },
    null,
    2,
  ),
);
