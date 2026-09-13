BEGIN;

-- AIONE Design Center V1: reusable instruction presets, Product Tag Card,
-- and one unified 1:1 Hero Design Spec. Product Truth stays in products.product_data;
-- design objects only control presentation, bindings, and reusable instructions.

CREATE TABLE IF NOT EXISTS public.design_instruction_presets (
  id TEXT PRIMARY KEY,
  preset_code TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  instruction_kind TEXT NOT NULL,
  category_scope TEXT,
  channel_scope TEXT,
  instruction_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  instruction_text TEXT NOT NULL DEFAULT '',
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
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
  CHECK (jsonb_typeof(instruction_schema) = 'object'),
  CHECK (jsonb_typeof(constraints) = 'object'),
  UNIQUE (preset_code, version)
);

CREATE INDEX IF NOT EXISTS idx_design_instruction_presets_scope
  ON public.design_instruction_presets(instruction_kind, category_scope, channel_scope, lifecycle_status, preset_code)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.product_tag_cards (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  template_preset_id TEXT REFERENCES public.design_instruction_presets(id) ON DELETE RESTRICT,
  brand_name_en TEXT NOT NULL DEFAULT '',
  brand_subline_en TEXT NOT NULL DEFAULT '',
  slots JSONB NOT NULL DEFAULT '[{"visible":false},{"visible":false},{"visible":false},{"visible":false}]'::jsonb,
  brand_slogan_ja TEXT NOT NULL DEFAULT '',
  color_theme TEXT NOT NULL DEFAULT 'neutral',
  usage_scopes JSONB NOT NULL DEFAULT '["hero","packaging"]'::jsonb,
  lifecycle_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN ('draft','confirmed','generated','archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1 CHECK (record_version > 0),
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  CHECK (jsonb_typeof(slots) = 'array'),
  CHECK (jsonb_array_length(slots) = 4),
  CHECK (jsonb_typeof(usage_scopes) = 'array'),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_tag_cards_current
  ON public.product_tag_cards(product_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_tag_cards_status
  ON public.product_tag_cards(lifecycle_status, updated_at DESC)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.product_hero_specs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  template_id TEXT NOT NULL REFERENCES public.design_templates(id) ON DELETE RESTRICT,
  tag_card_id TEXT REFERENCES public.product_tag_cards(id) ON DELETE RESTRICT,
  layout_preset_id TEXT REFERENCES public.design_instruction_presets(id) ON DELETE RESTRICT,
  model_preset_id TEXT REFERENCES public.design_instruction_presets(id) ON DELETE RESTRICT,
  product_display_preset_id TEXT REFERENCES public.design_instruction_presets(id) ON DELETE RESTRICT,
  model_asset_id TEXT REFERENCES public.product_assets(id) ON DELETE SET NULL,
  product_display_asset_id TEXT REFERENCES public.product_assets(id) ON DELETE SET NULL,
  sku_asset_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  product_display_mode TEXT NOT NULL DEFAULT 'flat_lay'
    CHECK (product_display_mode IN ('flat_lay','three_quarter','source')),
  primary_selling_point_binding JSONB NOT NULL DEFAULT '{}'::jsonb,
  secondary_selling_point_binding JSONB NOT NULL DEFAULT '{}'::jsonb,
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
  CHECK (jsonb_typeof(sku_asset_ids) = 'array'),
  CHECK (jsonb_typeof(primary_selling_point_binding) = 'object'),
  CHECK (jsonb_typeof(secondary_selling_point_binding) = 'object'),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_hero_specs_current
  ON public.product_hero_specs(product_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_hero_specs_status
  ON public.product_hero_specs(lifecycle_status, updated_at DESC)
  WHERE archived_at IS NULL;

INSERT INTO public.design_instruction_presets (
  id, preset_code, name, version, instruction_kind, category_scope, channel_scope,
  instruction_schema, instruction_text, constraints, lifecycle_status, metadata, source_system
)
VALUES
(
  'dip_miwa_product_tag_card_v1',
  'MIWA-PRODUCT-TAG-CARD-V1',
  'MIWA Unified Product Tag Card',
  '1.0',
  'tag_card',
  NULL,
  NULL,
  '{"structure":["brandNameEn","brandSublineEn","slot1","slot2","slot3","slot4","brandSloganJa"],"slotCount":4,"emptySlotsMayHide":true}'::jsonb,
  'Render one reusable product tag card with a fixed brand header and Japanese slogan footer. The middle area has exactly four configurable slots whose content is category-specific. Preserve the same outer dimensions so the card can be reused in hero images and packaging.',
  '{"productTruthMustNotBeDuplicated":true,"factBoundSlotsReadProductTruth":true,"manualTextIsPresentationOnly":true}'::jsonb,
  'active',
  '{"current":true,"purpose":"cross-category hero-and-packaging tag asset"}'::jsonb,
  'aione-design-center-v1'
),
(
  'dip_unified_hero_square_layout_v1',
  'UNIFIED-HERO-SQUARE-LAYOUT-V1',
  'Unified Product Hero Square Layout',
  '1.0',
  'hero_layout',
  NULL,
  NULL,
  '{"canvas":{"width":1000,"height":1000},"slots":["tag_card","model_hero","product_display","primary_badge","secondary_badge"]}'::jsonb,
  'Compose a clean 1:1 commerce hero. Keep the reusable Product Tag Card at upper left, the strongest selling point at upper right, the model/product hero as the visual focus, the real SKU/set display clearly visible, and the secondary selling point in a lower corner. Keep whitespace and product readability high.',
  '{"canvasRatio":"1:1","doNotInventProductFacts":true,"humanReviewRequired":true}'::jsonb,
  'active',
  '{"current":true,"purpose":"cross-category hero composition"}'::jsonb,
  'aione-design-center-v1'
),
(
  'dip_socks_white_bg_model_v1',
  'SOCKS-WHITE-BG-MODEL-V1',
  'Socks White Background Model',
  '1.0',
  'model_generation',
  'socks',
  NULL,
  '{"subject":"lower-leg model","background":"white","crop":"below-knee","productVisibility":"sock-cuff-and-pattern-clear"}'::jsonb,
  'Generate a clean white-background lower-leg wearing image. Use a model appropriate to the product target gender. Keep a stable commercial angle with natural front/back leg separation. The trousers must not cover the sock cuff. The sock color, pattern, length, knit structure, and visible details must remain faithful to the CURRENT confirmed product materials.',
  '{"noFaceRequired":true,"pantsMustNotCoverSock":true,"preserveProductTruth":true,"noInventedPattern":true,"noInventedColor":true}'::jsonb,
  'active',
  '{"current":true,"purpose":"socks hero model standardization"}'::jsonb,
  'aione-design-center-v1'
),
(
  'dip_socks_flat_lay_set_v1',
  'SOCKS-FLAT-LAY-SET-V1',
  'Socks White Background Set Display',
  '1.0',
  'product_display',
  'socks',
  NULL,
  '{"background":"white","displayMode":"flat_lay","variantSource":"CURRENT SKU materials","setSource":"Product Truth"}'::jsonb,
  'Create a standardized white-background flat-lay display of the real sock set. Show the true set quantity and all actual variants clearly. Keep proportions consistent and preserve the real colors, patterns, cuff construction, and sock length from CURRENT confirmed materials.',
  '{"preserveActualVariants":true,"preserveSetCount":true,"noInventedVariant":true,"noInventedPattern":true}'::jsonb,
  'active',
  '{"current":true,"purpose":"socks hero product display"}'::jsonb,
  'aione-design-center-v1'
)
ON CONFLICT (preset_code, version) DO NOTHING;

INSERT INTO public.design_templates (
  id, template_code, name, version, output_type, category_scope, channel_scope, store_scope,
  canvas_width, canvas_height, layout_spec, required_source_roles, required_product_facts,
  allowed_operations, validation_rules, prompt_template_ref, lifecycle_status, metadata, source_system
)
VALUES (
  'dtpl_unified_product_hero_square_v1',
  'UNIFIED-PRODUCT-HERO-1000X1000',
  'Unified Product Hero 1000x1000',
  '1.0',
  'product_hero_image',
  NULL,
  NULL,
  NULL,
  1000,
  1000,
  '{"layoutPresetCode":"UNIFIED-HERO-SQUARE-LAYOUT-V1","slots":{"tag_card":{"x":"4%","y":"4%","w":"31%","h":"36%"},"model_hero":{"x":"36%","y":"5%","w":"60%","h":"91%"},"product_display":{"x":"4%","y":"48%","w":"34%","h":"30%"},"primary_badge":{"x":"82%","y":"3%","w":"15%","h":"18%"},"secondary_badge":{"x":"0%","y":"80%","w":"28%","h":"20%"}}}'::jsonb,
  '["white_bg_product","sku_set"]'::jsonb,
  '["productCode"]'::jsonb,
  '["generate_model_hero","normalize_product_display","compose_product_hero"]'::jsonb,
  '{"sourceTruthRequired":true,"humanReviewRequired":true,"tagCardRequired":true,"doNotInventFacts":true}'::jsonb,
  'UNIFIED-HERO-SQUARE-LAYOUT-V1',
  'active',
  '{"current":true,"stage":"design-center-v1","fiveSlotContract":true}'::jsonb,
  'aione-design-center-v1'
)
ON CONFLICT (template_code, version) DO NOTHING;

-- Supersede only the old mens-socks page-01 hero definition. Existing historical
-- design tasks remain valid because the old template is not deleted.
UPDATE public.design_templates
   SET lifecycle_status='deprecated',
       metadata=metadata || '{"supersededBy":"dtpl_unified_product_hero_square_v1","supersededReason":"unified-square-hero-v1"}'::jsonb,
       updated_at=NOW(),
       record_version=record_version+1
 WHERE id='dtpl_mens_socks_rakuten_hero_v1'
   AND lifecycle_status <> 'archived';

UPDATE public.design_template_set_items
   SET template_id='dtpl_unified_product_hero_square_v1',
       asset_bindings=asset_bindings || '{"semanticRoles":["white_bg_product","sku_set","model_hero","tag_card"],"requiredSourceRoles":["white_bg_product","sku_set"],"generatedRoles":["model_hero","tag_card"],"heroContract":"five-slot-v1"}'::jsonb,
       instruction_defaults=instruction_defaults || '{"layoutPresetCode":"UNIFIED-HERO-SQUARE-LAYOUT-V1","tagCardPresetCode":"MIWA-PRODUCT-TAG-CARD-V1"}'::jsonb,
       metadata=metadata || '{"heroTemplate":"unified-square-v1"}'::jsonb,
       updated_at=NOW(),
       record_version=record_version+1
 WHERE id='dtsi_mens_socks_hero_01_v1';

COMMIT;
