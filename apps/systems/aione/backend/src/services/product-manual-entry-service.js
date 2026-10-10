import { randomUUID } from "node:crypto";
import pool, { withTransaction } from "../../db.js";
import { normalizeProductEntry, buildSkuEntries, readinessWarnings } from "./product-entry-contract.js";

function error(code, message, statusCode = 400) { const e = new Error(message);e.code=code;e.statusCode=statusCode;return e; }
function metadataOf(row) { const raw=row?.metadata?.manualEntry;return raw && typeof raw==="object" ? raw : null; }
const REQUIRED = {
  products:["id","product_code","name_zh","name_ja","status","metadata","created_at","updated_at"],
  product_skus:["id","product_id","sku_code","name","attributes","status"],
  product_assets:["id","product_id"],
  listings:["id","product_id","store_id","status"]
};

export async function assertCurrentProductEntrySchema(db) {
  const query=await db.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name = ANY($1::text[])",[Object.keys(REQUIRED)]);
  const tables=new Map(Object.keys(REQUIRED).map(t=>[t,new Set()]));
  for(const r of query.rows) tables.get(r.table_name)?.add(r.column_name);
  const missing=Object.entries(REQUIRED).flatMap(([t,cols])=>cols.filter(c=>!tables.get(t).has(c)).map(c=>t+"."+c));
  if(missing.length) throw error("product_entry_schema_mismatch","CURRENT 商品数据库字段不兼容。请先只读核验Schema；缺少："+missing.join(", "),503);
}
const BASIC_FIELDS="id,product_code,name_zh,name_ja,status,metadata,created_at,updated_at";
async function getProductByLocalCode(client,code,lock=false) {
  const q=await client.query("SELECT "+BASIC_FIELDS+" FROM public.products WHERE metadata->'manualEntry'->>'localCode'=$1"+(lock?" FOR UPDATE":""),[code]);
  if(q.rowCount>1) throw error("duplicate_business_code","数据库存在重复业务货号，已停止操作。",409);
  return q.rows[0]||null;
}
function unwrap(row) {
  const p=metadataOf(row);
  if(!p) return null;
  return {...p,id:row.id,productCode:row.product_code,version:Number(row.metadata.manualEntryVersion||1),updatedAt:row.updated_at};
}
async function insertProductCode(client) {
  await client.query("SELECT pg_advisory_xact_lock(793833102)");
  const result=await client.query("SELECT COALESCE(MAX((SUBSTRING(product_code FROM 3))::integer),0) AS n FROM public.products WHERE product_code ~ '^MH[0-9]{7}$'");
  const n=Number(result.rows[0].n)+1;
  if(n>9999999)throw error("product_code_exhausted","商品内部编码已用尽。",409);
  return "MH"+String(n).padStart(7,"0");
}
async function syncSku(client, productId, code, entries, source) {
  const existing=await client.query("SELECT id,sku_code,attributes FROM public.product_skus WHERE product_id=$1 ORDER BY sku_code FOR UPDATE",[productId]);
  const byCode=new Map(existing.rows.map(x=>[x.sku_code,x]));
  // Fail-closed: never overwrite or erase SKU belonging to a different origin.
  for(const item of existing.rows) {
    if(!item.attributes?.__aioneManualEntry) throw error("sku_external_conflict","商品存在非在线录入创建的SKU，不能自动覆盖。",409);
  }
  const output=[];
  for(const entry of entries) {
    const skuCode=code+"-"+String(entry.index).padStart(2,"0");
    const skuData={...entry.attributes,__aioneManualEntry:true,__aioneSource:source};
    const name=Object.values(entry.attributes).join(" / ")||"单规格";
    const old=byCode.get(skuCode);
    if(old) {
      await client.query("UPDATE public.product_skus SET name=$2,attributes=$3::jsonb,status='active' WHERE id=$1",[old.id,name,JSON.stringify(skuData)]);
      output.push({id:old.id,skuCode});
    } else {
      const id=randomUUID();
      await client.query("INSERT INTO public.product_skus(id,product_id,sku_code,name,attributes,status) VALUES($1,$2,$3,$4,$5::jsonb,'active')",[id,productId,skuCode,name,JSON.stringify(skuData)]);
      output.push({id,skuCode});
    }
  }
  const keep=new Set(output.map(x=>x.skuCode));
  for(const row of existing.rows)if(!keep.has(row.sku_code)){
    // SKU is not deleted automatically, because listings/inventory may refer to it.
    throw error("sku_set_changed","SKU组合已更改，需先由负责人确认旧SKU关联关系，不能自动删改。",409);
  }
  return output;
}

