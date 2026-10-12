import {spawn} from "node:child_process";
import {createHash} from "node:crypto";
import {getGcsObjectMetadata,readGcsObject,uploadGcsObjectIfAbsent} from "../integrations/google-cloud-storage-client.js";
export const displaySizes=[64,320,640];
export function webpObjectName(assetId,digest,size){
 if(!/^[-\\w]{5,100}$/.test(String(assetId))||!/^[a-f0-9]{64}$/.test(String(digest))||!displaySizes.includes(size))throw Error("invalid_display_variant");
 return "product/display-webp/v1/"+assetId+"/"+digest+"/"+size+".webp";
}
export async function convertWebp(bytes,size){
 if(!Buffer.isBuffer(bytes)||bytes.length<16||bytes.length>3*1024*1024||!displaySizes.includes(size))throw Error("invalid_conversion_input");
 return new Promise((resolve,reject)=>{
  const child=spawn("convert",["-","-auto-orient","-thumbnail",size+"x"+size+">","-strip","-quality","83","webp:-"],{stdio:["pipe","pipe","pipe"]});
  let total=0,parts=[],stderr="",settled=false;
  const done=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(result)};
  const timer=setTimeout(()=>{child.kill("SIGKILL");done(Error("image_conversion_timeout"))},12000);
  child.stdout.on("data",part=>{total+=part.length;if(total>2*1024*1024){child.kill("SIGKILL");done(Error("image_conversion_too_large"))}else parts.push(part)});
  child.stderr.on("data",part=>{stderr=(stderr+part.toString()).slice(-500)});
  child.on("error",err=>done(err));
  child.on("close",code=>{const result=Buffer.concat(parts);if(code===0&&result.length>16&&result.toString("ascii",0,4)==="RIFF"&&result.toString("ascii",8,12)==="WEBP")done(null,result);else done(Error("image_conversion_failed: "+stderr.slice(0,120)))});
  child.stdin.on("error",()=>{});child.stdin.end(bytes);
 });
}
export async function getDisplayWebp({assetId,bucketName,objectName,digest,size,read=readGcsObject,getMetadata=getGcsObjectMetadata,upload=uploadGcsObjectIfAbsent,convert=convertWebp}){
 if(!/^[a-f0-9]{64}$/.test(String(digest||"")))throw Error("display_image_checksum_missing");
 const name=webpObjectName(assetId,digest,size);
 const saved=await getMetadata({bucketName,objectName:name});
 if(saved&&saved.contentType==="image/webp"&&Number(saved.size)>16){
  const result=await read({bucketName,objectName:name});return {bytes:result.bytes,reused:true};
 }
 const original=await read({bucketName,objectName});
 const actual=createHash("sha256").update(original.bytes).digest("hex");
 if(actual!==digest)throw Error("display_source_checksum_conflict");
 const bytes=await convert(original.bytes,size);
 await upload({bucketName,objectName:name,buffer:bytes,contentType:"image/webp",metadata:{sourceSha256:digest,displaySize:String(size)}});
 return {bytes,reused:false};
}
