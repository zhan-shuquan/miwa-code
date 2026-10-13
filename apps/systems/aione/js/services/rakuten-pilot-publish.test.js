import assert from "node:assert/strict";
import { isRakutenPilotProduct, ensureRakutenPilotFolder, previewRakutenPilotPack, publishRakutenPilotPack } from "./rakuten-pilot-publish.js";
const product={id:"prod-238",localCode:"zjl238",targetShopRef:"永井GD"};
const proposal=Array.from({length:12},(_,i)=>({
 assetId:"asset-"+i, canonicalName:"zjl238_"+String(i+1).padStart(2,"0")+".jpg",
 slotFamily:i===0?"main_images":i<=2?"sku_or_variation_images":"detail_images",
 sourceRole:i===0?"source_main_image":i<=2?"source_sku_image":"source_detail_image",
 slotOrder:i===0?1:i<=2?i:i-2
}));
const ready={product:{id:product.id},shopRef:"永井GD",container:{containerCode:"rkc001",rakutenFolderId:15},proposal,proposalValidation:{readyForPublish:true,blocking:[]}};
const dry={shopRef:"永井GD",manageNumber:"zjl238",remoteStatus:404,remoteExists:false,skuCount:2,imageCount:12,cabinet:{containerCode:"rkc001",folderConfigured:true}};
function client({changeReady,changeDry,failPost}={}){
 const calls=[];
 const api=async(path,opts)=>{
  calls.push([path,opts]);
  if(path.includes("/product-entry/"))return {product};
  if(path.includes("/rakuten-pack"))return changeReady||ready;
  if(path.includes("/first-item-dry-run"))return changeDry||dry;
  if(path.includes("/containers/bootstrap"))return {ok:true,shopRef:"永井GD",containerCode:"rkc001",active:true};
  if(path.includes("/folders/ensure"))return {ok:true,shopRef:"永井GD",containerCode:"rkc001",folder:{folderId:15},container:{metadata:{rakutenFolderId:15}}};
  if(path.includes("/publish-canonical")){
   if(failPost)throw Error("simulated failure");
   return {ok:true,shopRef:"永井GD",containerCode:"rkc001",results:proposal.map(x=>({assetId:x.assetId,externalAssetId:x.assetId}))};
  }
  throw Error("Unexpected API "+path);
 };
 return {api,calls};
}
assert.equal(isRakutenPilotProduct(product),true);
assert.equal(isRakutenPilotProduct({...product,targetShopRef:"PrimeLife"}),false);
const init=client();assert.equal((await ensureRakutenPilotFolder(init.api,product)).folderId,15);
assert.equal(init.calls.filter(([url])=>url.includes("/folders/ensure")).length,1);
const good=client();const plan=await previewRakutenPilotPack(good.api,product);assert.equal(plan.assignments.length,12);
const after={...dry,mappedImageCount:12,blocking:["verified_itemapi_payload_and_shipping_attributes_still_required"]};
const publish=client({changeDry:after});await publishRakutenPilotPack(publish.api,product,plan);
assert.equal(publish.calls.filter(([url])=>url.includes("/publish-canonical")).length,1);
for(const invalid of [
 {...ready,proposal:proposal.slice(1)},
 {...ready,proposal:[...proposal.slice(0,11),proposal[0]]},
 {...ready,proposalValidation:{readyForPublish:false,blocking:["gcs_missing"]}},
 {...ready,shopRef:"PrimeLife"}
]){
 const fixture=client({changeReady:invalid});
 await assert.rejects(previewRakutenPilotPack(fixture.api,product));
 assert.equal(fixture.calls.some(([url])=>url.includes("/publish-canonical")),false);
}
for(const invalid of [{...dry,remoteStatus:200,remoteExists:true},{...dry,imageCount:11}]){
 await assert.rejects(previewRakutenPilotPack(client({changeDry:invalid}).api,product));
}
await assert.rejects(ensureRakutenPilotFolder(client().api,{...product,targetShopRef:"PrimeLife"}));
console.log("PASS: zjl238 pilot checks, guarded upload, target shop and 12-asset contract");
