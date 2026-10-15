import pool from '../../db.js';
// Derive counts from persisted products. Re-saving a product cannot increment a counter.
// These are product-reference counts, including saved historical products, not click counts.
export async function readSettingsReferenceUsage(db=pool){
 const result=await db.query(`
 WITH saved AS (SELECT CASE WHEN jsonb_typeof(metadata->'manualEntry')='object' THEN metadata->'manualEntry' ELSE metadata END AS data FROM public.products
 WHERE jsonb_typeof(metadata)='object'), refs AS (
 SELECT entry.key AS category,entry.value AS row_id FROM saved
 CROSS JOIN LATERAL jsonb_each_text(CASE WHEN jsonb_typeof(data->'customSettings')='object' THEN data->'customSettings' ELSE '{}'::jsonb END) entry
 UNION ALL
 SELECT ref.category,data->>ref.field AS row_id FROM saved
 CROSS JOIN (VALUES ('chinaPackaging','packagingMethod'),('japanPackaging','packagingMaterial'),('logistics','logisticsMethod')) ref(category,field)
 ) SELECT category,row_id,count(*)::text AS total FROM refs
 WHERE row_id IS NOT NULL AND row_id<>'' GROUP BY category,row_id`);
 const counts={};
 for(const row of result.rows){
  if(['__proto__','constructor','prototype'].includes(row.category)||['__proto__','constructor','prototype'].includes(row.row_id))continue;
  counts[row.category]??={};counts[row.category][row.row_id]=Number(row.total);
 }
 return counts;
}
