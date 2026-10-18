import { randomUUID } from "node:crypto";
import pool, { withTransaction } from "../../db.js";
import { normalizeProductEntry, buildSkuEntries, readinessWarnings } from "./product-entry-contract.js";
import { evaluateProductEntryReadiness, evaluateProductPublicationStatus } from "./product-entry-status-service.js";

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
    ",metadata,created_at,updated_at,"+(shape.variant==="existing-lifecycle"?"lifecycle_status":"status")+" AS entry_lifecycle";
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

function comparableSkuAttributes(attributes) {
  return JSON.stringify(
    Object.entries(attributes||{})
      .filter(([key])=>!key.startsWith("__aione"))
      .sort(([a],[b])=>a.localeCompare(b))
  );
}

// Editing SKU specifications is routine in an unpublished draft.
// A Product that has entered a channel workflow or holds SKU-bound assets must
// use the separate, audited SKU-change workflow instead.
async function draftSkuCanChange(client, existing, shape) {
  if(!existing) return true;
  if(existing.entry_lifecycle!=="draft") return false;
  const relation=shape.variant==="existing-lifecycle"?"channel_listings":"listings";
  const linked=await client.query(
    "SELECT EXISTS(SELECT 1 FROM public."+relation+" WHERE product_id=$1) AS linked",
    [existing.id]
  );
  if(linked.rows[0]?.linked) return false;
  // Both supported ProductAsset schemas now carry canonical sku_id after
  // migration 0103. Once any image is bound, the SKU set must not be edited
  // or deleted through the generic manual-entry draft editor.
  const assets=await client.query(
    "SELECT EXISTS(SELECT 1 FROM public.product_assets WHERE product_id=$1 AND sku_id IS NOT NULL) AS linked",
    [existing.id]
  );
  if(assets.rows[0]?.linked) return false;
  return true;
}