export async function saveManualProduct(input, context={}, options={}) {
  const p=normalizeProductEntry(input);
  return withTransaction(async client=>{
    await assertCurrentProductEntrySchema(client);
    // Lock per business code, to protect concurrent manual/save and batch imports.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",["aione-manual:"+p.localCode]);
    const existing=await getProductByLocalCode(client,p.localCode,true);
    const expected=options.expectedVersion;
    if(existing && expected!==undefined && Number(expected)!==Number(existing.metadata?.manualEntryVersion||1))
      throw error("product_version_conflict","商品已有新版本，刷新再确认；旧表不能覆盖新数据。",409);
    if(existing && !metadataOf(existing)) throw error("business_code_ownership_conflict","该货号关联的商品并非本录入流程所建，需人工确认。",409);
    if(!existing && options.updateOnly)throw error("product_not_found","商品不存在，不能执行编辑。",404);
    if(existing && options.createOnly)throw error("product_exists","商品货号已存在。",409);
    const version=existing?Number(existing.metadata.manualEntryVersion||1)+1:1;
    const metadata={...(existing?.metadata||{}),manualEntry:p,manualEntryVersion:version,entrySource:options.source||"aione-web",autoPublishAuthorized:false,publishStatus:"draft_only"};
    const id=existing?.id||randomUUID();
    let productCode=existing?.product_code;
    if(existing){
      await client.query("UPDATE public.products SET name_zh=$2,name_ja=$3,metadata=$4::jsonb,updated_at=NOW() WHERE id=$1",[id,p.nameZh,p.rakutenTitle||null,JSON.stringify(metadata)]);
    }else{
      productCode=await insertProductCode(client);
      await client.query("INSERT INTO public.products(id,product_code,name_zh,name_ja,status,metadata) VALUES($1,$2,$3,$4,'draft',$5::jsonb)",[id,productCode,p.nameZh,p.rakutenTitle||null,JSON.stringify(metadata)]);
    }
    const sku=await syncSku(client,id,productCode,buildSkuEntries(p),options.source||"aione-web");
    return {product:{...p,id,productCode,version},skus:sku,reused:!!existing,warnings:readinessWarnings(p)};
  });
}
export async function listManualProducts({query="",limit=100,offset=0}={}) {
  await assertCurrentProductEntrySchema(pool);
  const q=String(query||"").trim();
  const lim=Math.min(201,Math.max(1,Number(limit)||100)),skip=Math.max(0,Number(offset)||0);
  const r=await pool.query("SELECT "+BASIC_FIELDS+" FROM public.products WHERE metadata ? 'manualEntry' AND ($1='' OR product_code ILIKE $2 OR name_zh ILIKE $2 OR metadata->'manualEntry'->>'localCode' ILIKE $2) ORDER BY updated_at DESC LIMIT $3 OFFSET $4",[q,"%"+q+"%",lim,skip]);
  return r.rows.map(unwrap);
}
export async function getManualProduct(ref) {
  await assertCurrentProductEntrySchema(pool);
  const result=await pool.query("SELECT "+BASIC_FIELDS+" FROM public.products WHERE id::text=$1 OR product_code=$1 OR metadata->'manualEntry'->>'localCode'=$1",[String(ref)]);
  if(result.rowCount!==1) throw error("product_not_found","找不到该商品或者出现重复货号。",404);
  const product=unwrap(result.rows[0]);
  if(!product)throw error("product_not_in_manual_entry","该商品由其他流程创建，请使用原有商品工作台。",409);
  const sku=await pool.query("SELECT sku_code,name,attributes,status FROM public.product_skus WHERE product_id=$1 ORDER BY sku_code",[result.rows[0].id]);
  return {product,skus:sku.rows,warnings:readinessWarnings(product)};
}
export async function previewImportProducts(items) {
  await assertCurrentProductEntrySchema(pool);
  const out=[];
  for(const p of items){
    const q=await pool.query("SELECT "+BASIC_FIELDS+" FROM public.products WHERE metadata->'manualEntry'->>'localCode'=$1 LIMIT 2",[p.localCode]);
    const existing=q.rows[0];
    out.push({localCode:p.localCode,nameZh:p.nameZh,action:q.rowCount>1?"blocked_duplicate":existing?"existing_requires_confirm":"new_draft",version:existing?.metadata?.manualEntryVersion||null,warnings:readinessWarnings(p)});
  }
  return out;
}
export async function importManualProducts(items, context={}) {
  if(!Array.isArray(items)||items.length>200) throw error("import_limit","批量导入最多200件商品。");
  const duplicates=new Set();
  for(const p of items){if(duplicates.has(p.localCode))throw error("batch_duplicate","上传文件中存在重复货号："+p.localCode);duplicates.add(p.localCode);}
  const results=[];
  for(const p of items){
    try { results.push({localCode:p.localCode,ok:true,...await saveManualProduct(p,context,{source:"aione-xlsx",createOnly:true})}); }
    catch(e) { results.push({localCode:p.localCode,ok:false,code:e.code||"import_failed",message:e.message}); }
  }
  return {results,successCount:results.filter(x=>x.ok).length,failedCount:results.filter(x=>!x.ok).length};
}
