import assert from "node:assert/strict";
import {reviewFirstLiveSkuRows} from "../src/services/rakuten-first-live-sku-review.js";
const product={localCode:"zjl238",specs:[{name:"数量",values:["1個","2個"]}],salePriceJpy:980,defaultStock:1000};
const skus=[
 {id:"a",sku_code:"zjl238-c01",attributes:{"数量":"1個",__aioneManualEntry:true}},
 {id:"b",sku_code:"zjl238-c02",attributes:{"数量":"2個",__aioneManualEntry:true}}
];
const item={variants:{
 "zjl238-c01":{standardPrice:"980",selectorValues:{selector0:"1個"},images:[{location:"/rkc001/a.jpg"}]},
 "zjl238-c02":{standardPrice:"980",selectorValues:{selector0:"2個"},images:[{location:"/rkc001/b.jpg"}]}
}};
const result=reviewFirstLiveSkuRows({product,skus,item});
assert.deepEqual(result.blocking,["persisted_sku_differs_from_owner_approved_mapping"]);
assert.equal(result.requiresSkuCodeAcknowledgement,false);
assert.deepEqual(result.rows.map(x=>x.stock),[1000,1000]);
assert.equal(result.rows[0].skuCode,"zjl238-c01");
assert.equal(result.rows[0].option,"1個セット");
assert.equal(result.rows[1].skuCode,"zjl238-c02");
assert.equal(result.rows[1].option,"2個セット");
const safe=reviewFirstLiveSkuRows({product,skus:skus.map((s,i)=>({...s,sku_code:i?"zjl238-05":"zjl238-04"})),item:{variants:{"zjl238-04":item.variants["zjl238-c01"],"zjl238-05":item.variants["zjl238-c02"]}}});
assert.equal(safe.requiresSkuCodeAcknowledgement,false);
assert.deepEqual(safe.blocking,[]);
assert.ok(reviewFirstLiveSkuRows({product,skus:skus.slice(0,1),item}).blocking.includes("pilot_sku_option_set_mismatch"));
console.log("PASS live pilot SKU identity/stock/image review and explicit mismatch acknowledgement");
