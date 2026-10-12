import assert from "node:assert/strict";
import { minimumBreakEvenYen, salesBaseCostJpy } from "./product-pricing-math.js";
assert.equal(minimumBreakEvenYen(184+211,[10]),439);
assert.equal(minimumBreakEvenYen(395,[10,0,2,0,0]),449);
assert.equal(minimumBreakEvenYen(395,[10],40),790);
assert.equal(minimumBreakEvenYen(null,[10]),null);
assert.equal(minimumBreakEvenYen(395,[80,30]),null);
for(let fixed=0;fixed<1500;fixed+=71){
 for(const rates of [[10],[10,2],[10,2,5],[0],[12.5,2.5]]){
  const result=minimumBreakEvenYen(fixed,rates);
  assert.ok(Number.isInteger(result));
  const profit=p=>p-fixed-rates.reduce((a,r)=>a+Math.round(p*r/100),0);
  assert.ok(profit(result)>=0);
  if(result>0)assert.ok(profit(result-1)<0);
 }
}
console.log("PASS: exact whole-yen break-even without retail price rounding");

assert.equal(salesBaseCostJpy(184,211,98),493);
assert.equal(salesBaseCostJpy(184,null,98),null);
assert.equal(salesBaseCostJpy(184,211,0),395);
