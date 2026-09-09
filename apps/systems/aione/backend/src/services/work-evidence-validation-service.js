import { withTransaction } from "../../db.js";
import { recordBusinessEvent } from "./event-service.js";

function clean(value, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function extractOfferIdFromUrl(value) {
  const text = clean(value, 2000);
  const match = text.match(/(?:offer\/|offerId=|offer_id=)(\d{6,})/i) || text.match(/(\d{8,})\.html/i);
  return match?.[1] || null;
}

function canonicalize1688Url(value) {
  const text = clean(value, 2000);
  if (!text) return null;
  const offerId = extractOfferIdFromUrl(text);
  if (offerId) return `https://detail.1688.com/offer/${offerId}.html`;
  try {
    const url = new URL(text);
    url.hash = "";
    ["spm", "sk", "tracelog", "from", "share_token"].forEach((key) => url.searchParams.delete(key));
    return url.toString();
  } catch {
    return text;
  }
}

export function normalize1688Candidate(row = {}) {
  const productId = clean(row.offerId || row.productId || row["1688商品ID"] || row["商品ID"], 120) || null;
  const sourceUrl = clean(row.sourceUrl || row.url || row["商品链接"] || row["链接"] || row["商品地址"], 2000) || null;
  const derivedId = productId || extractOfferIdFromUrl(sourceUrl);
  const canonicalSourceUrl = canonicalize1688Url(sourceUrl);
  if (!derivedId && !canonicalSourceUrl) return null;
  return {
    sourceProductId: derivedId,
    canonicalSourceUrl,
    title: clean(row.title || row.name || row["商品标题"] || row["商品名称"] || row["标题"], 500) || null,
    imageUrl: clean(row.imageUrl || row["图片地址"], 2000) || null,
    sourcePrice: clean(row.sourcePrice || row["商品价格"], 120) || null,
    sourceAddedAt: clean(row.sourceAddedAt || row["加入时间"], 120) || null,
    platform: clean(row.platform || row["平台"], 120) || null,
    supplierName: clean(row.supplierName || row["店铺名称"], 500) || null,
    sourceGroup: clean(row.sourceGroup || row["所属分组"], 200) || null
  };
}

function uniqueCandidates(rows = []) {
  const seen = new Set();
  const items = [];
  for (const row of rows) {
    const candidate = normalize1688Candidate(row);
    if (!candidate) continue;
    const key = candidate.sourceProductId ? `id:${candidate.sourceProductId}` : `url:${candidate.canonicalSourceUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(candidate);
  }
  return items;
}

async function existingSelectionKeys(client, candidates) {
  if (!candidates.length) return new Set();
  const ids = candidates.map((item) => item.sourceProductId).filter(Boolean);
  const urls = candidates.map((item) => item.canonicalSourceUrl).filter(Boolean);
  if (!ids.length && !urls.length) return new Set();
  const result = await client.query(`
    SELECT metadata
    FROM public.object_registry
    WHERE object_type IN ('selection','selection_opportunity','product_opportunity')
      AND (
        ($1::text[] <> '{}'::text[] AND metadata->>'sourceProductId' = ANY($1::text[])) OR
        ($2::text[] <> '{}'::text[] AND metadata->>'canonicalSourceUrl' = ANY($2::text[]))
      )
  `, [ids, urls]);
  const keys = new Set();
  for (const row of result.rows) {
    const metadata = row.metadata || {};
    if (metadata.sourceProductId) keys.add(`id:${metadata.sourceProductId}`);
    if (metadata.canonicalSourceUrl) keys.add(`url:${metadata.canonicalSourceUrl}`);
  }
  return keys;
}

function expectedMinimum(item) {
  const policy = item.completion_policy || {};
  const metadata = item.metadata || {};
  const roleGroup = clean(metadata.roleGroup || metadata.role_group, 120);
  const override = Array.isArray(policy.roleOverrides)
    ? policy.roleOverrides.find((entry) => clean(entry?.roleGroup, 120) === roleGroup)
    : null;
  return Number(override?.minValidSelections || policy.defaultMinValidSelections || 1);
}

function validateFileName(fileName) {
  return /^\d{8}_.+_1688选品\.xlsx$/i.test(clean(fileName, 300));
}

export async function validate1688WeeklyEvidence({ workItemId, evidenceId, extractedRows = [], actorPersonId = null, sourceSystem = "aione-work-validator" }) {
  return withTransaction(async (client) => {
    const itemResult = await client.query(`
      SELECT w.*, t.completion_policy, t.evidence_policy, r.code AS recurring_rule_code, r.rule_version
      FROM public.work_items w
      JOIN public.work_templates t ON t.id=w.work_template_id
      LEFT JOIN public.recurring_rules r ON r.id=w.recurring_rule_id
      WHERE w.id=$1 AND w.archived_at IS NULL FOR UPDATE
    `, [workItemId]);
    if (!itemResult.rowCount) { const error = new Error("Work item not found."); error.statusCode = 404; throw error; }
    const item = itemResult.rows[0];
    const evidenceResult = await client.query("SELECT * FROM public.work_evidence WHERE id=$1 AND work_item_id=$2 FOR UPDATE", [evidenceId, workItemId]);
    if (!evidenceResult.rowCount) { const error = new Error("Evidence not found."); error.statusCode = 404; throw error; }
    const evidence = evidenceResult.rows[0];
    const fileNameValid = validateFileName(evidence.file_name);
    const parsed = uniqueCandidates(Array.isArray(extractedRows) ? extractedRows : []);
    const existing = await existingSelectionKeys(client, parsed);
    const newCandidates = parsed.filter((candidate) => {
      const idKey = candidate.sourceProductId ? `id:${candidate.sourceProductId}` : null;
      const urlKey = candidate.canonicalSourceUrl ? `url:${candidate.canonicalSourceUrl}` : null;
      return !(idKey && existing.has(idKey)) && !(urlKey && existing.has(urlKey));
    });
    const minRequired = expectedMinimum(item);
    const passed = fileNameValid && newCandidates.length >= minRequired;
    const message = !fileNameValid ? "文件名不符合 YYYYMMDD_姓名_1688选品.xlsx 规则。" : passed
      ? `验收通过：发现 ${newCandidates.length} 个新的有效候选商品，最低要求 ${minRequired} 个。`
      : `有效新候选商品 ${newCandidates.length} 个，未达到最低要求 ${minRequired} 个。`;
    await client.query(`UPDATE public.work_evidence SET validation_status=$2, valid_item_count=$3, validation_message=$4, validated_at=NOW(), payload=COALESCE(payload,'{}'::jsonb)||$5::jsonb WHERE id=$1`, [evidence.id, passed ? "validated" : "rejected", newCandidates.length, message, JSON.stringify({ parsedCandidateCount: parsed.length, duplicateCandidateCount: parsed.length-newCandidates.length, minimumRequired:minRequired, fileNameValid, candidateIdentities:newCandidates.slice(0,500) })]);
    if (passed) await client.query(`UPDATE public.work_items SET status='completed', completed_at=COALESCE(completed_at,NOW()), started_at=COALESCE(started_at,generated_at,created_at), result_summary=$2, updated_at=NOW(), updated_by_person_id=$3, record_version=record_version+1 WHERE id=$1`, [item.id,message,actorPersonId]);
    else await client.query(`UPDATE public.work_items SET status='waiting', result_summary=$2, updated_at=NOW(), updated_by_person_id=$3, record_version=record_version+1 WHERE id=$1 AND status NOT IN ('completed','cancelled','archived')`, [item.id,message,actorPersonId]);
    await recordBusinessEvent(client,{eventType:passed?"work-evidence.validated":"work-evidence.validation-failed",objectType:"work-items",objectId:item.id,context:{personId:actorPersonId,sourceSystem},payload:{evidenceId:evidence.id,recurringRuleCode:item.recurring_rule_code,validNewCount:newCandidates.length,parsedCount:parsed.length,minimumRequired:minRequired,fileNameValid,completed:passed}});
    return {workItemId:item.id,evidenceId:evidence.id,passed,completed:passed,parsedCount:parsed.length,validNewCount:newCandidates.length,duplicateCount:parsed.length-newCandidates.length,minimumRequired:minRequired,fileNameValid,message};
  });
}
