import assert from "node:assert/strict";
const origin = "http://127.0.0.1:8765",
  base = "/api/v1/selection-workspace";
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
let checks = 0;
async function call(cookie, path, method = "GET", body, status = 200) {
  const r = await fetch(origin + base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await r.json();
  assert.equal(r.status, status, JSON.stringify(value));
  checks++;
  return value;
}
await call(null, "/records", "GET", undefined, 401);
const boot = await call(employee, "/bootstrap");
await call(employee, '/preferences', 'PUT', {columns:['<script>']}, 400);
await call(employee, '/preferences', 'PUT', {widths:{item_name:-1}}, 400);
assert.equal(boot.parameters.verified, false);
const data = {
  item_code: "qa" + Date.now(),
  item_name: "隔离测试商品",
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
  skus: [{ code: "qa-sku", spec: "测试规格" }],
};
const incomplete = await call(employee, "/calculate", "POST", {});
assert.equal(incomplete.status, "incomplete");
const cost = await call(employee, "/calculate", "POST", data);
assert.equal(cost.status, "estimated");
assert.equal(cost.results.custom_运营后毛利润, 777);
const saved = await call(employee, "/records", "POST", { data }, 201);
assert.equal(saved.owner, "test-employee");
await call(
  partner,
  "/records/" + encodeURIComponent(saved.id),
  "GET",
  undefined,
  404,
);
const partnerList = await call(
  partner,
  "/records?owner=test-employee&scope=all",
);
assert(!partnerList.items.some((r) => r.id === saved.id));
await call(
  partner,
  "/records/" + encodeURIComponent(saved.id),
  "PATCH",
  { version: 1, data },
  404,
);
await call(
  employee,
  "/records/" + encodeURIComponent(saved.id),
  "PATCH",
  { version: 0, data },
  409,
);
await call(employee, "/layout", "PUT", boot.layout, 403);
await call(
  admin,
  "/layout",
  "PUT",
  { ...boot.layout, fields: [...boot.layout.fields, boot.layout.fields[0]] },
  400,
);
const layout = structuredClone(boot.layout);
layout.ratio = 55;
layout.fields.reverse();
await call(admin, "/layout", "PUT", layout);
assert.equal((await call(employee, "/bootstrap")).layout.ratio, 55);
await call(admin, "/layout", "PUT", boot.layout);
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
const image = await call(
  employee,
  "/records/" + encodeURIComponent(saved.id) + "/assets",
  "POST",
  { filename: "test.png", base64: png },
);
const copied = await call(employee, "/batch", "POST", {
  action: "copy",
  items: [{ id: saved.id, version: 1 }],
});
assert.equal(copied.items[0].data.item_code, undefined);
const copyDetail = await call(
  employee,
  "/records/" + encodeURIComponent(copied.items[0].id),
);
assert.equal(copyDetail.assets.length, 1);
assert.notEqual(copyDetail.assets[0].id, image.id);
await call(
  partner,
  "/records/" + encodeURIComponent(saved.id) + "/assets/" + image.id,
  "GET",
  undefined,
  404,
);
const submit = { action: "submit", items: [{ id: saved.id, version: 1 }] };
const first = await call(employee, "/batch", "POST", submit),
  second = await call(employee, "/batch", "POST", submit);
assert.equal(first.items[0].id, second.items[0].id);
await call(
  employee,
  "/records/" + encodeURIComponent(saved.id),
  "PATCH",
  { version: 1, data },
  409,
);
await call(
  partner,
  "/batch",
  "POST",
  { action: "archive", items: [{ id: saved.id, version: 1 }] },
  404,
);
const unauthorized = await fetch(
  origin + "/api/v1/integrations/rakuten/publish",
  { method: "POST", headers: { Cookie: employee } },
);
assert.equal(unauthorized.status, 403);
checks++;
const exported = await fetch(origin + base + "/export?format=csv", {
  headers: { Cookie: partner },
});
assert.equal(exported.status, 200);
assert(!(await exported.text()).includes(data.item_code));
checks++;
console.log(
  JSON.stringify(
    {
      passed: checks,
      selectionId: saved.id,
      jobId: first.items[0].id,
      ruleVersion: cost.ruleVersion,
      estimatedProfit: cost.results.custom_运营后毛利润,
      verified: false,
    },
    null,
    2,
  ),
);
