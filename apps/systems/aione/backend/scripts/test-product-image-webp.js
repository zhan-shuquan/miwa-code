import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {webpObjectName,getDisplayWebp} from "../src/services/product-image-webp-service.js";
const raw=Buffer.from("89504e470d0a1a0a00000000000000000000","hex");
const sha=createHash("sha256").update(raw).digest("hex");
const mockWebp=Buffer.concat([Buffer.from("RIFF0000WEBP","ascii"),Buffer.alloc(32)]);
const blobs=new Map();
let converts=0,reads=0;
const options={assetId:"ast_12345678",bucketName:"fake",objectName:"original.png",digest:sha,size:64,
 getMetadata:async({objectName})=>blobs.has(objectName)?{contentType:"image/webp",size:String(blobs.get(objectName).length)}:null,
 read:async({objectName})=>{reads++;return {bytes:objectName==="original.png"?raw:blobs.get(objectName)}},
 upload:async({objectName,buffer})=>{blobs.set(objectName,buffer)},
 convert:async()=>{converts++;return mockWebp}
};
const first=await getDisplayWebp(options);
assert.equal(first.reused,false);assert.equal(converts,1);
const again=await getDisplayWebp(options);
assert.equal(again.reused,true);assert.equal(converts,1);
assert.equal(reads,2);
assert.throws(()=>webpObjectName("ast_12345678",sha,100));
await assert.rejects(getDisplayWebp({...options,digest:"0".repeat(64),size:320}),/display_source_checksum_conflict/);
console.log("PASS WebP derivative memoization, integrity and whitelist (mock GCS only)");
