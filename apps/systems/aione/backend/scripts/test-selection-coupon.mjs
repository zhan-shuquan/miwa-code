import assert from 'node:assert/strict';
const origin='http://127.0.0.1:8765';
const login=await fetch(origin+'/__preview/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({account:'employeeA'})});
assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
async function api(path,method='GET',body){const r=await fetch(origin+'/api/v1/selection-workspace'+path,{method,headers:{cookie,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const v=await r.json();assert.ok(r.ok,JSON.stringify(v));return v;}
const base={item_name:'优惠券隔离回归',shortNameManual:true,custom_单个采购价:5,custom_单个净重g:80,custom_套装数量:1,custom_国际物流方式:'空运大件（普货）',custom_中国包装方式:'原装',custom_日本包装物:'A4信封',custom_日本发货尺寸:'3cm厚',custom_实际售价:5980,custom_aione_coupon:0,custom_aione_points:0,custom_aione_ads:0,custom_aione_other:0};
const examples=[];
for(const [mode,value,expected,discount] of [['百分比',0,598,0],['百分比',50,299,2990],['固定金额',2990,299,2990],['固定金额',500,548,500]]) {
 const data={...base,custom_aione_coupon_mode:mode,...(mode==='百分比'?{custom_aione_coupon:value}:{custom_aione_coupon_amount:value})};
 const p=await api('/calculate','POST',data),r=p.results;
 assert.equal(p.status,'estimated');assert.equal(p.reconciliation.status,'matched');assert.equal(r.custom_平台交易成本,expected);
 const revenue=5980-discount,fixed=r.custom_到日本仓成本+r.custom_日本配送日本;
 assert.equal(r.custom_运营后毛利润,revenue-fixed-expected);
 assert.ok(Math.abs(r.custom_运营后毛利率-(revenue-fixed-expected)/revenue*100)<1e-8);
 const quote=await api('/calculate','POST',{...data,custom_实际售价:r.custom_目标毛利率达标售价});
 assert.ok(quote.results.custom_运营后毛利率>=p.calculationContext.targetMargin-1e-8);
 const zero=await api('/calculate','POST',{...data,custom_实际售价:r.custom_运营后保本售价});
 assert.ok(zero.results.custom_运营后毛利润>=0&&zero.results.custom_运营后毛利润<=2);
 examples.push({mode,value,platform:expected,net:r.custom_运营后毛利润,margin:r.custom_运营后毛利率,target:r.custom_目标毛利率达标售价});
}
let record=await api('/records','POST',{requestKey:crypto.randomUUID(),data:{...base,sourceUrl:'https://example.invalid/coupon-'+crypto.randomUUID(),custom_aione_coupon_mode:'固定金额',custom_aione_coupon_amount:2990}});
const path='/records/'+encodeURIComponent(record.id);
record=await api(path);assert.equal(record.data.custom_aione_coupon_mode,'固定金额');assert.equal(record.data.custom_aione_coupon_amount,2990);assert.equal(record.pricing.results.custom_平台交易成本,299);
await api(path,'PATCH',{version:record.version,data:{...record.data,custom_aione_coupon_mode:'百分比',custom_aione_coupon:50}});
record=await api(path);assert.equal(record.data.custom_aione_coupon,50);assert.equal(record.pricing.results.custom_平台交易成本,299);
console.log(JSON.stringify({passed:true,examples,savedRecordId:record.id,checks:['no coupon','percentage coupon','fixed coupon','single discount deduction','transaction margin','inverse break-even','target margin','draft save and reload']},null,2));
