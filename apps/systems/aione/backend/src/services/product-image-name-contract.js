export function classifyEmployeeImageName(filename, localCode){
 const code=String(localCode||"").trim();
 const name=String(filename||"").trim();
 if(!/^[A-Za-z0-9-]{2,80}$/.test(code))return null;
 const prefix=code.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 const pattern=new RegExp("^"+prefix+"_(c)?([0-9]{2,4})\\.(jpg|jpeg|png|webp)$","i");
 const match=name.match(pattern);
 if(!match)return null;
 const index=Number(match[2]);
 if(index<1||index>999)return null;
 const kind=match[1]?"sku":index===1?"main":"detail";
 return {kind,index,role:kind==="sku"?"source_sku_image":kind==="main"?"source_main_image":"source_detail_image",extension:match[3].toLowerCase(),originalName:name,slot:kind==="sku"?"c"+String(index).padStart(2,"0"):String(index).padStart(2,"0")};
}
export function validImageBytes(buffer,mime){
 if(!Buffer.isBuffer(buffer)||buffer.length<16)return false;
 if(mime==="image/png")return buffer.subarray(0,8).equals(Buffer.from("89504e470d0a1a0a","hex"));
 if(mime==="image/jpeg")return buffer[0]===255&&buffer[1]===216&&buffer[2]===255;
 if(mime==="image/webp")return buffer.toString("ascii",0,4)==="RIFF"&&buffer.toString("ascii",8,12)==="WEBP";
 return false;
}
