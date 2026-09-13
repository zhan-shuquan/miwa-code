BEGIN;

CREATE TABLE IF NOT EXISTS public.product_design_page_specs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  page_type TEXT NOT NULL,
  template_id TEXT NOT NULL REFERENCES public.design_templates(id) ON DELETE RESTRICT,
  field_bindings JSONB NOT NULL DEFAULT '{}'::jsonb,
  asset_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout_adjustments JSONB NOT NULL DEFAULT '{}'::jsonb,
  presentation JSONB NOT NULL DEFAULT '{}'::jsonb,
  lifecycle_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN ('draft','ready','approved','generated','archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1 CHECK (record_version > 0),
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  CHECK (jsonb_typeof(field_bindings)='object'),
  CHECK (jsonb_typeof(asset_ids)='array'),
  CHECK (jsonb_typeof(layout_adjustments)='object'),
  CHECK (jsonb_typeof(presentation)='object'),
  CHECK (jsonb_typeof(metadata)='object')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_design_page_specs_current
  ON public.product_design_page_specs(product_id, page_type)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_design_page_specs_status
  ON public.product_design_page_specs(page_type, lifecycle_status, updated_at DESC)
  WHERE archived_at IS NULL;

INSERT INTO public.design_templates (
  id, template_code, name, version, output_type,
  category_scope, channel_scope, store_scope,
  canvas_width, canvas_height, layout_spec,
  required_source_roles, required_product_facts,
  allowed_operations, validation_rules,
  prompt_template_ref, lifecycle_status, metadata, source_system
)
VALUES
(
  'dtpl_unified_sku_color_square_v1',
  'UNIFIED-SKU-COLOR-1000X1000',
  'Unified SKU Color 1000x1000',
  '1.0',
  'sku_color_image',
  NULL, NULL, NULL,
  1000, 1000,
  '{"family":"sku_color","slots":{"title":{"x":"5%","y":"5%","w":"90%","h":"12%"},"product_display":{"x":"8%","y":"20%","w":"84%","h":"62%"},"variant_labels":{"x":"7%","y":"84%","w":"86%","h":"10%"}},"technicalDesignStatus":"operator-adjustable-v1"}'::jsonb,
  '["sku_set"]'::jsonb,
  '["actualVariants"]'::jsonb,
  '["normalize_canvas","compose_sku_color_image","deterministic_copy_overlay"]'::jsonb,
  '{"sourceTruthRequired":true,"humanReviewRequired":true,"doNotInventVariants":true,"doNotInventSetCount":true,"textPolicy":"deterministic_overlay"}'::jsonb,
  'UNIFIED-SKU-COLOR-1000X1000',
  'active',
  '{"current":true,"stage":"design-center-page-type-v1","pageType":"sku","operatorAdjustable":true}'::jsonb,
  'aione-design-center-v1'
),
(
  'dtpl_unified_white_bg_square_v1',
  'UNIFIED-WHITE-BG-1000X1000',
  'Unified White Background Product 1000x1000',
  '1.0',
  'white_background_product_image',
  NULL, NULL, NULL,
  1000, 1000,
  '{"family":"white_background","canvas":{"background":"#FFFFFF"},"slots":{"product":{"x":"10%","y":"10%","w":"80%","h":"80%"}},"technicalDesignStatus":"operator-adjustable-v1"}'::jsonb,
  '["product_source"]'::jsonb,
  '["actualVariants"]'::jsonb,
  '["normalize_canvas","background_cleanup","source_anchored_edit","compose_white_background_product"]'::jsonb,
  '{"sourceTruthRequired":true,"humanReviewRequired":true,"backgroundMustBeWhite":true,"preserveProductGeometry":true,"preserveActualColors":true,"preservePatternAndLogo":true,"doNotInventVariants":true}'::jsonb,
  'UNIFIED-WHITE-BG-1000X1000',
  'active',
  '{"current":true,"stage":"design-center-page-type-v1","pageType":"white_bg","operatorAdjustable":true,"sourceAnchored":true}'::jsonb,
  'aione-design-center-v1'
)
ON CONFLICT (template_code, version) DO NOTHING;

COMMIT;
