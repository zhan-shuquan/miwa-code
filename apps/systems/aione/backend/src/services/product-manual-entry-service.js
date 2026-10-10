import { randomUUID } from "node:crypto";
import pool, { withTransaction } from "../../db.js";
import { normalizeProductEntry, buildSkuEntries, readinessWarnings } from "./product-entry-contract.js";

function error(code, message, statusCode = 400) { const e = new Error(message);e.code=code;e.statusCode=statusCode;return e; }
function metadataOf(row) { const raw=row?.metadata?.manualEntry;return raw && typeof raw==="object" ? raw : null; }
// Both existing schemas remain Product/SKU truth; this is a SQL adapter, not a second data model.
// Use the legacy columns when an existing runtime still uses the lifecycle services.
// No migration, table duplication or automatic external publication is performed here.
export async function assertCurrentProductEntrySchema(db) {
  const q=await db.query(
    "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[])",
    [["products","product_skus","listings","channel_listings"]]
  );
  const m=new Map();
  for(const {table_name,column_name} of q.rows){
    if(!m.has(table_name))m.set(table_name,new Set());
    m.get(table_name).add(column_name);
  }
  const p=m.get("products")||new Set(),s=m.get("product_skus")||new Set();
  const sharedProduct=["id","product_code","metadata","created_at","updated_at"];
  const sharedSku=["id","product_id","sku_code","name"];
  const common=[...sharedProduct.filter(x=>!p.has(x)).map(x=>"products."+x),
    ...sharedSku.filter(x=>!s.has(x)).map(x=>"product_skus."+x)];
  if(common.length)throw error("product_entry_schema_mismatch","商品数据库缺少字段："+common.join(", "),503);
  if(p.has("name")&&p.has("lifecycle_status")&&s.has("sku_data")&&s.has("lifecycle_status")&&s.has("sku_no"))
    return {variant:"existing-lifecycle",nameCol:"name",skuDataCol:"sku_data",skuStatusCol:"lifecycle_status",skuNo:true};
  if(p.has("name_zh")&&p.has("name_ja")&&p.has("status")&&s.has("attributes")&&s.has("status"))
    return {variant:"current-baseline",nameCol:"name_zh",skuDataCol:"attributes",skuStatusCol:"status",skuNo:false};
  throw error("product_entry_schema_mismatch","AIONE商品表字段结构尚不兼容，已阻止写入。",503);
}
function productFields(shape){
  return "id,product_code,"+shape.nameCol+" AS name_zh,"+
    (shape.variant==="current-baseline"?"name_ja":"NULL::text AS name_ja")+
    ",metadata,created_at,updated_at";
}
async function getProductByLocalCode(client,code,shape,lock=false){
  const q=await client.query("SELECT "+productFields(shape)+
    " FROM public.products WHERE metadata->'manualEntry'->>'localCode'=$1"+
    (lock?" FOR UPDATE":""),[code]);
  if(q.rowCount>1)throw error("duplicate_business_code","相同业务货号出现多个商品，已阻止操作。",409);
  return q.rows[0]||null;
}
function unwrap(row) {
  const p=metadataOf(row);
  if(!p) return {id:row.id,productCode:row.product_code,localCode:"",nameZh:row.name_zh||row.name_ja||"",salePriceJpy:null,autoPublish:false,version:null,readOnly:true,updatedAt:row.updated_at};
  return {...p,id:row.id,productCode:row.product_code,version:Number(row.metadata.manualEntryVersion||1),readOnly:false,updatedAt:row.updated_at};
}
async function insertProductCode(client) {
  await client.query("SELECT pg_advisory_xact_lock(793833102)");
  const result=await client.query("SELECT COALESCE(MAX((SUBSTRING(product_code FROM 3))::integer),0) AS n FROM public.products WHERE product_code ~ '^MH[0-9]{7}$'");
  const n=Number(result.rows[0].n)+1;
  if(n>9999999)throw error("product_code_exhausted","商品内部编码已用尽。",409);
  return "MH"+String(n).padStart(7,"0");
}
async function syncSku(client, productId, code, entries, source, shape) {
  const dataCol=shape.skuDataCol, statusCol=shape.skuStatusCol;
  const existing=await client.query(
    "SELECT id,sku_code,"+dataCol+" AS attributes FROM public.product_skus WHERE product_id=$1 ORDER BY sku_code FOR UPDATE",
    [productId]
  );
  const byCode=new Map(existing.rows.map(x=>[x.sku_code,x]));
  for(const item of existing.rows)
    if(!item.attributes?.__aioneManualEntry)
      throw error("sku_external_conflict","此商品已有其他来源SKU，不能自动覆盖。",409);
  const output=[];
  for(const entry of entries){
    const skuCode=code+"-"+String(entry.index).padStart(2,"0");
    const data={...entry.attributes,__aioneManualEntry:true,__aioneSource:source};
    const name=Object.values(entry.attributes).join(" / ")||"单规格";
    const old=byCode.get(skuCode);
    if(old){
      const previous=Object.fromEntries(Object.entries(old.attributes||{}).filter(([k])=>!k.startsWith("__aione")));
      if(JSON.stringify(previous)!==JSON.stringify(entry.attributes))
        throw error("sku_identity_changed","SKU规格身份变化，需要专门审核，不得直接覆盖。",409);
      await client.query(
        "UPDATE public.product_skus SET name=$2,"+dataCol+"=$3::jsonb,"+statusCol+"='active' WHERE id=$1",
        [old.id,name,JSON.stringify(data)]
      );
      output.push({id:old.id,skuCode});
    }else{
      const id=shape.skuNo?"sku_"+randomUUID():randomUUID();
      if(shape.skuNo){
        await client.query(
          "INSERT INTO public.product_skus(id,product_id,sku_code,sku_no,name,sku_data,lifecycle_status) VALUES($1,$2,$3,$4,$5,$6::jsonb,'active')",
          [id,productId,skuCode,entry.index,name,JSON.stringify(data)]
        );
      }else{
        await client.query(
          "INSERT INTO public.product_skus(id,product_id,sku_code,name,attributes,status) VALUES($1,$2,$3,$4,$5::jsonb,'active')",
          [id,productId,skuCode,name,JSON.stringify(data)]
        );
      }
      output.push({id,skuCode});
    }
  }
  const keep=new Set(output.map(x=>x.skuCode));
  for(const row of existing.rows)if(!keep.has(row.sku_code))
    throw error("sku_set_changed","SKU组合已更改，旧SKU需另行审核，不会自动删除。",409);
  return output;
}

