import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const origin = "http://127.0.0.1:8765";
const login = await fetch(origin + "/__preview/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ account: "employee" }),
});
const cookie = login.headers.get("set-cookie").split(";")[0];
let checks = 0;
async function api(path, method = "GET", body, status = 200) {
  const r = await fetch(origin + "/api/v1/selection-workspace" + path, {
    method,
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const v = await r.json();
  assert.equal(r.status, status, JSON.stringify(v));
  checks++;
  return v;
}
function check(v) {
  assert(v);
  checks++;
}
const boot = await api("/bootstrap");
check(boot.layout.version === 39);
check(boot.identity.name === "测试员工");
check(!boot.fields.find((f) => f.id === "item_name").readOnly);
check(boot.fields.find((f) => f.id === "custom_库存类型").readOnly);
const fields = boot.layout.fields.filter((f) => f.group === "basic");
assert.deepEqual(
  fields.slice(-4).map((f) => f.id),
  ["item_name", "custom_库存类型", "item_group", "brand"],
);
checks++;
check(!boot.fields.find((f) => f.id === "custom_单个采购价").costKey);
const validation = await api("/confirmation-check", "POST", {});
check(validation.issues.some((i) => i.field === "custom_国际物流方式"));
check(
  !validation.issues.some((i) =>
    ["item_name", "item_group", "brand"].includes(i.field),
  ),
);
const prefix = "v39" + Date.now().toString(36).slice(-4);
let naming = await api('/records', 'POST', {data:{custom_商品长标题中文:'厨房水槽沥水架',shortNameManual:false}}, 201);
check(naming.data.item_name === '水槽沥水架');
const namingPath = '/records/' + encodeURIComponent(naming.id);
naming = await api(namingPath,'PATCH',{version:naming.version,data:{...naming.data,custom_商品长标题中文:'尚无匹配的商品标题'}});
check(naming.data.item_name === '');
naming = await api(namingPath,'PATCH',{version:naming.version,data:{...naming.data,item_name:'人工确认的简称',shortNameManual:true,custom_商品长标题中文:'厨房水槽沥水架'}});
check(naming.data.item_name === '人工确认的简称');
let draft = await api(
  "/records",
  "POST",
  { data: { item_code: prefix, custom_库存类型: "直发" } },
  201,
);
check(!draft.data.custom_库存类型);
const path = "/records/" + encodeURIComponent(draft.id);
draft = await api(path);
check(draft.selector === "test-employee" && draft.selectorName === "测试员工");
const data = {
  ...draft.data,
  custom_商品长标题中文: "桌面收纳盒",
  custom_单个采购价: 12,
  custom_单个净重g: 280,
  custom_套装数量: 1,
  stock_uom: "Nos",
  custom_中国国内运费: 0,
  custom_国际物流方式: "空运直发（普货）",
  custom_中国包装方式: "原装",
  custom_日本包装物: "A4信封",
  custom_日本发货尺寸: "3cm厚",
  custom_实际售价: 2480,
  shortNameManual: false,
};
draft = await api(path, "PATCH", { version: draft.version, data });
check(draft.data.custom_库存类型 === "直发");
check(draft.pricing.status === "estimated");
const direct = draft.pricing.results;
draft = await api(path, "PATCH", {
  version: draft.version,
  data: {
    ...draft.data,
    custom_国际物流方式: "空运大件（普货）",
    custom_库存类型: "直发",
    item_name: "人工确认简称",
    shortNameManual: true,
  },
});
check(draft.data.custom_库存类型 === "备货");
check(draft.data.item_name === "人工确认简称");
check(draft.pricing.results.custom_运营后毛利润 !== direct.custom_运营后毛利润);
draft = await api(path, "PATCH", {
  version: draft.version,
  data: { ...draft.data, custom_商品长标题中文: "完全不同的长标题" },
});
check(draft.data.item_name === "人工确认简称");
const confirmation = await api("/batch", "POST", {
  action: "confirm",
  items: [{ id: draft.id, version: draft.version }],
});
check(confirmation.items[0].status === "confirmed");
draft = await api(path);
check(draft.selector === "test-employee");
for (const sort of [
  "item_code",
  "item_name",
  "item_group",
  "brand",
  "custom_库存类型",
  "owner",
  "selector",
  "status",
  "erpStatus",
  "operationRate",
  "totalCost",
  "cost",
  "price",
  "suggestion",
  "profit",
  "margin",
  "createdAt",
  "sourceUrl",
  "selectionRationale",
  "operatingStrategy",
]) {
  for (const direction of ["asc", "desc"])
    await api("/records?sort=" + sort + "&direction=" + direction + "&limit=2");
}
await writeFile(
  new URL("../../../../../.local/v39-test-result.json", import.meta.url),
  JSON.stringify(
    { checks, id: draft.id, prefix, direct, warehouse: draft.pricing.results },
    null,
    2,
  ),
);
console.log(JSON.stringify({ checks, id: draft.id, prefix }));
