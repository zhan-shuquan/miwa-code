import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:8765';
const login=async account=>{const r=await fetch(base+'/__preview/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];};
const a=await login('employeeA'),b=await login('employeeB');
const call=async(cookie,path,method='GET',body)=>{const r=await fetch(base+'/api/v1/selection-workspace'+path,{method,headers:{cookie,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
const bootstrap=await call(a,'/bootstrap');assert.equal(bootstrap.status,200);assert.equal(bootstrap.body.isAdmin||false,false);
const attributes=bootstrap.body.itemAttributes;assert.ok(attributes.length>0);
const XLSX=(await import('xlsx')).default;
const axis=attributes.find(x=>x.name==='Colour')||attributes[0];
const matrix=[['SKU ID',axis.name,'采购价','净重(g)','SKU图片链接'],['iso001','隔离蓝',0,400,'http://127.0.0.1:8765/assets/brand/miwa-company-logo-preview.png'],['iso002','隔离白',14.5,410,'http://127.0.0.1:8765/assets/brand/miwa-company-logo-preview.png']];
const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(matrix),'SKU');
const results=[];
for(const type of ['xlsx','xls','csv']){
 const bytes=type==='csv'?Buffer.from('\uFEFF'+XLSX.utils.sheet_to_csv(book.Sheets.SKU)):XLSX.write(book,{type:'buffer',bookType:type==='xls'?'biff8':type});
 await writeFile(new URL('../../../../../.local/sku-acceptance/erp-skus.'+type,import.meta.url),bytes);
 const parsed=await call(a,'/sku-file','POST',{filename:'erp-skus.'+type,base64:bytes.toString('base64')});assert.equal(parsed.status,200,JSON.stringify(parsed.body));assert.equal(parsed.body.skus.length,2);
 const p=parsed.body;const data={custom_商品长标题中文:'隔离SKU验收（非正式商品）',has_variants:true,skus:p.skus.map(s=>({...s,confirmed:true})),skuSourceFiles:[p.source],specificationAttributes:p.specificationAttributes,fixedSpecifications:p.fixedSpecifications};
 const created=await call(a,'/records','POST',{data,requestKey:crypto.randomUUID()});assert.equal(created.status,201,JSON.stringify(created.body));
 const path='/records/'+encodeURIComponent(created.body.id);const loaded=await call(a,path);assert.equal(loaded.status,200);assert.equal(loaded.body.data.skus[0].confirmed,true);assert.equal(loaded.body.data.skus[0].cost,0);
 assert.equal((await call(b,path)).status,404);assert.equal((await call(b,path,'PATCH',{data,version:created.body.version})).status,404);
 const saved=await call(a,path,'PATCH',{data:loaded.body.data,version:loaded.body.version});assert.equal(saved.status,200,JSON.stringify(saved.body));
 assert.equal((await call(a,path,'PATCH',{data:loaded.body.data,version:loaded.body.version})).status,409);
 const after=await call(a,path);assert.equal(after.body.data.skuSourceFiles[0].sha256,p.source.sha256);assert.equal(after.body.data.skus[1].confirmed,true);
 results.push({type,id:created.body.id,imported:2,saved:true,reloaded:true,otherEmployeeRead:404,otherEmployeeWrite:404,staleVersion:409});
}
await writeFile(new URL('../../../../../.local/sku-acceptance/api-results.json',import.meta.url),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));


