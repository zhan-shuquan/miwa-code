import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
const origin = "http://127.0.0.1:8765",
  base = "/api/v1/selection-workspace";
let checks = 0;
const login = await fetch(origin + "/__preview/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ account: "employee" }),
});
const cookie = login.headers.get("set-cookie").split(";")[0];
async function api(path, method = "GET", body, status = 200) {
  const response = await fetch(origin + base + path, {
    method,
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await response.json();
  assert.equal(response.status, status, JSON.stringify(value));
  checks++;
  return value;
}
function check(value) {
  assert(value);
  checks++;
}
const boot = await api("/bootstrap");
check(boot.uploadPolicy.maxBytes === 20 * 1024 * 1024);
check(boot.defaults.version === 38);
const main = boot.defaults.groups.filter(
  (g) =>
    g.region === "main" &&
    !g.hidden &&
    boot.defaults.fields.some((f) => f.group === g.id && !f.hidden),
);
assert.deepEqual(
  main.map((g) => g.id),
  ["basic", "market", "logistics", "operations"],
);
checks++;
check(main.every((g) => g.icon && !/^\d/.test(g.label)));
check(boot.fields.find((f) => f.id === "custom_库存类型").type === "select");
check(!boot.fields.find((f) => f.id === "custom_库存类型").display);
check(
  boot.defaults.fields.find((f) => f.id === "selectionRationale").rows === 9,
);
check(
  boot.fields
    .find((f) => f.id === "selectionRationale")
    .placeholder.includes("选择这款商品的理由："),
);
check(boot.defaults.fields.find((f) => f.id === "marketReferencePrice").hidden);
for (const key of ["sourceUrl", "custom_商品长标题中文"])
  check(boot.defaults.fields.find((f) => f.id === key).group === "basic");
const prefix = "v38" + Date.now().toString(36).slice(-4);
const original = await readFile(
  "D:/产品(Products)/86001占金玲选品-zjl/zjl133/zjl133_背面.jpg",
);
check(original.length > 2 * 1024 * 1024);
let draft = await api(
  "/records",
  "POST",
  {
    data: {
      item_code: prefix + "im",
      supplier: "历史供应商保持",
      referenceLinks: ["https://example.com/a", "https://example.com/b"],
      referencePrices: [1800, 3200],
    },
  },
  201,
);
check(!draft.data.selectionRationale);
assert.deepEqual(draft.data.referencePrices, [1800, 3200]);
checks++;
const path = "/records/" + encodeURIComponent(draft.id);
const asset = await api(path + "/assets", "POST", {
  filename: "v38-real-4.5MB.jpg",
  base64: original.toString("base64"),
});
draft = await api(path);
check(draft.assets.length === 1 && draft.marketAssets.length === 0);
const originalResponse = await fetch(
  origin + base + path + "/assets/" + asset.id,
  { headers: { Cookie: cookie } },
);
const returned = Buffer.from(await originalResponse.arrayBuffer());
const hash = (b) => createHash("sha256").update(b).digest("hex");
check(hash(original) === hash(returned));
const sizes = { original: original.length };
for (const size of ["preview", "thumbnail"]) {
  const response = await fetch(
    origin + base + path + "/assets/" + asset.id + "?size=" + size,
    { headers: { Cookie: cookie } },
  );
  check(
    response.status === 200 &&
      response.headers.get("content-type").startsWith("image/webp"),
  );
  const bytes = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(bytes).metadata();
  check(
    Math.max(metadata.width, metadata.height) <=
      (size === "preview" ? 1400 : 240),
  );
  check(bytes.length < original.length);
  sizes[size] = bytes.length;
}
await api(
  path + "/assets",
  "POST",
  { filename: "same.jpg", base64: original.toString("base64"), kind: "market" },
  409,
);
await api(
  path + "/assets",
  "POST",
  {
    filename: "invalid.jpg",
    base64: Buffer.from([255, 216, 255, 0, 0]).toString("base64"),
  },
  400,
);
const market = await sharp({
  create: { width: 30, height: 30, channels: 3, background: "#246442" },
})
  .png()
  .toBuffer();
await api(path + "/assets", "POST", {
  filename: "market.png",
  base64: market.toString("base64"),
  kind: "market",
});
draft = await api(path);
check(draft.assets.length === 1 && draft.marketAssets.length === 1);
const updated = await api(path, "PATCH", {
  version: draft.version,
  data: {
    ...draft.data,
    referenceLinks: ["https://example.com/b"],
    referencePrices: [3200],
  },
});
check(updated.data.supplier === "历史供应商保持");
check(updated.data.referencePrices[0] === 3200);
const cleared = await api(path, "PATCH", {
  version: updated.version,
  data: { ...updated.data, referencePrices: [null] },
});
check(
  cleared.data.referencePrices[0] === null &&
    cleared.data.marketReferencePrice === null,
);
await api(
  path,
  "PATCH",
  {
    version: cleared.version,
    data: { ...cleared.data, referencePrices: "invalid" },
  },
  400,
);
await api(
  path + "/assets",
  "POST",
  {
    filename: "oversized.jpg",
    base64: Buffer.alloc(boot.uploadPolicy.maxBytes + 1, 1).toString("base64"),
  },
  400,
);
// More than one page, with a lexicographic trap (2, 10, 100) and missing values.
const records = [];
for (let i = 0; i < 28; i++) {
  const cost = i === 0 ? 100 : i === 1 ? 2 : i === 2 ? 10 : i + 0.25;
  const r = await api(
    "/records",
    "POST",
    {
      data: {
        item_code: prefix + String(i).padStart(2, "0"),
        custom_单个采购价: cost,
        custom_实际售价: 1000 + i,
      },
    },
    201,
  );
  records.push(r);
}
await api("/records", "POST", { data: { item_code: prefix + "nil" } }, 201);
const a = await api(
  "/records?q=" + prefix + "&sort=cost&direction=asc&limit=25",
);
const b = await api(
  "/records?q=" + prefix + "&sort=cost&direction=asc&limit=25&offset=25",
);
const all = [...a.items, ...b.items];
check(all.length === 30);
const numeric = all
  .map((r) => r.data.custom_单个采购价)
  .filter((v) => v != null && v !== "");
assert.deepEqual(
  numeric,
  [...numeric].sort((a, b) => a - b),
);
checks++;
check(
  all.at(-1).data.custom_单个采购价 == null ||
    all.at(-1).data.custom_单个采购价 === "",
);
const desc = await api(
  "/records?q=" + prefix + "&sort=cost&direction=desc&limit=25",
);
check(Number(desc.items[0].data.custom_单个采购价) === 100);
const time = await api("/records?q=" + prefix);
check(time.items[0].data.item_code === prefix + "nil");
const csv = await fetch(origin + base + "/export?q=" + prefix + "&format=csv", {
  headers: { Cookie: cookie },
});
check((await csv.text()).includes("referencePrices_JSON"));
const result = {
  passed: checks,
  prefix,
  imageRecordId: draft.id,
  imageSizes: sizes,
  originalSHA256: hash(original),
  rawLimit: boot.uploadPolicy.maxBytes,
  formulaChanged: false,
};
await writeFile(
  new URL("../../../../../.local/v38-test-result.json", import.meta.url),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
