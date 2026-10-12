import assert from "node:assert/strict";
import {getItemV2ReadOnly} from "../src/integrations/rakuten-rms-client.js";
const old=process.env.AIONE_RAKUTEN_SHOP_REF;
const oldS=process.env.AIONE_RAKUTEN_SERVICE_SECRET;
const oldL=process.env.AIONE_RAKUTEN_LICENSE_KEY;
try{
 process.env.AIONE_RAKUTEN_SHOP_REF="永井GD";
 process.env.AIONE_RAKUTEN_SERVICE_SECRET="fixture-secret";
 process.env.AIONE_RAKUTEN_LICENSE_KEY="fixture-license";
 let sent=0;
 const request=async(url,opts)=>{sent++;assert.equal(opts.method,"GET");assert.equal(url,"https://api.rms.rakuten.co.jp/es/2.0/items/manage-numbers/zjl238");return {status:404,ok:false,text:async()=>""}};
 const absent=await getItemV2ReadOnly({shopRef:"永井GD",manageNumber:"zjl238",request});
 assert.equal(absent.exists,false);
 assert.equal(sent,1);
 await assert.rejects(getItemV2ReadOnly({shopRef:"幸せ屋",manageNumber:"zjl238",request}),e=>e.code==="rakuten_shop_binding_missing");
 await assert.rejects(getItemV2ReadOnly({shopRef:"永井GD",manageNumber:"../../no",request}),e=>e.code==="invalid_manage_number");
 assert.equal(sent,1);
 const found=await getItemV2ReadOnly({shopRef:"永井GD",manageNumber:"zjl238",request:async()=>({ok:true,status:200,text:async()=>JSON.stringify({manageNumber:"zjl238"})})});
 assert.equal(found.exists,true);
 assert.equal(found.item.manageNumber,"zjl238");
 console.log("PASS ItemAPI read-only shop isolation and duplicate GET (mock RMS only)");
}finally{
 for(const [k,v] of [["AIONE_RAKUTEN_SHOP_REF",old],["AIONE_RAKUTEN_SERVICE_SECRET",oldS],["AIONE_RAKUTEN_LICENSE_KEY",oldL]]){if(v===undefined)delete process.env[k];else process.env[k]=v;}
}
