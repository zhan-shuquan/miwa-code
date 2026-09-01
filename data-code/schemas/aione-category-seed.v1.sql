-- AIONE Category Master Data V1 seed design
-- STATUS: VALIDATING DESIGN ASSET ONLY
-- DO NOT execute directly against production before migration review.

BEGIN;

-- Assumes public.categories from aione-product-domain.v1.sql design.
-- Seed only categories that are currently verified.

INSERT INTO public.categories (
  id, parent_id, level, code, name_zh, name_ja, status, sort_order, metadata,
  created_at, updated_at, source_system
)
VALUES
  (
    'cat_apparel', NULL, 1, 'APPAREL_WEARABLES', '服饰与穿戴配件', NULL,
    'active', 10, '{"governance_status":"verified"}'::jsonb,
    NOW(), NOW(), 'aione'
  ),
  (
    'cat_apparel_socks', 'cat_apparel', 2, 'SOCKS', '袜类', '靴下',
    'active', 10, '{"governance_status":"verified"}'::jsonb,
    NOW(), NOW(), 'aione'
  ),
  (
    'cat_apparel_socks_mens', 'cat_apparel_socks', 3, 'MENS_SOCKS', '男士袜', 'メンズ靴下',
    'active', 10, '{"governance_status":"verified","focus":true}'::jsonb,
    NOW(), NOW(), 'aione'
  ),
  (
    'cat_apparel_socks_womens', 'cat_apparel_socks', 3, 'WOMENS_SOCKS', '女士袜', 'レディース靴下',
    'active', 20, '{"governance_status":"verified","focus":true}'::jsonb,
    NOW(), NOW(), 'aione'
  ),
  (
    'cat_apparel_hats', 'cat_apparel', 2, 'HATS', '帽类', '帽子',
    'active', 20, '{"governance_status":"verified"}'::jsonb,
    NOW(), NOW(), 'aione'
  ),
  (
    'cat_apparel_hats_mens', 'cat_apparel_hats', 3, 'MENS_HATS', '男士帽', 'メンズ帽子',
    'active', 10, '{"governance_status":"verified","focus":true}'::jsonb,
    NOW(), NOW(), 'aione'
  ),
  (
    'cat_apparel_hats_womens', 'cat_apparel_hats', 3, 'WOMENS_HATS', '女士帽', 'レディース帽子',
    'active', 20, '{"governance_status":"verified","focus":true}'::jsonb,
    NOW(), NOW(), 'aione'
  )
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level,
  code = EXCLUDED.code,
  name_zh = EXCLUDED.name_zh,
  name_ja = EXCLUDED.name_ja,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

COMMIT;
