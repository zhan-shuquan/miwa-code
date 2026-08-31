import assert from "node:assert/strict";
import crypto from "node:crypto";
import pool from "../db.js";

const runId = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const commit = process.argv.includes("--commit");

function id(prefix) {
  return `${prefix}-${runId}`;
}

async function main() {
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;

    const requiredTables = [
      "product_categories",
      "product_opportunities",
      "products",
      "category_slots",
      "channel_listings",
      "publishing_jobs"
    ];

    const tableCheck = await client.query(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])`,
      [requiredTables]
    );
    const existing = new Set(tableCheck.rows.map((row) => row.table_name));
    const missing = requiredTables.filter((name) => !existing.has(name));
    assert.deepEqual(missing, [], `Missing P0 tables: ${missing.join(", ")}`);

    const categoryId = id("cat-smoke");
    const opportunityId = id("opp-smoke");
    const productId = id("prd-smoke");
    const slotId = id("slot-smoke");
    const listingId = id("lst-smoke");
    const jobId = id("pub-smoke");

    await client.query(
      `INSERT INTO public.product_categories
        (id, code, name, status, target_slot_capacity, source_system)
       VALUES ($1, $2, $3, 'active', $4, 'aione-smoke')`,
      [categoryId, `SMOKE-${runId}`, `P0 Smoke Category ${runId}`, 12]
    );

    await client.query(
      `INSERT INTO public.product_opportunities
        (id, source_platform, source_ref, source_url, title, selection_mode,
         lifecycle_status, category_id, estimated_cost, estimated_sale_price,
         currency, qualification_data, source_system)
       VALUES ($1, '1688', $2, $3, $4, 'direct', 'discovered', $5, 1000, 2980,
               'JPY', $6::jsonb, 'aione-smoke')`,
      [
        opportunityId,
        `smoke-${runId}`,
        `https://example.invalid/1688/${runId}`,
        `P0 Direct Opportunity ${runId}`,
        categoryId,
        JSON.stringify({ smoke_test: true, direct_eligible: true })
      ]
    );

    const inserted = await client.query(
      `SELECT id, lifecycle_status, estimated_sale_price
         FROM public.product_opportunities
        WHERE id = $1`,
      [opportunityId]
    );
    assert.equal(inserted.rowCount, 1, "Inserted opportunity could not be read back");
    assert.equal(inserted.rows[0].lifecycle_status, "discovered");
    assert.equal(Number(inserted.rows[0].estimated_sale_price), 2980);

    const updated = await client.query(
      `UPDATE public.product_opportunities
          SET lifecycle_status = 'qualified',
              estimated_sale_price = 3180,
              updated_at = NOW(),
              record_version = record_version + 1
        WHERE id = $1
      RETURNING lifecycle_status, estimated_sale_price, record_version`,
      [opportunityId]
    );
    assert.equal(updated.rowCount, 1, "Opportunity update did not affect exactly one row");
    assert.equal(updated.rows[0].lifecycle_status, "qualified");
    assert.equal(Number(updated.rows[0].estimated_sale_price), 3180);
    assert.equal(updated.rows[0].record_version, 2);

    await client.query(
      `INSERT INTO public.products
        (id, source_opportunity_id, category_id, name, lifecycle_status,
         source_platform, source_ref, source_url, cost_amount, currency,
         readiness_data, source_system)
       SELECT $1, id, category_id, title, 'listing_ready', source_platform,
              source_ref, source_url, estimated_cost, currency,
              $2::jsonb, 'aione-smoke'
         FROM public.product_opportunities
        WHERE id = $3`,
      [productId, JSON.stringify({ listing_ready: true, smoke_test: true }), opportunityId]
    );

    await client.query(
      `INSERT INTO public.category_slots
        (id, category_id, slot_no, product_id, status, metadata)
       VALUES ($1, $2, 1, $3, 'occupied', $4::jsonb)`,
      [slotId, categoryId, productId, JSON.stringify({ smoke_test: true })]
    );

    await client.query(
      `INSERT INTO public.channel_listings
        (id, product_id, channel, shop_ref, lifecycle_status,
         current_price, currency, listing_data, source_system)
       VALUES ($1, $2, 'rakuten', 'smoke-shop', 'ready', 3180, 'JPY', $3::jsonb, 'aione-smoke')`,
      [listingId, productId, JSON.stringify({ smoke_test: true })]
    );

    await client.query(
      `INSERT INTO public.publishing_jobs
        (id, listing_id, command_type, status, requested_by_kind,
         idempotency_key, payload, correlation_id)
       VALUES ($1, $2, 'CREATE_LISTING', 'ready', 'system', $3, $4::jsonb, $5)`,
      [
        jobId,
        listingId,
        `p0-smoke-${runId}`,
        JSON.stringify({ smoke_test: true, expected_action: "create_listing" }),
        `corr-${runId}`
      ]
    );

    const chain = await client.query(
      `SELECT
          o.id AS opportunity_id,
          o.lifecycle_status AS opportunity_status,
          p.id AS product_id,
          p.lifecycle_status AS product_status,
          l.id AS listing_id,
          l.lifecycle_status AS listing_status,
          j.id AS publishing_job_id,
          j.command_type,
          j.status AS publishing_status
       FROM public.product_opportunities o
       JOIN public.products p ON p.source_opportunity_id = o.id
       JOIN public.channel_listings l ON l.product_id = p.id
       JOIN public.publishing_jobs j ON j.listing_id = l.id
      WHERE o.id = $1`,
      [opportunityId]
    );

    assert.equal(chain.rowCount, 1, "P0 object chain could not be read back");
    assert.equal(chain.rows[0].opportunity_status, "qualified");
    assert.equal(chain.rows[0].product_status, "listing_ready");
    assert.equal(chain.rows[0].listing_status, "ready");
    assert.equal(chain.rows[0].command_type, "CREATE_LISTING");
    assert.equal(chain.rows[0].publishing_status, "ready");

    if (commit) {
      await client.query("COMMIT");
      transactionOpen = false;
    } else {
      await client.query("ROLLBACK");
      transactionOpen = false;
    }

    console.log(JSON.stringify({
      ok: true,
      mode: commit ? "commit" : "rollback",
      run_id: runId,
      checks: {
        connection: "passed",
        required_tables: "passed",
        insert: "passed",
        read_back: "passed",
        update: "passed",
        object_chain: "passed",
        transaction: commit ? "committed" : "rolled_back"
      }
    }, null, 2));
  } catch (error) {
    if (transactionOpen) {
      await client.query("ROLLBACK").catch(() => {});
    }
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
