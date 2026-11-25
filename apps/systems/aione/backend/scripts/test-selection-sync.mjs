import assert from "node:assert/strict";
import pg from "pg";
const origin = "http://127.0.0.1:8765",
  base = "/api/v1/selection-workspace";
const pool = new pg.Pool({
  connectionString:
    "postgres://aione_test:isolated-local-test-only@127.0.0.1:55432/aione_selection",
});
const login = await fetch(origin + "/__preview/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ account: "employee" }),
});
const cookie = login.headers.get("set-cookie").split(";")[0];
let checks = 0;
async function api(path, body, expected = 200, connector = false) {
  const r = await fetch(origin + base + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(connector
        ? { "x-aione-connector-token": "isolated-connector-test-only" }
        : { Cookie: cookie }),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const v = await r.json();
  assert.equal(r.status, expected, JSON.stringify(v));
  checks++;
  return v;
}
const original = (
  await pool.query(
    "SELECT value FROM selection_workspace_config WHERE key='erp'",
  )
).rows[0].value;
try {
  await api("/connector/snapshot", original, 200, true);
  await pool.query(
    "UPDATE selection_workspace_config SET value=$1 WHERE key='connection'",
    [JSON.stringify({ lastSeen: "2000-01-01T00:00:00Z" })],
  );
  assert.equal((await api("/bootstrap")).connection.online, false);
  const data = {
    item_code: "sync" + Date.now().toString(36),
    item_name: "断线恢复隔离测试",
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
    skus: [{ code: "sync-sku", spec: "测试" }],
  };
  const saved = await api("/records", { data }, 201);
  assert.equal(saved.pricing.status, "estimated");
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
  await api("/records/" + encodeURIComponent(saved.id) + "/assets", {
    filename: "sync.png",
    base64: png,
  });
  const altered = structuredClone(original);
  altered.settings.platform_rate += 0.1;
  await api("/connector/snapshot", altered, 200, true);
  await api(
    "/batch",
    { action: "submit", items: [{ id: saved.id, version: 1 }] },
    409,
  );
  await api("/connector/snapshot", original, 200, true);
  const submission = await api("/batch", {
    action: "submit",
    items: [{ id: saved.id, version: 1 }],
  });
  const id = submission.items[0].id;
  await api("/connector/claim", {}, 401, false);
  const first = (await api("/connector/claim", {}, 200, true)).jobs.find(
    (j) => j.id === id,
  );
  assert(first);
  await pool.query(
    "UPDATE selection_erp_jobs SET lease_until=now()-interval '1 second' WHERE id=$1",
    [id],
  );
  const second = (await api("/connector/claim", {}, 200, true)).jobs.find(
    (j) => j.id === id,
  );
  assert(second);
  assert.notEqual(first.lease_token, second.lease_token);
  await api(
    "/connector/jobs/" + id + "/result",
    { leaseToken: first.lease_token, status: "succeeded" },
    409,
    true,
  );
  await api(
    "/connector/jobs/" + id + "/result",
    {
      leaseToken: second.lease_token,
      status: "failed",
      result: { message: "隔离测试：模拟可重试传输失败" },
    },
    200,
    true,
  );
  await api("/jobs/" + id + "/retry", {});
  const rows = await api("/records?q=" + data.item_code);
  assert.equal(rows.total, 1);
  // Batch all-or-nothing and permission-safe copies.
  const a = await api("/records", { data: { item_name: "批量回滚A" } }, 201),
    b = await api("/records", { data: { item_name: "批量回滚B" } }, 201);
  await api(
    "/batch",
    {
      action: "edit",
      items: [
        { id: a.id, version: a.version },
        { id: b.id, version: 0 },
      ],
      patch: { item_name: "不应保存" },
    },
    409,
  );
  assert.equal(
    (await api("/records/" + encodeURIComponent(a.id))).data.item_name,
    "批量回滚A",
  );
  await api("/batch", {
    action: "edit",
    items: [
      { id: a.id, version: 1 },
      { id: b.id, version: 1 },
    ],
    patch: { custom_aione_ads: 3 },
  });
  assert.equal(
    (await api("/records/" + encodeURIComponent(a.id))).data.custom_aione_ads,
    3,
  );
  console.log(
    JSON.stringify(
      {
        passed: checks,
        offlineSnapshotCalculation: true,
        parameterConflictBlocked: true,
        staleLeaseBlocked: true,
        batchRollback: true,
        retryQueuedJob: id,
      },
      null,
      2,
    ),
  );
} finally {
  await api("/connector/snapshot", original, 200, true);
  await pool.end();
}
