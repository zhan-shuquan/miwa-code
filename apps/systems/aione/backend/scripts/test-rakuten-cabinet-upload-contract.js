import assert from "node:assert/strict";
import { prepareRakutenCabinetImage } from "../src/integrations/rakuten-cabinet-image.js";
import { insertCabinetFile } from "../src/integrations/rakuten-cabinet-upload.js";

const sample = Buffer.concat([Buffer.from([0xff,0xd8,0xff]),Buffer.alloc(40)]);
const prepared = await prepareRakutenCabinetImage({bytes:sample,mimeType:"image/jpeg",convert:async(args) => {
 assert.equal(args[0],"identify");
 return Buffer.from("JPEG 960 960\n");
}});
assert.equal(prepared.converted,false);
assert.strictEqual(prepared.bytes,sample);
const png = await prepareRakutenCabinetImage({bytes:sample,mimeType:"image/png",convert:async(args) => {
 if(args[0]==="identify")return Buffer.from(args.at(-1)==="-"?"PNG 2000 1600\n":"JPEG 1200 960\n");
 throw Error("not expected");
}}).catch(e=>e);
assert.ok(png instanceof Error);
const calls=[];
const oldSecret=process.env.AIONE_RAKUTEN_SERVICE_SECRET;
const oldKey=process.env.AIONE_RAKUTEN_LICENSE_KEY;
process.env.AIONE_RAKUTEN_SERVICE_SECRET="test-only";
process.env.AIONE_RAKUTEN_LICENSE_KEY="test-only";
try {
 const request=async(url,opts)=>{
  assert.match(url,/cabinet\/file\/insert$/);
  const xml=await opts.body.get("xml").text();
  assert.match(xml,/<overWrite>false<\/overWrite>/);
  assert.doesNotMatch(xml,/<overwrite>/);
  const blob=opts.body.get("file");
  assert.equal(blob.type,"image/jpeg");
  calls.push({xml,blob});
  return {ok:true,status:200,text:async()=>"<result><status><systemStatus>OK</systemStatus></status><cabinetFileInsertResult><resultCode>0</resultCode><FileId>123456</FileId></cabinetFileInsertResult></result>"};
 };
 const result=await insertCabinetFile({folderId:13839999,fileName:"zjl238_01.jpg",bytes:sample,mimeType:"image/jpeg",request,prepare:async()=>prepared});
 assert.equal(result.fileId,123456);
 assert.equal(calls.length,1);
 await assert.rejects(insertCabinetFile({folderId:1,fileName:"zjl238_01.jpg",bytes:sample,request:async()=>({ok:true,status:200,text:async()=>"<result><systemStatus>OK</systemStatus><resultCode>0</resultCode></result>"}),prepare:async()=>prepared}),e=>e.code==="rakuten_cabinet_file_id_unconfirmed");
 await assert.rejects(insertCabinetFile({folderId:1,fileName:"zjl238_01.jpg",bytes:sample,request:async()=>({ok:false,status:400,text:async()=>"<result><resultCode>E101</resultCode></result>"}),prepare:async()=>prepared}),e=>e.remoteCode==="E101"&&e.rakutenStatus===400);
} finally {
 if(oldSecret===undefined)delete process.env.AIONE_RAKUTEN_SERVICE_SECRET;else process.env.AIONE_RAKUTEN_SERVICE_SECRET=oldSecret;
 if(oldKey===undefined)delete process.env.AIONE_RAKUTEN_LICENSE_KEY;else process.env.AIONE_RAKUTEN_LICENSE_KEY=oldKey;
}
console.log("[AIONE] Rakuten Cabinet upload XML and fail-closed response test PASS");
