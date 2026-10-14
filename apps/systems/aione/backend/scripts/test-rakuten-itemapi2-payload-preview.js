import assert from "node:assert/strict";
import {previewRakutenItemV2} from "../src/services/rakuten-itemapi2-payload-preview.js";
const product={id:"prd_test",localCode:"zjl238",targetShopRef:"永井GD",rakutenTitle:"凍結防止カバー",rakutenGenreId:"123456",salePriceJpy:980,specs:[{name:"セット数",values:["1個","2個"]}],extraAttributes:{rakutenCatalogExemptionReason:"5"}};
const skus=[{id:"sku1",sku_code:"zjl238-01",attributes:{"セット数":"1個",__aioneManualEntry:true}},{id:"sku2",sku_code:"zjl238-02",attributes:{"セット数":"2個",__aioneManualEntry:true}}];
const assets=Array.from({length:12},(_,i)=>({asset_id:"a"+i,mapping_status:"active",external_asset_id:String(i+1),asset_role:i===0?"source_main_image":i<3?"source_sku_image":"source_detail_image",sku_id:i===1?"sku1":i===2?"sku2":null,location:"/13839999/a"+i+".jpg"}));
const genre={lowest:true,genreId:"123456",attributes:[]};
const shipping={defaultDeliverySetId:1,deliverySets:[{id:1}],deliveryDates:[{id:2}],};
const result=previewRakutenItemV2({product,skus,assets,genre,shipping});
assert.equal(result.readyForLiveCreate,true);
assert.equal(result.item.itemType,"NORMAL");
assert.deepEqual(Object.keys(result.item.variants),["zjl238-01","zjl238-02"]);
assert.equal(result.item.variants["zjl238-02"].standardPrice,"980");
assert.equal(result.item.payment.taxRate,"0.1");
assert.equal(result.item.images.length,10);
assert.equal(result.item.variants["zjl238-01"].articleNumber.exemptionReason,5);
assert.equal(result.item.variants["zjl238-01"].shipping.shippingMethodGroup,"1");
assert.equal(result.item.variants["zjl238-01"].normalDeliveryDateId,2);
assert.equal(result.item.variants["zjl238-01"].images.length,1);
assert.equal(result.mappedImageCount,12);
for(const [overrides,reason] of [
 [{assets:assets.slice(1)},"twelve_mapped_images_required"],
 [{shipping:{...shipping,defaultDeliverySetId:100}},"shop_delivery_set_unverified"],
 [{genre:null},"genre_metadata_unverified"],
 [{skus:skus.slice(1)},"canonical_sku_identity_unverified"],
 [{product:{...product,rakutenTitle:""}},"item_title_required"]
]){
 const attempt=previewRakutenItemV2({product,skus,assets,genre,shipping,...overrides});
 assert.equal(attempt.readyForLiveCreate,false);
 assert.ok(attempt.blocking.includes(reason),reason);
}
const missingCatalog=previewRakutenItemV2({product:{...product,extraAttributes:{}},skus,assets,genre,shipping});
assert.ok(missingCatalog.blocking.includes("sku_catalog_id_or_exemption_unverified"));
console.log("PASS ItemAPI 2.0 read-only payload + guarded SKU / image / genre contract");
