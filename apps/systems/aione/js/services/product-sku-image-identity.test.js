import assert from "node:assert/strict";
import { matchPersistedSkuByAttributes as match } from "./product-sku-image-identity.js";
const rows=[
{id:"sku-uuid-1",sku_code:"MH00000005-01",attributes:{"套数":"1個",__aioneManualEntry:true}},
{id:"sku-uuid-2",sku_code:"MH00000005-02",attributes:{"套数":"2個",__aioneManualEntry:true}}
];
assert.equal(match(rows,{"套数":"1個"})?.id,"sku-uuid-1");
assert.equal(match(rows,{"套数":"2個"})?.id,"sku-uuid-2");
assert.equal(match(rows,{"套数":"3個"}),null);
assert.equal(match(rows,{"套数":"1個","颜色":"黑色"}),null);
assert.equal(match([...rows,rows[0]],{"套数":"1個"}),null);
assert.equal(match([{id:"x",sku_code:"bad",attributes:{__aioneManualEntry:true}}],{"套数":"1個"}),null);
console.log("PASS stable SKU attribute identity without relying on display SKU codes or position.");
