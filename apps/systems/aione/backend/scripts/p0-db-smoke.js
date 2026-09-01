import assert from "node:assert/strict";
import crypto from "node:crypto";
import pool from "../db.js";

const runId = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const commit = process.argv.includes("--commit");
const id = (prefix) => `${prefix}-${runId}`;

async function main() {
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    const requiredTables = ["product_categories","product_opportunities","products","category_slots","channel_listings","publishing_jobs"];
    const tableCheck = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1::text[])`,
      [requiredTables]
    );
    const existing = new Set(tableCheck.rows.map((row) => row.table_name));
    assert.deepEqual(requiredTables.filter((name) => !existing.has(name)), []);

    const categoryId=id("cat-smoke"), opportunityId=id("opp-smoke"), productId=id("prd-smoke"), slotId=id("slot-smoke"), listingId=id("lst-smoke"), jobId=id("pub-smoke");
    await client.query(`INSERT INTO public.product_categories (id,code,name,status,target_slot_capacity,source_system) VALUES ($1,$2,$3,'active',12,'aione-smoke')`,[categoryId,`SMOKE-${runId}`,`P0 Smoke ${runId}`]);
    await client.query(`INSERT INTO public.product_opportunities (id,source_platform,source_ref,source_url,title,selection_mode,lifecycle_status,category_id,estimated_cost,estimated_sale_price,currency,qualification_data,source_system) VALUES ($1,'1688',$2,$3,$4,'direct','discovered',$5,1000,2980,'JPY',$6::jsonb,'aione-smoke')`,[opportunityId,`smoke-${runId}`,`https://example.invalid/${runId}`,`P0 Direct ${runId}`,categoryId,JSON.stringify({smoke_test:true})]);
    const inserted=await client.query(`SELECT id,lifecycle_status,estimated_sale_price FROM public.product_opportunities WHERE id=$1`,[opportunityId]);
    assert.equal(inserted.rowCount,1); assert.equal(inserted.rows[0].lifecycle_status,"discovered");
    const updated=await client.query(`UPDATE public.product_opportunities SET lifecycle_status='qualified',estimated_sale_price=3180,updated_at=NOW(),record_version=record_version+1 WHERE id=$1 RETURNING lifecycle_status,record_version`,[opportunityId]);
    assert.equal(updated.rows[0].record_version,2);
    await client.query(`INSERT INTO public.products (id,source_opportunity_id,category_id,name,lifecycle_status,source_platform,source_ref,source_url,cost_amount,currency,readiness_data,source_system) SELECT $1,id,category_id,title,'listing_ready',source_platform,source_ref,source_url,estimated_cost,currency,$2::jsonb,'aione-smoke' FROM public.product_opportunities WHERE id=$3`,[productId,JSON.stringify({listing_ready:true}),opportunityId]);
    await client.query(`INSERT INTO public.category_slots (id,category_id,slot_no,product_id,status) VALUES ($1,$2,1,$3,'occupied')`,[slotId,categoryId,productId]);
    await client.query(`INSERT INTO public.channel_listings (id,product_id,channel,shop_ref,lifecycle_status,current_price,currency,listing_data,source_system) VALUES ($1,$2,'rakuten','smoke-shop','ready',3180,'JPY',$3::jsonb,'aione-smoke')`,[listingId,productId,JSON.stringify({smoke_test:true})]);
    await client.query(`INSERT INTO public.publishing_jobs (id,listing_id,command_type,status,requested_by_kind,idempotency_key,payload,correlation_id) VALUES ($1,$2,'CREATE_LISTING','ready','system',$3,$4::jsonb,$5)`,[jobId,listingId,`p0-smoke-${runId}`,JSON.stringify({smoke_test:true}),`corr-${runId}`]);
    const chain=await client.query(`SELECT o.id opportunity_id,p.id product_id,l.id listing_id,j.id publishing_job_id,j.command_type FROM public.product_opportunities o JOIN public.products p ON p.source_opportunity_id=o.id JOIN public.channel_listings l ON l.product_id=p.id JOIN public.publishing_jobs j ON j.listing_id=l.id WHERE o.id=$1`,[opportunityId]);
    assert.equal(chain.rowCount,1); assert.equal(chain.rows[0].command_type,"CREATE_LISTING");
    await client.query(commit?"COMMIT":"ROLLBACK"); transactionOpen=false;
    console.log(JSON.stringify({ok:true,mode:commit?"commit":"rollback",run_id:runId,checks:{connection:"passed",required_tables:"passed",insert:"passed",read_back:"passed",update:"passed",object_chain:"passed",transaction:commit?"committed":"rolled_back"}},null,2));
  } catch(error) {
    if(transactionOpen) await client.query("ROLLBACK").catch(()=>{});
    throw error;
  } finally { client.release(); }
}
main().catch((error)=>{console.error(error);process.exitCode=1;}).finally(async()=>{await pool.end().catch(()=>{});});