async function syncSku(client, productId, code, entries, source, shape, allowDraftChange) {
  const dataCol=shape.skuDataCol, statusCol=shape.skuStatusCol;
  const existing=await client.query(
    "SELECT id,sku_code,"+(shape.skuNo?"sku_no,":"")+dataCol+" AS attributes FROM public.product_skus WHERE product_id=$1 ORDER BY sku_code FOR UPDATE",
    [productId]
  );
  for(const item of existing.rows)
    if(!item.attributes?.__aioneManualEntry)
      throw error("sku_external_conflict","此商品已有其他来源SKU，不能自动覆盖。",409);
  // Preserve existing SKU database identity and sku_code when the specification order changes.
  // Never match an existing SKU by its row number: the meaning of that position can change.
  const byIdentity=new Map(existing.rows.map(row=>{
    const attrs=Object.fromEntries(Object.entries(row.attributes||{}).filter(([k])=>!k.startsWith("__aione")));
    return [comparableSkuAttributes(attrs),row];
  }));
  // sku_no is authoritative in the existing-lifecycle schema. Old SKUs can be
  // MHxxxxxxx-01 while the editable business code is zjl238; slicing the
  // business-code prefix would produce NaN and reuse an occupied sku_no=1.
  // In the alternate schema, use a complete numeric suffix (never offset slices).
  const existingNumbers=existing.rows.map(row=>{
    if(shape.skuNo)return Number(row.sku_no);
    const match=String(row.sku_code||"").match(/-(?:c)?(\d+)$/i);
    return match?Number(match[1]):null;
  }).filter(n=>Number.isSafeInteger(n)&&n>0);
  let nextNumber=Math.max(0,existing.rows.length,...existingNumbers)+1;
  const output=[];
  for(const entry of entries){
    const identity=comparableSkuAttributes(entry.attributes);
    const old=byIdentity.get(identity);
    if(!old&&!allowDraftChange)
      throw error("sku_identity_changed","此商品已进入渠道流程，不能直接更改SKU规格组合。",409);
    // Reuse an existing SKU's database ID and code without re-numbering.
    // New rows always receive a never-used, increasing serial for this product.
    const serial=old?null:nextNumber++;
    const skuCode=old?.sku_code || code+"-c"+String(serial).padStart(2,"0");
    const data={...entry.attributes,__aioneManualEntry:true,__aioneSource:source};
    const name=Object.values(entry.attributes).join(" / ")||"单规格";
    if(old){
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
          [id,productId,skuCode,serial,name,JSON.stringify(data)]
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
  for(const row of existing.rows)if(!keep.has(row.sku_code)){
    if(!allowDraftChange) throw error("sku_set_changed","此商品已进入发布或关联渠道资料，删除SKU需要专门审核。",409);
    await client.query("DELETE FROM public.product_skus WHERE id=$1",[row.id]);
  }
  return output;
}

export async function saveManualProduct(input, context={}, options={}) {
  const p=normalizeProductEntry(input);
  return withTransaction(async client=>{
    const shape=await assertCurrentProductEntrySchema(client);
    // Lock per business code, to protect concurrent manual/save and batch imports.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",["aione-manual:"+p.localCode]);
    const identity=options.productId?await client.query("SELECT "+productFields(shape)+" FROM public.products WHERE id::text=$1 FOR UPDATE",[String(options.productId)]):null;
    const existing=options.productId?(identity.rows[0]||null):await getProductByLocalCode(client,p.localCode,shape,true);
    if(existing && options.productId && !metadataOf(existing))throw error("product_not_in_manual_entry","该商品不是此录入流程所建，禁止修改。",409);
    const previousCode=existing?metadataOf(existing)?.localCode:null;
    const renamed=Boolean(existing&&previousCode!==p.localCode);
    if(renamed){
      if(existing.entry_lifecycle!=="draft")throw error("local_code_locked","已发布或非草稿商品不能修改货号。",409);
      const conflict=await getProductByLocalCode(client,p.localCode,shape,true);
      if(conflict && String(conflict.id)!==String(existing.id))throw error("product_exists","新商品货号已被使用。",409);
      if(!(await draftSkuCanChange(client,existing,shape)))throw error("local_code_linked","该商品已有渠道或SKU图片关联，不能直接改货号。",409);
    }
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
    if(renamed){
      // SKU identities (UUID) remain stable; only business-facing SKU codes are renamed.
      const rows=await client.query("SELECT id,sku_code FROM public.product_skus WHERE product_id=$1 FOR UPDATE",[id]);
      for(const row of rows.rows){
        const oldCode=String(row.sku_code);
        if(oldCode.startsWith(existing.product_code+"-")){
          // Canonical MH... SKU codes are permanent identities: renaming an
          // employee-facing localCode must never alter them.
          continue;
        }
        if(!oldCode.startsWith(previousCode+"-"))throw error("sku_external_conflict","SKU编码不属于原货号，无法安全更名。",409);
        const suffix=oldCode.slice(previousCode.length);
        await client.query("UPDATE public.product_skus SET sku_code=$2 WHERE id=$1",[row.id,p.localCode+suffix]);
      }
    }
    const sku=await syncSku(client,id,p.localCode,buildSkuEntries(p),options.source||"aione-web",shape,await draftSkuCanChange(client,existing,shape));
    return {product:{...p,id,productCode,version},skus:sku,reused:!!existing,warnings:readinessWarnings(p)};
  }).catch(e=>{
    // Do not expose raw PostgreSQL constraint/column names to employees.
    // withTransaction has already rolled back all product and SKU edits.
    if(e.code==="23505"&&e.constraint==="product_skus_product_id_sku_no_key")
      throw error("sku_serial_conflict","SKU序号冲突，已取消本次保存。请刷新后重试；如果继续发生，请联系管理员。",409);
    throw e;
  });
}

// Read-only, bulk product status projection. Missing integrations stay "待核实".
async function attachDerivedStatuses(products, shape) {
  if (!products.length) return products;
  const ids=products.map(p=>p.id);
  let images=new Map(), imagePreviews=new Map(), publications=new Map(), assetAvailable=false, listingAvailable=false;
  try {
    const q=await pool.query("SELECT product_id::text AS product_id, COUNT(*)::int AS n FROM public.product_assets WHERE product_id::text = ANY($1::text[]) AND asset_type='image' AND archived_at IS NULL GROUP BY product_id",[ids]);
    images=new Map(q.rows.map(row=>[String(row.product_id),Number(row.n)>0]));assetAvailable=true;
  } catch(error) {
    // Legacy schema may lack archived_at; try its canonical product-assets table.
    if(error.code==="42703"){
      try {
        const q=await pool.query("SELECT product_id::text AS product_id, COUNT(*)::int AS n FROM public.product_assets WHERE product_id::text = ANY($1::text[]) AND asset_type='image' GROUP BY product_id",[ids]);
        images=new Map(q.rows.map(row=>[String(row.product_id),Number(row.n)>0]));assetAvailable=true;
      }catch { /* Do not turn an unknown into a false "missing". */ }
    }
  }
  // One ProductAsset per product supplies a representative image without
  // duplicating image state in product metadata or making N+1 API calls.
  try {
    const previews=await pool.query(
      `SELECT DISTINCT ON (product_id)
                product_id::text AS product_id, id::text AS asset_id
         FROM public.product_assets
        WHERE product_id::text=ANY($1::text[])
          AND asset_type='image'
          AND asset_role <> 'source_sku_image'
          AND archived_at IS NULL
        ORDER BY product_id,
                 CASE
                   WHEN metadata->>'imagePurpose'='system_primary' THEN 0
                   WHEN asset_role='source_main_image' THEN 1
                   ELSE 2
                 END,
                 asset_no ASC`,
      [ids]
    );
    imagePreviews=new Map(previews.rows.map(row=>[String(row.product_id),row.asset_id]));
  }catch(error){
    if(error.code==="42703"){
      // Older baseline may not carry archived_at. Never invent an image URL.
      try{
        const previews=await pool.query(
          `SELECT DISTINCT ON (product_id)
                    product_id::text AS product_id,id::text AS asset_id
             FROM public.product_assets
            WHERE product_id::text=ANY($1::text[]) AND asset_type='image'
              AND asset_role <> 'source_sku_image'
            ORDER BY product_id,asset_no ASC`,[ids]
        );
        imagePreviews=new Map(previews.rows.map(row=>[String(row.product_id),row.asset_id]));
      }catch {/* image thumbnail remains unavailable */}
    }
  }
  try {
    if(shape.variant==="existing-lifecycle"){
      const q=await pool.query("SELECT product_id::text AS product_id, channel,shop_ref,lifecycle_status,external_listing_id,last_published_at FROM public.channel_listings WHERE product_id::text=ANY($1::text[]) AND archived_at IS NULL",[ids]);
      for(const row of q.rows){const key=String(row.product_id);if(!publications.has(key))publications.set(key,[]);publications.get(key).push(row);}
    }else{
      const q=await pool.query("SELECT l.product_id::text AS product_id,COALESCE(pl.code,'') AS channel,st.name AS shop_ref,l.status,l.external_item_id,l.listing_url,l.published_at FROM public.listings l JOIN public.stores st ON st.id=l.store_id LEFT JOIN public.platforms pl ON pl.id=st.platform_id WHERE l.product_id::text=ANY($1::text[])",[ids]);
      for(const row of q.rows){const key=String(row.product_id);if(!publications.has(key))publications.set(key,[]);publications.get(key).push(row);}
    }
    listingAvailable=true;
  }catch { /* Unknown listing state is never treated as unpublished. */ }
  return products.map(p=>({
    ...p,
    representativeImageAssetId:imagePreviews.get(String(p.id))||null,
    readiness:evaluateProductEntryReadiness(p,assetAvailable?(images.get(String(p.id))||false):null),
    publication:evaluateProductPublicationStatus(publications.get(String(p.id))||[],{sourceAvailable:listingAvailable})
  }));
}

export async function listManualProducts({query="",limit=100,offset=0,category=""}={}) {
  const shape=await assertCurrentProductEntrySchema(pool);
  const q=String(query||"").trim();
  const lim=Math.min(201,Math.max(1,Number(limit)||100)),skip=Math.max(0,Number(offset)||0);
  const r=await pool.query("SELECT "+productFields(shape)+" FROM public.products WHERE ($1='' OR product_code ILIKE $2 OR "+shape.nameCol+" ILIKE $2 OR metadata->'manualEntry'->>'localCode' ILIKE $2) AND ($5='' OR metadata->'manualEntry'->>'category'=$5) ORDER BY updated_at DESC LIMIT $3 OFFSET $4",[q,"%"+q+"%",lim,skip,String(category||"").trim()]);
  return attachDerivedStatuses(r.rows.map(unwrap),shape);
}
// Read-only real SKU index. Reads canonical Product/SKU identities and the existing
// manual-entry price overrides; does not claim default stock is warehouse stock.
export async function listManualSkus({query="",limit=100,offset=0}={}){
 const shape=await assertCurrentProductEntrySchema(pool);
 const q=String(query||"").trim().slice(0,160),size=Math.min(100,Math.max(1,Number(limit)||100));
 const skip=Math.min(100000,Math.max(0,Number(offset)||0));
 const rows=await pool.query(
  "SELECT s.id::text AS id,s.sku_code AS sku_code,s.name AS sku_name,s."+shape.skuDataCol+" AS sku_attributes,p.id::text AS product_id,p.product_code AS product_code,p."+shape.nameCol+" AS name_zh,p.metadata AS product_metadata"+
  " FROM public.product_skus s JOIN public.products p ON p.id=s.product_id"+
  " WHERE ($1='' OR s.sku_code ILIKE $2 OR s.name ILIKE $2 OR p.product_code ILIKE $2 OR p."+shape.nameCol+" ILIKE $2 OR p.metadata->'manualEntry'->>'localCode' ILIKE $2)"+
  " ORDER BY s.sku_code,s.id LIMIT $3 OFFSET $4",
  [q,"%"+q+"%",size+1,skip]
 );
 const hasMore=rows.rows.length>size;
 const items=rows.rows.slice(0,size).map(r=>{
  const source=r.product_metadata?.manualEntry,own=Boolean(source&&typeof source==="object");
  const attributes=Object.fromEntries(Object.entries(r.sku_attributes||{}).filter(([key])=>!key.startsWith("__aione")));
  const identity=Object.entries(attributes).map(([k,v])=>k+"="+v).join("|")||"default";
  const selected=Array.isArray(source?.skuOverrides)?source.skuOverrides.find(x=>x.identity===identity):null;
  const independent=source?.extraAttributes?.independentSkuPricing==="true";
  const price=own?(independent?(selected?.priceJpy??source.salePriceJpy??null):(source.salePriceJpy??null)):null;
  return {
   id:r.id,productId:r.product_id,number:r.sku_code,localCode:own?source.localCode:r.product_code,
   productName:r.name_zh||"",label:Object.values(attributes).map(String).join(" / ")||r.sku_name||"默认规格",
   price,stock:own?(selected?.stock??source.defaultStock??null):null,
   stockKind:own?"draft_default_not_warehouse":"unverified",
   cost:own?(selected?.purchaseCostCny??source.purchaseUnitCostCny??null):null,
   weight:own?(selected?.weightG??source.weightG??null):null,
   readOnly:!own
  };
 });
 return {items,hasMore};
}
export async function getManualProduct(ref) {
  const shape=await assertCurrentProductEntrySchema(pool);
  const result=await pool.query("SELECT "+productFields(shape)+" FROM public.products WHERE id::text=$1 OR product_code=$1 OR metadata->'manualEntry'->>'localCode'=$1",[String(ref)]);
  if(result.rowCount!==1) throw error("product_not_found","找不到该商品或者出现重复货号。",404);
  const product=unwrap(result.rows[0]);
  if(product.readOnly)throw error("product_not_in_manual_entry","该商品由原有业务流程创建，请使用已有商品工作台。",409);
  const sku=await pool.query("SELECT id,sku_code,name,"+shape.skuDataCol+" AS attributes,"+shape.skuStatusCol+" AS status FROM public.product_skus WHERE product_id=$1 ORDER BY sku_code",[result.rows[0].id]);
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

/**
 * Owner-approved first live Rakuten pilot draft, 2026-10-14.
 * This is a narrowly scoped ONE-TIME data completion for zjl238 in 永井GD,
 * not general AI auto-copy, and never a claim that the genre is RMS-verified.
 * The permanent object remains products.metadata.manualEntry.
 */
export const APPROVED_ZJL238_RAKUTEN_DRAFT = Object.freeze({
  localCode: "zjl238",
  targetShopRef: "永井GD",
  rakutenTitle: "蛇口 凍結防止カバー 屋外 水栓 保温 防寒 水道管 凍結対策 1個 2個セット",
  rakutenGenreId: "565305"
});

export function approvedZjl238MissingFields(current) {
  const approved=APPROVED_ZJL238_RAKUTEN_DRAFT;
  if(current?.localCode!==approved.localCode || current?.targetShopRef!==approved.targetShopRef) {
    throw error("rakuten_pilot_product_mismatch","仅允许给永井GD的 zjl238 草稿补齐已确认字段。",403);
  }
  const patch={};
  for(const key of ["rakutenTitle","rakutenGenreId"]) {
    // Never overwrite existing or concurrent manual values.
    if(!String(current[key]??"").trim()) patch[key]=approved[key];
  }
  return patch;
}

export async function applyApprovedZjl238RakutenDraft(productRef, context={}, expectedVersion) {
  const expected=Number(expectedVersion);
  if(!Number.isSafeInteger(expected)||expected<1) {
    throw error("version_required","自动补全必须提供当前商品草稿版本。",400);
  }
  return withTransaction(async client=>{
    const shape=await assertCurrentProductEntrySchema(client);
    const found=await client.query(
      "SELECT "+productFields(shape)+" FROM public.products WHERE id::text=$1 FOR UPDATE",
      [String(productRef)]
    );
    if(!found.rowCount)throw error("product_not_found","未找到要补全的商品草稿。",404);
    const row=found.rows[0],current=metadataOf(row);
    if(!current)throw error("product_not_in_manual_entry","商品不属于现有AIONE单品录入对象。",409);
    const patch=approvedZjl238MissingFields(current);
    if(row.entry_lifecycle!=="draft")throw error("product_not_draft","非草稿商品不允许自动修改。",409);
    const version=Number(row.metadata.manualEntryVersion||1);
    if(version!==expected)throw error("product_version_conflict","商品版本已变化，请重新打开后再核对。",409);
    const fields=Object.keys(patch);
    if(!fields.length) {
      return {ok:true,applied:false,fields:[],genreVerification:"pending_rms",
        product:unwrap(row)};
    }
    const nextManual={...current,...patch};
    const nextMetadata={
      ...row.metadata,
      manualEntry:nextManual,
      manualEntryVersion:version+1,
      rakutenDraftSuggestionAudit:{
        source:"owner_approved_2026_10_14",
        productLocalCode:APPROVED_ZJL238_RAKUTEN_DRAFT.localCode,
        shopRef:APPROVED_ZJL238_RAKUTEN_DRAFT.targetShopRef,
        fields,
        genreVerification:"pending_rms",
        actorPersonId:context.personId||null,
        savedAt:new Date().toISOString()
      }
    };
    if(shape.variant==="existing-lifecycle") {
      await client.query(
        "UPDATE public.products SET metadata=$2::jsonb,updated_at=NOW(),record_version=record_version+1 WHERE id=$1",
        [row.id,JSON.stringify(nextMetadata)]
      );
    } else {
      await client.query(
        "UPDATE public.products SET metadata=$2::jsonb,name_ja=$3,updated_at=NOW() WHERE id=$1",
        [row.id,JSON.stringify(nextMetadata),nextManual.rakutenTitle]
      );
    }
    // No product_skus, product_assets, channel mappings, ItemAPI or InventoryAPI writes.
    return {ok:true,applied:true,fields,genreVerification:"pending_rms",
      product:{...unwrap(row),...patch,version:version+1}};
  });
}
