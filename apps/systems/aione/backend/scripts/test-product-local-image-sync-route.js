import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createProductImageSyncRouter } from "../src/routes/product-image-sync.js";

// Purely in-memory dependency injection. NO real database, GCS, or Rakuten.
const id="prd_c61a3ec2-9e98-4892-8d08-985b7962f74a";
const image=Buffer.concat([Buffer.from("89504e470d0a1a0a","hex"),Buffer.alloc(32)]);
const sha=createHash("sha256").update(image).digest("hex");
const bucket="fixture-assets";
const current=[{id:"ast_manual",asset_role:"source_main_image",source_provider:"aione_manual",original_name:"MH0000005_ma.png",mime_type:"image/png",metadata:{fileSha256:sha,gcsBucket:bucket,gcsObject:"manual/primary.png"}}];
const blobs=new Map([["manual/primary.png",{bytes:image,contentType:"image/png"}]]);
const queries=[];
const db={async query(sql,params){
 queries.push(sql);
 if(sql.includes("FROM public.products"))return {rowCount:1,rows:[{id,product_code:"MH0000005",metadata:{manualEntry:{localCode:"zjl238"}}}]};
 if(sql.includes("SELECT id,asset_role")&&sql.includes("FROM public.product_assets"))return {rows:current.map(x=>({...x}))};
 if(sql.includes("SELECT id,original_name,mime_type")&&sql.includes("FROM public.product_assets"))return {rows:current.filter(x=>x.metadata.localImageSlot)};
 if(sql.includes("SELECT COALESCE(MAX(asset_no)"))return {rows:[{next:current.length+1}]};
 if(sql.includes("UPDATE public.product_assets")){const a=current.find(x=>x.id===params[0]);Object.assign(a.metadata,JSON.parse(params[1]));return {rowCount:1};}
 if(sql.includes("INSERT INTO public.product_assets")){const [assetId,productId,num,role,name,canonical,mime,meta]=params;current.push({id:assetId,product_id:productId,asset_role:role,original_name:name,mime_type:mime,metadata:JSON.parse(meta)});return {rowCount:1};}
 if(sql.includes("SELECT id FROM public.products"))return {rows:[{id}]};
 throw Error("Unexpected SQL: "+sql);
}};
let uploads=0;
const objectMetadata=async({objectName})=>{const b=blobs.get(objectName);return b?{size:String(b.bytes.length),contentType:b.contentType,metadata:{fileSha256:createHash("sha256").update(b.bytes).digest("hex")}}:null};
const router=createProductImageSyncRouter({
 queryPool:db,transaction:async fn=>fn(db),
 uploadObject:async({objectName,buffer,contentType})=>{uploads++;blobs.set(objectName,{bytes:buffer,contentType});return {reused:false,metadata:await objectMetadata({objectName})}},
 objectMetadata,readObject:async({objectName})=>({...blobs.get(objectName),size:blobs.get(objectName)?.bytes.length})
});
const handler=router.stack.find(x=>x.route?.path==="/products/:productId/local-image").route.stack.at(-1).handle;
const status=router.stack.find(x=>x.route?.path==="/products/:productId/local-images/status").route.stack.at(-1).handle;
const req=(name)=>({params:{productId:id},body:{fileName:name,base64:image.toString("base64")},aioneContext:{personId:"person_test"}});
async function invoke(fn,request){
 const response={statusCode:200,status(v){this.statusCode=v;return this},json(v){this.body=v;return this}};
 let failure;await fn(request,response,e=>{failure=e});if(failure)throw failure;return response;
}
const first=await invoke(handler,req("zjl238_01.png"));
assert.equal(first.body.reused,true);
assert.equal(first.body.assetId,"ast_manual");
assert.equal(uploads,0);
assert.equal(current.length,1);
assert.equal(current[0].metadata.localImageSlot,"main:1");
assert.equal(current[0].metadata.byteSize,image.length);
const second=await invoke(handler,req("zjl238_01.png"));
assert.equal(second.body.reused,true);
assert.equal(current.length,1);
const sku=await invoke(handler,req("zjl238_c01.png"));
assert.equal(sku.statusCode,201);
assert.equal(sku.body.reused,false);
assert.equal(current.length,2);
assert.equal(uploads,1);
const repeat=await invoke(handler,req("zjl238_c01.png"));
assert.equal(repeat.body.reused,true);
assert.equal(uploads,1);
const listed=await invoke(status,{params:{productId:id}});
assert.equal(listed.body.total,2);
assert.equal(listed.body.verifiedCount,2);
assert.deepEqual(new Set(listed.body.assets.map(a=>a.slot)),new Set(["main:1","sku:1"]));
assert.equal(queries.some(q=>q.includes("rakuten")),false);
console.log("PASS image sync route integration: manual primary reuse, byte audit, create, idempotent retry, read-only status; external calls ZERO");
