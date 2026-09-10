import assert from "node:assert/strict";
import { buildRakutenSafeFilePath } from "../src/integrations/rakuten-cabinet-upload.js";

const cases = [
  ["主图 01.jpg", "image/jpeg"],
  ["1688_855305580969_商品主图.png", "image/png"],
  ["A Very Long Canonical Product Asset Name 01.jpeg", "image/jpeg"]
];

for (const [name, mimeType] of cases) {
  const first = buildRakutenSafeFilePath(name, mimeType);
  const second = buildRakutenSafeFilePath(name, mimeType);
  assert.equal(first, second);
  assert.match(first, /^[a-z0-9_-]+\.(jpg|png|gif)$/);
  assert.ok(Buffer.byteLength(first, "utf8") <= 20, `Rakuten filename exceeds 20 bytes: ${first}`);
}

assert.notEqual(
  buildRakutenSafeFilePath("主图 01.jpg", "image/jpeg"),
  buildRakutenSafeFilePath("主图 02.jpg", "image/jpeg")
);

console.log("[AIONE] Rakuten Cabinet filename contract PASS");
