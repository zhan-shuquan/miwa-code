import { randomUUID } from "node:crypto";
import { allocateSelectionNo } from "./selection-number-service.js";
import { sourceIdentity, fingerprint } from "./selection-intake-contract.js";
import { fail, applyDefaults } from "./selection-workspace-contract.js";
export async function ensureSelectionNo(c, r) {
  if (r.selection_no) return r;
  const n = await allocateSelectionNo(c, r.created_at);
  return (
    (
      await c.query(
        "UPDATE product_opportunities SET selection_no=$2,selection_date=$3 WHERE id=$1 AND selection_no IS NULL RETURNING *",
        [r.id, n.selectionNo, n.selectionDate],
      )
    ).rows[0] || r
  );
}
export async function backfillSelectionPool(c) {
  await c.query(
    "SELECT pg_advisory_xact_lock(hashtext('selection-pool-backfill'))",
  );
  const rows = (
    await c.query(
      "SELECT * FROM product_opportunities ORDER BY created_at,id FOR UPDATE",
    )
  ).rows;
  for (let r of rows) {
    r = await ensureSelectionNo(c, r);
    for (const url of new Set(
      [r.source_url, r.selection_workspace?.data?.sourceUrl].filter(Boolean),
    )) {
      try {
        const source = sourceIdentity(url);
        if (!source.sns) await registerKeys(c, [source.key], r.id);
      } catch {
        /* Preserve historical invalid links, do not rewrite source data. */
      }
    }
  }
  const images = (
    await c.query(
      "SELECT a.selection_id,a.sha256 FROM selection_workspace_assets a JOIN product_opportunities o ON o.id=a.selection_id WHERE NOT (COALESCE(o.selection_workspace->'researchAssetIds','[]') ? a.id::text) ORDER BY a.created_at",
    )
  ).rows;
  for (const a of images)
    await registerKeys(c, ["image:" + a.sha256], a.selection_id);
}
export async function intakeOnce(c, actor, key, payload, fn) {
  if (!key) return fn();
  if (typeof key !== "string" || key.length > 150) fail("请求标识无效");
  await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
    "intake:" + actor + ":" + key,
  ]);
  const hash = fingerprint(JSON.stringify(payload));
  const old = (
    await c.query(
      "SELECT * FROM selection_intake_requests WHERE actor_id=$1 AND request_key=$2",
      [actor, key],
    )
  ).rows[0];
  if (old) {
    if (old.payload_hash !== hash)
      fail("重试标识对应的内容已改变，请重新提交", 409);
    return old.result;
  }
  const result = await fn();
  await c.query(
    "INSERT INTO selection_intake_requests(actor_id,request_key,payload_hash,result,raw_text) VALUES($1,$2,$3,$4,$5)",
    [
      actor,
      key,
      hash,
      JSON.stringify(result),
      typeof payload?.text === "string" ? payload.text : null,
    ],
  );
  return result;
}
export function candidateKeys(candidate) {
  const keys = [];
  if (candidate.source) {
    const s = candidate.source;
    // A shared video can contain multiple products. Only identical content is definitive.
    keys.push(
      s.sns
        ? s.key +
            ":content:" +
            fingerprint(candidate.title + "\n" + candidate.rawShare)
        : s.key,
    );
  }
  for (const img of candidate.images || [])
    keys.push("image:" + fingerprint(Buffer.from(img.base64, "base64")));
  if (!keys.length && candidate.rawShare)
    keys.push("share:" + fingerprint(candidate.rawShare));
  return [...new Set(keys)].sort();
}
export async function findDuplicate(c, keys, excludeId) {
  for (const key of [...keys].sort())
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      "selection:" + key,
    ]);
  return (
    await c.query(
      "SELECT selection_id FROM selection_identity_keys WHERE identity_key=ANY($1::text[]) AND ($2::text IS NULL OR selection_id<>$2) LIMIT 1",
      [keys, excludeId || null],
    )
  ).rows[0]?.selection_id;
}
export async function registerKeys(c, keys, id) {
  for (const key of keys)
    await c.query(
      "INSERT INTO selection_identity_keys(identity_key,selection_id) VALUES($1,$2) ON CONFLICT(identity_key) DO NOTHING",
      [key, id],
    );
}
export async function checkPurchaseSource(c, data, id, snapshot) {
  if (!data.sourceUrl) return { erpReview: "pending" };
  const source = sourceIdentity(data.sourceUrl),
    keys = [source.key];
  if (await findDuplicate(c, keys, id))
    fail("该来源已存在选品或正式商品记录，请联系负责人核对", 409);
  const existing = (snapshot.catalog || []).find((r) => {
    try {
      return r.url && sourceIdentity(r.url).key === source.key;
    } catch {
      return false;
    }
  });
  if (existing && !id)
    fail("ERP已存在对应商品，请关联已有商品，不能重复创建选品", 409);
  if (existing)
    return { erpReview: "matched", existingERPCode: existing.code, keys };
  return { erpReview: snapshot.catalog ? "checked" : "pending", keys };
}
export async function createOpportunity(c, { actor, candidate, snapshot }) {
  const id = "selection:" + randomUUID(),
    source = candidate.source;
  const data = {
    custom_商品长标题中文: candidate.title || "",
    sourceUrl: source?.kind === "purchase" ? source.url : "",
    referenceLinks: source && source.kind !== "purchase" ? [source.url] : [],
    referencePrices: [],
    skus: [],
  };
  const workspace = {
    status: "draft",
    data: snapshot ? applyDefaults(data, snapshot) : data,
    pricing: { status: "incomplete", results: {}, verified: false },
    pool: {
      origin: "public",
      state: "pending",
      source,
      rawShare: candidate.rawShare || "",
      sourceFacts: candidate.sourceFacts || {},
      referencePrice: candidate.referencePrice ?? null,
      collectedAt: new Date().toISOString(),
      erpReview: "pending",
    },
  };
  const r = (
    await c.query(
      "INSERT INTO product_opportunities(id,source_platform,title,source_url,created_by_person_id,selection_workspace) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
      [
        id,
        source?.platform || "image",
        candidate.title || "",
        source?.url || null,
        actor,
        JSON.stringify(workspace),
      ],
    )
  ).rows[0];
  return ensureSelectionNo(c, r);
}
export async function syncResearchTask(c, r, actor) {
  const available = (
    await c.query("SELECT to_regclass('public.work_items') AS table_name")
  ).rows[0].table_name;
  if (!available)
    return { available: false, url: "#/product-home?view=pool&scope=mine" };
  const id = "selection-research:" + r.id,
    p = r.selection_workspace.pool || {};
  const status =
    r.archived_at || !r.owner_person_id || ["abandoned", "archived"].includes(p.state)
      ? "cancelled"
      : r.selection_workspace.status === "confirmed"
        ? "completed"
        : "pending";
  const title =
    "选品研究－" +
    r.selection_no +
    "－" +
    (r.selection_workspace.data.item_name ||
      r.selection_workspace.data.custom_商品长标题中文 ||
      "待完善");
  const metadata = {
    url: "#/product-home?view=entry&id=" + encodeURIComponent(r.id),
    selectionNo: r.selection_no,
  };
  await c.query(
    `INSERT INTO work_items(id,title,work_type,status,owner_person_id,created_by_person_id,related_object_type,related_object_id,metadata)
    VALUES($1,$2,'selection_research',$3,$4,$5,'product_opportunity',$6,$7)
    ON CONFLICT(id) DO UPDATE SET title=$2,status=$3,owner_person_id=$4,metadata=work_items.metadata||$7::jsonb,updated_at=now()`,
    [
      id,
      title,
      status,
      r.owner_person_id,
      actor,
      r.id,
      JSON.stringify(metadata),
    ],
  );
  return { available: true, id, url: metadata.url };
}
export async function requestFormalNumber(c, r, actor) {
  if (r.selection_workspace.formalNumber?.code || (r.selection_workspace.status === "confirmed" && r.selection_workspace.data.item_code))
    return { status: "confirmed", code: r.selection_workspace.data.item_code };
  await c.query(
    `INSERT INTO selection_erp_commands(id,command_key,kind,selection_id,payload) VALUES($1,$2,'formal_number',$3,$4) ON CONFLICT(command_key) DO UPDATE SET payload=CASE WHEN selection_erp_commands.status='failed' THEN excluded.payload ELSE selection_erp_commands.payload END,status=CASE WHEN selection_erp_commands.status='failed' THEN 'queued' ELSE selection_erp_commands.status END`,
    [
      randomUUID(),
      "formal-number:" + r.id,
      r.id,
      JSON.stringify({
        selectionId: r.id,
        selectionNo: r.selection_no,
        memberId: r.owner_person_id,
        actor,
        sourceUrl: r.selection_workspace.data.sourceUrl || "",
        requestedCode: r.selection_workspace.data.item_code || "",
        existingCodes: [],
      }),
    ],
  );
  return { status: "number_pending" };
}
