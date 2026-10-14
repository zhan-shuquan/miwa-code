import assert from "node:assert/strict";
import {cabinetLocationFromFileUrl,publicCabinetImageUrl,locatePublishedCabinetAsset} from "../src/services/rakuten-cabinet-image-location.js";
import {resolvePublishedCabinetAssetLocations} from "../src/services/rakuten-cabinet-asset-locations.js";
const url="https://image.rakuten.co.jp/global-dimensions/cabinet/13839999/a8427bf31da24.jpg";
assert.equal(cabinetLocationFromFileUrl(url),"/13839999/a8427bf31da24.jpg");
assert.equal(publicCabinetImageUrl("/13839999/a8427bf31da24.jpg"),url);
const named="https://image.rakuten.co.jp/global-dimensions/cabinet/zjl01/a8427bf31da24.jpg";
assert.equal(cabinetLocationFromFileUrl(named),"/zjl01/a8427bf31da24.jpg");
for(const invalid of [
 "https://evil.test/global-dimensions/cabinet/13839999/a8427bf31da24.jpg",
 "https://image.rakuten.co.jp/other-store/cabinet/13839999/a8427bf31da24.jpg",
 "https://image.rakuten.co.jp/global-dimensions/cabinet/../../test.jpg",
 "https://image.rakuten.co.jp/global-dimensions/cabinet/13839999/a8427bf31da24.jpg?bad=1",
 "https://image.rakuten.co.jp/global-dimensions/cabinet/rkc001/%2fetc.jpg"
])assert.equal(cabinetLocationFromFileUrl(invalid),null);
const row={external_path:"a8427bf31da24.jpg",external_asset_id:"1234",mapping_status:"active"};
const remote=[{fileId:1234,filePath:"a8427bf31da24.jpg",fileUrl:url,folderId:13839999}];
assert.equal(locatePublishedCabinetAsset(row,remote).location,"/13839999/a8427bf31da24.jpg");
assert.equal(locatePublishedCabinetAsset(row,[]).location,null);
const plan={container:{rakutenFolderId:13839999}};
const checked=await resolvePublishedCabinetAssetLocations({productId:"prd_123",shopRef:"永井GD",assets:[row],
 getPlan:async()=>plan,listRemoteFiles:async()=>remote});
assert.equal(checked.verifiedCount,1);
assert.equal(checked.assets[0].location,"/13839999/a8427bf31da24.jpg");
await assert.rejects(resolvePublishedCabinetAssetLocations({productId:"prd_123",shopRef:"PrimeLife",assets:[row],getPlan:async()=>plan,listRemoteFiles:async()=>remote}));
console.log("PASS: Cabinet FileUrl truth to ItemAPI relative path; no remote writes");
