import assert from "node:assert/strict";
import express from "express";
import pg from "pg";
import { writeFile } from "node:fs/promises";
import { createSelectionWorkspaceRouter } from "../src/routes/selection-workspace.js";
import { validateLayout } from "../src/services/selection-workspace-contract.js";
import { reconcileCosts } from "../src/services/selection-cost-reconciliation.js";
const pool = new pg.Pool({
  connectionString:
    "postgres://aione_test:isolated-local-test-only@127.0.0.1:55432/aione_selection",
});
const origin = "http://127.0.0.1:8765",
  base = "/api/v1/selection-workspace";
const login = await fetch(origin + "/__preview/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ account: "employee" }),
});
const cookie = login.headers.get("set-cookie").split(";")[0];
let checks = 0;
async function api(
  path,
  method = "GET",
  body,
  status = 200,
  url = origin + base,
) {
  const r = await fetch(url + path, {
    method,
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const v = await r.json();
  assert.equal(r.status, status, JSON.stringify(v));
  checks++;
  return v;
}
const app = express();
app.use(express.json({ limit: "4mb" }));
app.use((req, res, next) => {
  req.aioneIdentity = { personId: "test-v37-offline", subjectType: "person" };
  next();
});
app.use(
  "/api",
  createSelectionWorkspaceRouter(pool, { costUrl: "http://127.0.0.1:1" }),
);
app.use((err, req, res, next) =>
  res.status(err.statusCode || 500).json({ error: err.message }),
);
const server = await new Promise((resolve) => {
  const s = app.listen(0, "127.0.0.1", () => resolve(s));
});
try {
  const boot = await api("/bootstrap"),
    s = (
      await pool.query(
        "SELECT value FROM selection_workspace_config WHERE key='erp'",
      )
    ).rows[0].value;
  assert.equal(boot.defaults.version, 37);
  assert.deepEqual(
    boot.fields.find((f) => f.id === "salesPlatform").options,
    s.platforms,
  );
  checks += 2;
  assert.equal(
    boot.fields.find((f) => f.id === "custom_实际售价").default,
    undefined,
  );
  checks++;
  const field = (id) => boot.defaults.fields.find((f) => f.id === id);
  for (const id of [
    "marketAttachments",
    "selectionRationale",
    "operatingStrategy",
  ])
    assert.equal(field(id).width, 12);
  checks += 3;
  assert.equal(field("selectionRationale").rows, 6);
  assert.equal(field("operatingStrategy").rows, 4);
  checks += 2;
  for (const id of ["item_name", "item_group", "brand"])
    assert(
      boot.defaults.fields.indexOf(field(id)) >
        boot.defaults.fields.indexOf(field("custom_中国国内运费")),
    );
  checks += 3;
  const layout = structuredClone(boot.defaults);
  field("images");
  validateLayout(layout, boot.fields);
  layout.fields.find((f) => f.id === "selectionRationale").rows = 12;
  validateLayout(layout, boot.fields);
  checks += 2;
  layout.fields.find((f) => f.id === "selectionRationale").rows = 99;
  assert.throws(() => validateLayout(layout, boot.fields));
  checks++;
  const data = {
    item_code: "v37" + Date.now().toString(36),
    custom_商品长标题中文: "厨房水槽沥水架",
    salesPlatform: s.platforms[0],
    marketReferencePrice: 2580,
    referenceLinks: [""],
    custom_库存类型: "直发",
    custom_单个采购价: 4.7,
    custom_单个净重g: 68,
    custom_套装数量: 1,
    stock_uom: "Nos",
    custom_国际物流方式: "空运直发（普货）",
    custom_中国包装方式: "原装",
    custom_日本包装物: "A4信封",
    custom_日本发货尺寸: "3cm厚",
    custom_实际售价: 2480,
    custom_aione_coupon: 1,
    custom_aione_points: 1,
    custom_aione_ads: 2,
    custom_aione_other: 0,
  };
  const pricing = await api("/calculate", "POST", data);
  assert.deepEqual(pricing.operationFees, [25, 25, 50, 0]);
  assert.equal(
    pricing.operationFees.reduce((a, b) => a + b, 0),
    pricing.results.custom_销售运营成本,
  );
  checks += 2;
  assert.equal(pricing.costNotes["日本包装成本"], "直发不适用");
  assert.equal(pricing.costNotes["日本配送费"], "已包含");
  checks += 2;
  assert.equal(pricing.calculationContext.targetMargin, 40);
  assert.equal(pricing.calculationContext.minimumProfit, null);
  checks += 2;
  const tamper = structuredClone(pricing);
  tamper.operationFees[0] += 3;
  assert.equal(reconcileCosts(tamper).status, "mismatch");
  checks++;
  const noPrice = await api("/calculate", "POST", {
    ...data,
    custom_实际售价: "",
  });
  assert.equal(noPrice.operationFees, null);
  checks++;
  await api(
    "/calculate",
    "POST",
    { ...data, salesPlatform: "not-an-ERP-platform" },
    400,
  );
  const record = await api("/records", "POST", { data }, 201);
  assert.equal(record.data.marketReferencePrice, 2580);
  assert.equal(record.data.salesPlatform, s.platforms[0]);
  checks += 2;
  const missingPrice = await api(
    "/records",
    "POST",
    {
      data: {
        ...data,
        item_code: "n37" + Date.now().toString(36),
        custom_实际售价: "",
      },
    },
    201,
  );
  await api(
    "/batch",
    "POST",
    {
      action: "confirm",
      items: [{ id: missingPrice.id, version: missingPrice.version }],
    },
    400,
  );
  const offlineUrl = "http://127.0.0.1:" + server.address().port + "/api";
  const draft = await api(
    "/records",
    "POST",
    { data: { item_code: "o37" + Date.now().toString(36) } },
    201,
    offlineUrl,
  );
  assert.equal(draft.pricing.status, "incomplete");
  assert.match(draft.pricing.message, /试算服务暂不可用/);
  checks += 2;
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
  await api(
    "/records/" + encodeURIComponent(draft.id) + "/assets",
    "POST",
    { filename: "v37-offline.png", base64: png },
    200,
    offlineUrl,
  );
  const loaded = await api(
    "/records/" + encodeURIComponent(draft.id),
    "GET",
    undefined,
    200,
    offlineUrl,
  );
  assert.equal(loaded.assets.length, 1);
  checks++;
  const result = {
    passed: checks,
    offlineImageSaved: true,
    blankReferenceAllowed: true,
    operationFeesFromERP: true,
    platforms: s.platforms,
    multiPlatformEnabled: false,
  };
  await writeFile(
    new URL("../../../../../.local/v37-test-result.json", import.meta.url),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}
