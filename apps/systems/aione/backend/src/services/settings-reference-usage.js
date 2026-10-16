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
 UNION ALL
 SELECT 'delivery',data->>'sizeClass' FROM saved
 UNION ALL
 SELECT 'delivery',size FROM saved CROSS JOIN LATERAL (SELECT DISTINCT sku->>'sizeClass' AS size FROM jsonb_array_elements(CASE WHEN jsonb_typeof(data->'skuOverrides')='array' THEN data->'skuOverrides' ELSE '[]'::jsonb END) sku WHERE sku->>'sizeClass' IS DISTINCT FROM data->>'sizeClass') sizes
 UNION ALL
 SELECT c->>'id',r->>'id' FROM saved
 CROSS JOIN public.aione_shared_parameters params
 CROSS JOIN LATERAL jsonb_array_elements(COALESCE(params.payload->'customSettings'->'categories','[]'::jsonb)) c
 CROSS JOIN LATERAL jsonb_array_elements(c->'rows') r
 WHERE params.scope='global' AND c->>'productField' IS NOT NULL
 AND data->>(c->>'productField')=r->>'businessValue'
 AND COALESCE(data->'customSettings'->>(c->>'id'),'')=''
 UNION ALL
 SELECT c->>'id',r->>'id' FROM saved
 CROSS JOIN public.aione_shared_parameters params
 CROSS JOIN LATERAL jsonb_array_elements(COALESCE(params.payload->'customSettings'->'categories','[]'::jsonb)) c
 CROSS JOIN LATERAL jsonb_array_elements(c->'rows') r
 WHERE params.scope='global' AND c->>'specBinding' IS NOT NULL
 AND EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(data->'specs')='array' THEN data->'specs' ELSE '[]'::jsonb END) spec
 WHERE (c->>'specBinding'='$dimensions' AND COALESCE(r->'referenceNames',jsonb_build_array(r->>'businessValue')) ? (spec->>'name'))
 OR (c->>'specBinding'<>'$dimensions' AND EXISTS (
 SELECT 1 FROM jsonb_array_elements(params.payload->'customSettings'->'categories') dims
 CROSS JOIN LATERAL jsonb_array_elements(dims->'rows') dimension
 WHERE dims->>'specBinding'='$dimensions' AND dimension->>'businessValue'=c->>'specBinding'
 AND COALESCE(dimension->'referenceNames',jsonb_build_array(dimension->>'businessValue')) ? (spec->>'name'))
 AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(spec->'values')='array' THEN spec->'values' ELSE '[]'::jsonb END) value
 WHERE COALESCE(r->'referenceNames',jsonb_build_array(r->>'businessValue')) ? value)))
 ) SELECT category,row_id,count(*)::text AS total FROM refs
 WHERE row_id IS NOT NULL AND row_id<>'' GROUP BY category,row_id`);
 const counts={};
 for(const row of result.rows){
  if(['__proto__','constructor','prototype'].includes(row.category)||['__proto__','constructor','prototype'].includes(row.row_id))continue;
  counts[row.category]??={};counts[row.category][row.row_id]=Number(row.total);
 }
 return counts;
}
