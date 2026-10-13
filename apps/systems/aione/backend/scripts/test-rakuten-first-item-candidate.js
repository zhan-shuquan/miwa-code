import assert from "node:assert/strict";
import {buildRakutenFirstItemCandidate} from "../src/services/rakuten-first-item-candidate.js";
const product={id:"product-238",localCode:"zjl238",targetShopRef:"永井GD",rakutenTitle:"水道凍結防止カバー",rakutenGenreId:"123456",salePriceJpy:980,
 specs:[{name:"セット数",values:["1個","2個"]}],extraAttributes:{}};
const skus=[{id:"sku01",sku_code:"zjl238-01",attributes:{"セット数":"1個"}},{id:"sku02",sku_code:"zjl238-02",attributes:{"セット数":"2個"}}];
const assets=Array.from({length:12},(_,i)=>({asset_id:"img"+i,mapping_status:"active",external_asset_id:String(i+101),
 asset_role:i===0?"source_main_image":i<=2?"source_sku_image":"source_detail_image",
 sku_id:i===1?"sku01":i===2?"sku02":null,location:"/cabinet/rkc001/a"+i+".jpg"}));
const genre={lowest:true,genreId:"123456",attributes:[]};
const shipping={deliverySets:[{id:33}],deliverySetId:33,deliveryDates:[{id:4}],normalDeliveryDateId:4,catalogExemptionVerified:true,itemapiContractVerified:true};
const r=buildRakutenFirstItemCandidate({product,skus,mappedImages:assets,genre,shipping});
assert.equal(r.candidateReady,true);
assert.equal(r.priceJpy,980);
assert.deepEqual(r.variantIds,["zjl238-01","zjl238-02"]);
assert.equal(r.taxRate,"0.1");
assert.equal(r.imageCount,12);
for(const changed of [
 {mappedImages:assets.slice(1),expected:"rakuten_12_cabinet_images_not_verified"},
 {shipping:{...shipping,deliverySetId:99},expected:"rakuten_shipping_method_group_unverified"},
 {genre:{...genre,attributes:[{id:55,nameJa:"素材",properties:{rmsMandatoryFlg:true}}]},expected:"mandatory_attribute_missing:55"},
 {product:{...product,rakutenGenreId:""},expected:"rakuten_six_digit_genre_required"}
]){
 const {expected,...patch}=changed;
 const invalid=buildRakutenFirstItemCandidate({product,skus,mappedImages:assets,genre,shipping,...patch});
 assert.equal(invalid.candidateReady,false);
 assert.ok(invalid.blocking.includes(expected),expected);
}
console.log("PASS strict Rakuten candidate checks; no RMS writes");