export async function saveManualProduct(input, context={}, options={}) {
  const p=normalizeProductEntry(input);
  return withTransaction(async client=>{
    const shape=await assertCurrentProductEntrySchema(client);
    // Lock per business code, to protect concurrent manual/save and batch imports.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",["aione-manual:"+p.localCode]);
    const existing=await getProductByLocalCode(client,p.localCode,shape,true);
    const expected=options.expectedVersion;
    if(existing && expected!==undefined && Number(expected)!==Number(existing.metadata?.manualEntryVersion||1))
      throw error("product_version_conflict","商品已有新版本，刷新再确认；旧表不能覆盖新数据。",409);
    if(existing && !metadataOf(existing)) throw error("business_code_ownership_conflict","该货号关联的商品并非本录入流程所建，需人工确认。",409);
    if(!existing && options.updateOnly)throw error("product_not_found","商品不存在，不能执行编辑。",404);
    if(existing && options.createOnly)throw error("product_exists","商品货号已存在。",409);
    const version=existing?Number(existing.metadata.manualEntryVersion||1)+1:1;
    const metadata={...(existing?.metadata||{}),manualEntry:p,manualEntryVersion:version,entrySource:options.source||"aione-web",autoPublishAuthorized:false,publishStatus:"draft_only"};
    const id=existing?.id||(shape.variant==='existing-lifecycle'?'prd_'+randomUUID():randomUUID());
    let productCode=existing?.product_code;
    if(existing){
      if(shape.variant==="existing-lifecycle"){
        await client.query(
          "UPDATE public.products SET name=$2,metadata=$3::jsonb,updated_at=NOW(),record_version=record_version+1 WHERE id=$1",
          [id,p.nameZh,JSON.stringify(metadata)]
        );
      }else{
        await client.query("UPDATE public.products SET name_zh=$2,name_ja=$3,metadata=$4::jsonb,updated_at=NOW() WHERE id=$1",
          [id,p.nameZh,p.rakutenTitle||null,JSON.stringify(metadata)]);
      }
    }else{
      productCode=await insertProductCode(client);
      if(shape.variant==="existing-lifecycle"){
        await client.query(
          "INSERT INTO public.products(id,product_code,name,lifecycle_status,metadata,source_system) VALUES($1,$2,$3,'draft',$4::jsonb,'aione')",
          [id,productCode,p.nameZh,JSON.stringify(metadata)]
        );
      }else{
        await client.query(
          "INSERT INTO public.products(id,product_code,name_zh,name_ja,status,metadata) VALUES($1,$2,$3,$4,'draft',$5::jsonb)",
          [id,productCode,p.nameZh,p.rakutenTitle||null,JSON.stringify(metadata)]
        );
      }
    }
    const sku=await syncSku(client,id,productCode,buildSkuEntries(p),options.source||"aione-web",shape);
    return {product:{...p,id,productCode,version},skus:sku,reused:!!existing,warnings:readinessWarnings(p)};
  });
}
export async function listManualProducts({query="",limit=100,offset=0}={}) {
  const shape=await assertCurrentProductEntrySchema(pool);
  const q=String(query||"").trim();
  const lim=Math.min(201,Math.max(1,Number(limit)||100)),skip=Math.max(0,Number(offset)||0);
  const r=await pool.query("SELECT "+productFields(shape)+" FROM public.products WHERE ($1='' OR product_code ILIKE $2 OR "+shape.nameCol+" ILIKE $2 OR metadata->'manualEntry'->>'localCode' ILIKE $2) ORDER BY updated_at DESC LIMIT $3 OFFSET $4",[q,"%"+q+"%",lim,skip]);
  return r.rows.map(unwrap);
}
export async function getManualProduct(ref) {
  const shape=await assertCurrentProductEntrySchema(pool);
  const result=await pool.query("SELECT "+productFields(shape)+" FROM public.products WHERE id::text=$1 OR product_code=$1 OR metadata->'manualEntry'->>'localCode'=$1",[String(ref)]);
  if(result.rowCount!==1) throw error("product_not_found","找不到该商品或者出现重复货号。",404);
  const product=unwrap(result.rows[0]);
  if(product.readOnly)throw error("product_not_in_manual_entry","该商品由原有业务流程创建，请使用已有商品工作台。",409);
  const sku=await pool.query("SELECT sku_code,name,"+shape.skuDataCol+" AS attributes,"+shape.skuStatusCol+" AS status FROM public.product_skus WHERE product_id=$1 ORDER BY sku_code",[result.rows[0].id]);
  return {product,skus:sku.rows,warnings:readinessWarnings(product)};
}
export async function previewImportProducts(items) {
  const shape=await assertCurrentProductEntrySchema(pool);
  const out=[];
  for(const p of items){
    const q=await pool.query("SELECT "+productFields(shape)+" FROM public.products WHERE metadata->'manualEntry'->>'localCode'=$1 LIMIT 2",[p.localCode]);
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
