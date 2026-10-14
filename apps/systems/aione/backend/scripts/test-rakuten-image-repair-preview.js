import assert from "node:assert/strict";
import {buildZjl238ImageRepairPreview} from "../src/services/rakuten-image-repair-preview.js";
const assets=Array.from({length:12},(_,i)=>({location:"/13839999/img"+i+".jpg"}));
const item={images:Array.from({length:10},(_,i)=>({type:"CABINET",location:"/rkc001/img"+i+".jpg",alt:"Image "+i})),
 variants:{"zjl238-04":{images:[{type:"CABINET",location:"/rkc001/img10.jpg"}],standardPrice:"980"},"zjl238-05":{images:[{type:"CABINET",location:"/rkc001/img11.jpg"}],standardPrice:"980"}}};
const result=buildZjl238ImageRepairPreview({item,assets});
assert.equal(result.ready,true);
assert.equal(result.changes.length,12);
assert.equal(result.candidateImageFields.images[0].location,"/13839999/img0.jpg");
assert.equal(result.candidateImageFields.variants["zjl238-05"].images[0].location,"/13839999/img11.jpg");
assert.equal(result.candidateImageFields.images[0].alt,"Image 0");
assert.deepEqual(Object.keys(result.candidateImageFields).sort(),["images","variants"]);
assert.deepEqual(Object.keys(result.candidateImageFields.variants["zjl238-04"]),["images"]);
assert.equal(item.variants["zjl238-04"].standardPrice,"980");
assert.equal(buildZjl238ImageRepairPreview({item,assets:assets.slice(1)}).ready,false);
assert.equal(buildZjl238ImageRepairPreview({item:{...item,variants:{"zjl238-05":item.variants["zjl238-05"]}},assets}).ready,false);
assert.equal(buildZjl238ImageRepairPreview({item:{...item,images:item.images.map((x,i)=>({...x,location:assets[i].location})),variants:{"zjl238-04":{images:[{type:"CABINET",location:assets[10].location}]},"zjl238-05":{images:[{type:"CABINET",location:assets[11].location}]}}},assets}).ready,false);
console.log("PASS: zjl238 image-only correction preview; SKU and price remain untouched");
