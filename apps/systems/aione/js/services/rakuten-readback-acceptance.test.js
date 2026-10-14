import assert from "node:assert/strict";
import {assessRakutenReadback,RAKUTEN_READBACK_CONTRACT} from "./rakuten-readback-acceptance.js";
const row={access:{ok:true},issues:[]};
const ok={readbackContract:RAKUTEN_READBACK_CONTRACT,exists:true,skuDataVerified:true,verified:true,checks:[],imageVerification:{verified:true,total:12,accessible:12,cabinetMatched:12,issues:[],rows:Array(12).fill(row)}};
assert.equal(assessRakutenReadback(ok).complete,true);
for(const data of [{verified:true}, {...ok,readbackContract:undefined},{...ok,imageVerification:undefined},{...ok,imageVerification:{...ok.imageVerification,accessible:0}},{...ok,imageVerification:{...ok.imageVerification,rows:[]}},{...ok,skuDataVerified:false}]){
 assert.equal(assessRakutenReadback(data).complete,false);
}
assert.equal(assessRakutenReadback({verified:true}).unavailable,true);
console.log("PASS: fail closed on old RMS readback and incomplete image evidence");
