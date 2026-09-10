import assert from "node:assert/strict";
import { detect1688SourceAssetRole } from "../src/services/product-asset-role-service.js";

const cases = [
  ["主图/1.jpg", "source_main_image"],
  ["sku图片/red.jpg", "source_sku_image"],
  ["详情/detail01.jpg", "source_detail_image"],
  ["视频/demo.mp4", "source_video"],
  ["1688_855305580969/主图/1.jpg", "source_main_image"],
  ["1688_855305580969/sku图片/red.jpg", "source_sku_image"],
  ["商品资料/详情/detail01.jpg", "source_detail_image"],
  ["商品资料/视频/demo.mp4", "source_video"],
  ["商品资料/其他/readme.txt", "source_other"]
];

for (const [path, expected] of cases) {
  assert.equal(detect1688SourceAssetRole(path), expected, `${path} -> ${expected}`);
}

console.log("[AIONE] Product asset role detection PASS");
