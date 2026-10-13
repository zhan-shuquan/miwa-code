import assert from "node:assert/strict";
import {putItemV2,getInventoryV2,putInventoryV2,getGenreAttributesV2} from "../src/integrations/rakuten-commerce-client.js";
const previous={shop:process.env.AIONE_RAKUTEN_SHOP_REF,secret:process.env.AIONE_RAKUTEN_SERVICE_SECRET,key:process.env.AIONE_RAKUTEN_LICENSE_KEY};
Object.assign(process.env,{AIONE_RAKUTEN_SHOP_REF:"永井GD",AIONE_RAKUTEN_SERVICE_SECRET:"ci-only",AIONE_RAKUTEN_LICENSE_KEY:"ci-only"});
const calls=[];
const request=async(url,options)=>{
 calls.push({url,method:options.method,body:options.body?JSON.parse(options.body):null});
 return {ok:true,status:200,text:async()=>JSON.stringify(url.includes("/attributes")?{genre:{lowest:true,attributes:[]}}:url.includes("/inventories")?{quantity:1000}:{})};
};
try{
 await putItemV2({shopRef:"永井GD",manageNumber:"zjl238",payload:{title:"Test"},request});
 assert.equal(calls[0].method,"PUT");
 assert.match(calls[0].url,/items\/manage-numbers\/zjl238$/);
 await putInventoryV2({shopRef:"永井GD",manageNumber:"zjl238",variantId:"zjl238-c01",quantity:1000,request});
 assert.equal(calls[1].method,"POST");
 assert.deepEqual(calls[1].body,{mode:"ABSOLUTE",quantity:1000});
 const read=await getInventoryV2({shopRef:"永井GD",manageNumber:"zjl238",variantId:"zjl238-c01",request});
 assert.equal(read.body.quantity,1000);
 const genre=await getGenreAttributesV2({shopRef:"永井GD",genreId:"123456",request});
 assert.deepEqual(genre.genre.attributes,[]);
 assert.match(calls[3].url,/\/navigation\/genres\/123456\/attributes\/$/);
 const count=calls.length;
 await assert.rejects(putInventoryV2({shopRef:"PrimeLife",manageNumber:"zjl238",variantId:"c01",quantity:1000,request}),e=>e.code==="rakuten_shop_binding_mismatch");
 await assert.rejects(putInventoryV2({shopRef:"永井GD",manageNumber:"zjl238",variantId:"c01",quantity:-1,request}),e=>e.code==="inventory_quantity_invalid");
 await assert.rejects(getGenreAttributesV2({shopRef:"永井GD",genreId:"invalid",request}),e=>e.code==="genre_id_invalid");
 assert.equal(calls.length,count);
 await assert.rejects(putItemV2({shopRef:"永井GD",manageNumber:"zjl238",payload:{},request:async()=>({ok:false,status:400,text:async()=>JSON.stringify({errors:[{code:"INVALID_FIELD",field:"shipping",message:"invalid"}]})})}),e=>e.remoteCode==="INVALID_FIELD");
}finally{for(const [k,v] of Object.entries(previous)){const name=k==="shop"?"AIONE_RAKUTEN_SHOP_REF":k==="secret"?"AIONE_RAKUTEN_SERVICE_SECRET":"AIONE_RAKUTEN_LICENSE_KEY";if(v===undefined)delete process.env[name];else process.env[name]=v;}}
console.log("PASS Rakuten ItemAPI InventoryAPI NavigationAPI adapters; no live API writes");
