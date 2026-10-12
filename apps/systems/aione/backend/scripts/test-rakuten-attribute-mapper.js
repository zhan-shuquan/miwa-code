import assert from "node:assert/strict";
import {mapRakutenGenreAttributes as map} from "../src/services/rakuten-attribute-mapper.js";
const definitions=[
{id:"brand",type:"text",required:true,verified:true,allowDash:true},
{id:"model",type:"text",required:true,verified:true,allowDash:false},
{id:"size",type:"choice",required:true,verified:true,allowedValues:["S","M"]},
{id:"weight",type:"number",required:false}
];
const a=map(definitions,{model:"",size:"M"});
assert.deepEqual(a.autoFilled,["brand"]);
assert.equal(a.attributes.find(x=>x.id==="brand").value,"-");
assert.ok(a.blocking.includes("required_attribute_unresolved:model"));
assert.equal(a.ready,false);
const b=map([{id:"brand",type:"text",required:true,allowDash:true}],{});
assert.equal(b.ready,false);
const c=map([{id:"size",type:"choice",required:true,allowDash:true,verified:true}],{});
assert.equal(c.ready,false);
const d=map([{id:"brand",type:"text",required:true,allowDash:true,verified:true}],{brand:"日本"});
assert.equal(d.attributes[0].value,"日本");
console.log("PASS genre attribute dash fallback fail-closed");
