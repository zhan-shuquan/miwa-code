import assert from "node:assert/strict";
import express from "express";
import pg from "pg";
import { createSelectionWorkspaceRouter } from "../src/routes/selection-workspace.js";
import { reconcileCosts } from "../src/services/selection-cost-reconciliation.js";
import { writeFile } from "node:fs/promises";

// Fault injection is confined to two ephemeral loopback test servers. Never change
// the 8081 ERP, the shared runner, its source hash, or the live preview's calculations.
const pool = new pg.Pool({
  connectionString:
    "postgres://aione_test:isolated-local-test-only@127.0.0.1:55432/aione_selection",
});
let mismatch = false,
  recognitionOffline = false,
  erpOffline = false,
  checks = 0;
const proxy = express();
proxy.use(express.json({ limit: "4mb" }));
proxy.post("/{*path}", async (req, res) => {
  if (req.path === "/identify" && recognitionOffline)
    return res.status(503).json({ error: "test recognition unavailable" });
  const response = await fetch("http://127.0.0.1:8755" + req.path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body),
  });
  const result = await response.json();
  if (mismatch && req.path === "/calculate")
    result.results.custom_到日本仓成本 += 7;
  res.status(response.status).json(result);
});
const listen = (app) =>
  new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
const costServer = await listen(proxy);
const wrappedPool = {
  connect: () => pool.connect(),
  query: async (...args) => {
    const result = await pool.query(...args);
    if (erpOffline && args[1]?.[0] === "connection")
      return { rows: [{ value: { lastSeen: "2000-01-01T00:00:00Z" } }] };
    return result;
  },
};
const app = express();
app.use(express.json({ limit: "4mb" }));
app.use((req, res, next) => {
  req.aioneIdentity = {
    personId: "test-v36-regression",
    subjectType: "person",
  };
  next();
});
app.use(
  "/api",
  createSelectionWorkspaceRouter(wrappedPool, {
    costUrl: "http://127.0.0.1:" + costServer.address().port,
  }),
);
app.use((e, req, res, next) =>
  res.status(e.statusCode || 500).json({ error: e.message }),
);
const server = await listen(app),
  origin = "http://127.0.0.1:" + server.address().port;
async function api(path, method = "GET", body, status = 200) {
  const response = await fetch(origin + "/api" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await response.json();
  assert.equal(response.status, status, JSON.stringify(value));
  checks++;
  return value;
}
try {
  const boot = await api("/bootstrap");
  for (const id of ["item_name", "item_group", "brand"])
    assert.equal(boot.fields.find((f) => f.id === id).readOnly, true);
  assert.equal(boot.defaults.ratio, 65);
  assert(boot.defaults.version >= 36);
  assert(
    boot.defaults.groups
      .filter((g) => ["source", "market"].includes(g.id))
      .every((g) => g.region === "main"),
  );
  checks += 6;
  const recognized = await api("/identify", "POST", {
    title: "厨房水槽沥水架",
  });
  assert.equal(recognized.shortName.name, "水槽沥水架");
  assert.equal(recognized.category, "厨房餐饮");
  assert.equal(recognized.brand, "KITCHENONE");
  checks += 3;
  const data = {
    item_code: "v36" + Date.now().toString(36),
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
    skus: [{ code: "test", spec: "测试规格" }],
  };
  const valid = await api("/calculate", "POST", data);
  assert.equal(valid.reconciliation.status, "matched");
  assert.equal(valid.reconciliation.checks[0].difference, 0);
  assert.equal(valid.breakdown.purchase_jpy, 118);
  checks += 3;
  const higher = await api("/calculate", "POST", {
    ...data,
    custom_实际售价: 2480,
  });
  assert.equal(
    higher.results.custom_运营后毛利润 - valid.results.custom_运营后毛利润,
    450,
  );
  checks++;
  const incomplete = await api("/calculate", "POST", {});
  assert.equal(incomplete.reconciliation.status, "pending");
  checks++;
  const missing = structuredClone(valid);
  delete missing.breakdown;
  assert.equal(reconcileCosts(missing).status, "pending");
  checks++;
  const alteredDelivery = structuredClone(valid);
  alteredDelivery.results.custom_日本包装成本 += 11;
  assert.equal(reconcileCosts(alteredDelivery).checks[1].difference, 11);
  checks++;
  erpOffline = true;
  recognitionOffline = true;
  assert.equal((await api("/bootstrap")).connection.online, false);
  const offline = await api("/calculate", "POST", {
    ...data,
    item_name: "",
    item_group: "",
    brand: "",
  });
  assert.equal(offline.status, "estimated");
  checks += 2;
  let draft = await api("/records", "POST", { data }, 201);
  assert.equal(draft.status, "draft");
  assert.equal(draft.data.item_name, "");
  checks += 2;
  recognitionOffline = false;
  erpOffline = false;
  mismatch = true;
  draft = await api("/records/" + encodeURIComponent(draft.id), "PATCH", {
    data,
    version: draft.version,
  });
  assert.equal(draft.pricing.reconciliation.status, "mismatch");
  assert.equal(draft.pricing.reconciliation.checks[0].difference, -7);
  checks += 2;
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
  await api("/records/" + encodeURIComponent(draft.id) + "/assets", "POST", {
    filename: "v36-test.png",
    mimeType: "image/png",
    base64: png,
  });
  const confirmed = await api("/batch", "POST", {
    action: "confirm",
    items: [{ id: draft.id, version: draft.version }],
  });
  const current = await api("/records/" + encodeURIComponent(draft.id));
  assert.equal(current.status, "confirmed");
  checks++;
  const rejected = await api(
    "/batch",
    "POST",
    { action: "submit", items: [{ id: current.id, version: current.version }] },
    409,
  );
  assert.match(rejected.error, /差额 ¥-7/);
  checks++;
  const jobs = await pool.query(
    "SELECT id FROM selection_erp_jobs WHERE selection_id=$1",
    [current.id],
  );
  assert.equal(jobs.rowCount, 0);
  checks++;
  const recovered = await api(
    "/records/" + encodeURIComponent(draft.id),
    "PATCH",
    { data, version: current.version },
  );
  assert.equal(recovered.status, "confirmed");
  checks++;
  mismatch = false;
  assert.equal(
    (await api("/calculate", "POST", data)).reconciliation.status,
    "matched",
  );
  checks++;
  const result = {
    passed: checks,
    mismatchDraftSaved: true,
    mismatchConfirmedWithoutERP: true,
    mismatchSubmitBlocked: true,
    noERPJobCreated: true,
    offlineSimulation: true,
    recognitionReadOnly: true,
  };
  await writeFile(
    new URL("../../../../../.local/v36-test-result.json", import.meta.url),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await new Promise((r) => server.close(r));
  await new Promise((r) => costServer.close(r));
  await pool.end();
}
