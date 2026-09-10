BEGIN;

INSERT INTO public.design_templates (
  id,
  template_code,
  name,
  version,
  output_type,
  category_scope,
  channel_scope,
  store_scope,
  canvas_width,
  canvas_height,
  layout_spec,
  required_source_roles,
  required_product_facts,
  allowed_operations,
  validation_rules,
  lifecycle_status,
  metadata,
  source_system
)
VALUES (
  'dtpl_socks_rakuten_benefit_1000x1500_v1',
  'SOCKS-RAKUTEN-BENEFIT-1000X1500',
  'Socks Rakuten Benefit 1000x1500',
  '1.0',
  'benefit_feature_image',
  'socks',
  'rakuten',
  NULL,
  1000,
  1500,
  '{}'::jsonb,
  '["source_main_image","source_detail_image"]'::jsonb,
  '[]'::jsonb,
  '["normalize_canvas","benefit_feature_image"]'::jsonb,
  '{"humanReviewRequired":true,"sourceTruthRequired":true}'::jsonb,
  'active',
  '{"stage":"v2-first-validator","promptStatus":"pending-approved-pattern"}'::jsonb,
  'aione-ai-assisted-design-v2'
)
ON CONFLICT (template_code, version) DO NOTHING;

COMMIT;
