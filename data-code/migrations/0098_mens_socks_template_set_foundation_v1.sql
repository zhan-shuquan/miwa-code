BEGIN;

CREATE TABLE IF NOT EXISTS public.design_static_page_assets (
  id TEXT PRIMARY KEY,
  asset_code TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  channel_scope TEXT,
  category_scope TEXT,
  store_scope TEXT,
  storage_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  content_sha256 TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN ('draft','active','deprecated','archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1 CHECK (record_version > 0),
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  CHECK (jsonb_typeof(storage_ref) = 'object'),
  CHECK (jsonb_typeof(metadata) = 'object'),
  UNIQUE (asset_code, version)
);

CREATE INDEX IF NOT EXISTS idx_design_static_page_assets_scope
  ON public.design_static_page_assets(channel_scope, category_scope, lifecycle_status, asset_code, version)
  WHERE archived_at IS NULL;

ALTER TABLE public.design_template_set_items
  ALTER COLUMN template_id DROP NOT NULL;

ALTER TABLE public.design_template_set_items
  ADD COLUMN IF NOT EXISTS item_kind TEXT NOT NULL DEFAULT 'dynamic_template',
  ADD COLUMN IF NOT EXISTS static_page_asset_id TEXT REFERENCES public.design_static_page_assets(id) ON DELETE RESTRICT;

ALTER TABLE public.design_template_set_items
  DROP CONSTRAINT IF EXISTS design_template_set_items_item_kind_check;
ALTER TABLE public.design_template_set_items
  ADD CONSTRAINT design_template_set_items_item_kind_check
  CHECK (item_kind IN ('dynamic_template','static_page_asset'));

ALTER TABLE public.design_template_set_items
  DROP CONSTRAINT IF EXISTS design_template_set_items_target_check;
ALTER TABLE public.design_template_set_items
  ADD CONSTRAINT design_template_set_items_target_check
  CHECK (
    (item_kind='dynamic_template' AND template_id IS NOT NULL AND static_page_asset_id IS NULL)
    OR
    (item_kind='static_page_asset' AND template_id IS NULL AND static_page_asset_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_design_template_set_items_static_asset
  ON public.design_template_set_items(static_page_asset_id)
  WHERE archived_at IS NULL AND static_page_asset_id IS NOT NULL;

INSERT INTO public.design_templates (
  id, template_code, name, version, output_type,
  category_scope, channel_scope, store_scope,
  canvas_width, canvas_height, layout_spec,
  required_source_roles, required_product_facts,
  allowed_operations, validation_rules,
  lifecycle_status, metadata, source_system
)
VALUES
(
  'dtpl_mens_socks_rakuten_hero_v1',
  'MEN-SOCKS-RAKUTEN-HERO-1000X1200',
  'Men Socks Rakuten Hero V1',
  '1.0',
  'product_hero_image',
  'mens-socks', 'rakuten', NULL,
  1000, 1200,
  '{"family":"hero","copySlotHierarchy":["eyebrow","headline","body","fact_label","fact_value","brand_footer"],"visualRoles":["hero_wear","sku_set","color_variants"],"technicalDesignStatus":"trial-family-first"}'::jsonb,
  '["hero_wear","sku_set"]'::jsonb,
  '["setCount","actualVariants","approvedPrimaryValue"]'::jsonb,
  '["normalize_canvas","visual_only_generation","deterministic_copy_overlay"]'::jsonb,
  '{"humanReviewRequired":true,"sourceTruthRequired":true,"textPolicy":"visual_only","copyLayerMode":"deterministic_overlay"}'::jsonb,
  'draft',
  '{"templateSet":"MEN-SOCKS-RAKUTEN-DETAIL-V1","pageCode":"MS-HERO-01","trialPage":true}'::jsonb,
  'aione-mens-socks-template-set-v1'
),
(
  'dtpl_mens_socks_rakuten_reason1_v1',
  'MEN-SOCKS-RAKUTEN-REASON1-1000X1500',
  'Men Socks Rakuten Reason 1 V1',
  '1.0',
  'benefit_feature_image',
  'mens-socks', 'rakuten', NULL,
  1000, 1500,
  '{"family":"vertical_reason","copySlotHierarchy":["section_label","headline","subheadline","point_a_title","point_a_body","point_b_title","point_b_body","note"],"visualRoles":["hero_wear","cuff_detail","sku_set"],"technicalDesignStatus":"trial-family-first"}'::jsonb,
  '["hero_wear","cuff_detail"]'::jsonb,
  '["sellingPoints"]'::jsonb,
  '["normalize_canvas","visual_only_generation","deterministic_copy_overlay"]'::jsonb,
  '{"humanReviewRequired":true,"sourceTruthRequired":true,"textPolicy":"visual_only","copyLayerMode":"deterministic_overlay"}'::jsonb,
  'draft',
  '{"templateSet":"MEN-SOCKS-RAKUTEN-DETAIL-V1","pageCode":"MS-REASON1-04","trialPage":true}'::jsonb,
  'aione-mens-socks-template-set-v1'
),
(
  'dtpl_mens_socks_rakuten_size_v1',
  'MEN-SOCKS-RAKUTEN-SIZE-1000X1500',
  'Men Socks Rakuten Size Guide V1',
  '1.0',
  'size_guide_image',
  'mens-socks', 'rakuten', NULL,
  1000, 1500,
  '{"family":"vertical_size","copySlotHierarchy":["section_label","headline","fact_label","fact_value","note"],"visualRoles":["flat_lay","thickness_detail"],"technicalDesignStatus":"trial-family-first"}'::jsonb,
  '["flat_lay"]'::jsonb,
  '["supportedSize","measurements"]'::jsonb,
  '["normalize_canvas","deterministic_annotation","deterministic_copy_overlay"]'::jsonb,
  '{"humanReviewRequired":true,"sourceTruthRequired":true,"noAiInferredMeasurements":true,"blockWhenMeasurementsMissing":true,"textPolicy":"visual_only","copyLayerMode":"deterministic_overlay"}'::jsonb,
  'draft',
  '{"templateSet":"MEN-SOCKS-RAKUTEN-DETAIL-V1","pageCode":"MS-SIZE-12","trialPage":true,"highRiskFacts":true}'::jsonb,
  'aione-mens-socks-template-set-v1'
)
ON CONFLICT (template_code, version) DO NOTHING;

INSERT INTO public.design_template_sets (
  id, set_code, name, version, category_scope, channel_scope, store_scope,
  match_rules, common_fact_keys, lifecycle_status, metadata, source_system
)
VALUES (
  'dtset_mens_socks_rakuten_detail_v1',
  'MEN-SOCKS-RAKUTEN-DETAIL-V1',
  'Men Socks Rakuten Detail V1',
  '1.0',
  'mens-socks',
  'rakuten',
  NULL,
  '{"operatorSelectionRequired":true,"parentCategory":"socks","gender":"male","commercialForm":"multi-pair-set"}'::jsonb,
  '["productCode","productName","category","material","size","colors","sellingPoints","approvedClaims"]'::jsonb,
  'draft',
  '{"productFreeze":"CURRENT","targetPageCount":15,"dynamicPageCount":13,"staticPageCount":2,"implementationStage":"trial-three-first","trialPageCodes":["MS-HERO-01","MS-REASON1-04","MS-SIZE-12"],"fullBatchAfterTrialApproval":true,"humanReviewRequired":true}'::jsonb,
  'aione-mens-socks-template-set-v1'
)
ON CONFLICT (set_code, version) DO NOTHING;

INSERT INTO public.design_template_set_items (
  id, template_set_id, template_id, page_no, page_code, page_name,
  required, default_enabled, field_bindings, asset_bindings,
  instruction_defaults, metadata, source_system, item_kind
)
VALUES
(
  'dtsi_mens_socks_hero_01_v1',
  'dtset_mens_socks_rakuten_detail_v1',
  'dtpl_mens_socks_rakuten_hero_v1',
  1, 'MS-HERO-01', 'Main Visual', TRUE, TRUE,
  '{"requiredFacts":["setCount","actualVariants","approvedPrimaryValue"],"missingFactDisposition":"block_for_human"}'::jsonb,
  '{"selection":"human-curated","semanticRoles":["hero_wear","sku_set","color_variants"],"allowedFolders":["01_SKU图","02_产品图","03_实拍图"],"sourceLayerRequired":"SOURCE"}'::jsonb,
  '{"textPolicy":"visual_only","copyLayerMode":"deterministic_overlay","humanReviewRequired":true}'::jsonb,
  '{"trialPage":true,"trialOrder":1}'::jsonb,
  'aione-mens-socks-template-set-v1',
  'dynamic_template'
),
(
  'dtsi_mens_socks_reason1_04_v1',
  'dtset_mens_socks_rakuten_detail_v1',
  'dtpl_mens_socks_rakuten_reason1_v1',
  4, 'MS-REASON1-04', 'Reason 1', TRUE, TRUE,
  '{"requiredFacts":["sellingPoints"],"missingFactDisposition":"block_for_human"}'::jsonb,
  '{"selection":"human-curated","semanticRoles":["hero_wear","cuff_detail","sku_set"],"allowedFolders":["01_SKU图","02_产品图","03_实拍图"],"sourceLayerRequired":"SOURCE"}'::jsonb,
  '{"textPolicy":"visual_only","copyLayerMode":"deterministic_overlay","humanReviewRequired":true}'::jsonb,
  '{"trialPage":true,"trialOrder":2}'::jsonb,
  'aione-mens-socks-template-set-v1',
  'dynamic_template'
),
(
  'dtsi_mens_socks_size_12_v1',
  'dtset_mens_socks_rakuten_detail_v1',
  'dtpl_mens_socks_rakuten_size_v1',
  12, 'MS-SIZE-12', 'Size Guide', TRUE, TRUE,
  '{"requiredFacts":["supportedSize","measurements"],"missingFactDisposition":"block_for_human","noAiInferredMeasurements":true}'::jsonb,
  '{"selection":"human-curated","semanticRoles":["flat_lay","thickness_detail"],"allowedFolders":["02_产品图","03_实拍图"],"sourceLayerRequired":"SOURCE"}'::jsonb,
  '{"textPolicy":"visual_only","copyLayerMode":"deterministic_overlay","humanReviewRequired":true,"highRiskNumericFacts":true}'::jsonb,
  '{"trialPage":true,"trialOrder":3}'::jsonb,
  'aione-mens-socks-template-set-v1',
  'dynamic_template'
)
ON CONFLICT (template_set_id, page_code) DO NOTHING;

DO $$
DECLARE
  trial_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trial_count
  FROM public.design_template_set_items
  WHERE template_set_id='dtset_mens_socks_rakuten_detail_v1'
    AND metadata->>'trialPage'='true'
    AND archived_at IS NULL;

  IF trial_count <> 3 THEN
    RAISE EXCEPTION '0098 mens-socks trial foundation must contain exactly 3 trial items, found %', trial_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.design_template_sets
    WHERE id='dtset_mens_socks_rakuten_detail_v1'
      AND set_code='MEN-SOCKS-RAKUTEN-DETAIL-V1'
      AND lifecycle_status='draft'
      AND metadata->>'implementationStage'='trial-three-first'
  ) THEN
    RAISE EXCEPTION '0098 mens-socks draft Template Set foundation was not installed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='design_template_set_items'
      AND column_name='static_page_asset_id'
  ) THEN
    RAISE EXCEPTION '0098 static page asset target column was not installed';
  END IF;
END $$;

COMMIT;
