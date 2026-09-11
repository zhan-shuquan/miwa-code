BEGIN;

CREATE TABLE IF NOT EXISTS public.design_template_sets (
  id TEXT PRIMARY KEY,
  set_code TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  category_scope TEXT,
  channel_scope TEXT,
  store_scope TEXT,
  match_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  common_fact_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
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
  CHECK (jsonb_typeof(match_rules) = 'object'),
  CHECK (jsonb_typeof(common_fact_keys) = 'array'),
  UNIQUE (set_code, version)
);

CREATE INDEX IF NOT EXISTS idx_design_template_sets_scope
  ON public.design_template_sets(category_scope, channel_scope, lifecycle_status, set_code, version)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.design_template_set_items (
  id TEXT PRIMARY KEY,
  template_set_id TEXT NOT NULL REFERENCES public.design_template_sets(id) ON DELETE RESTRICT,
  template_id TEXT NOT NULL REFERENCES public.design_templates(id) ON DELETE RESTRICT,
  page_no INTEGER NOT NULL CHECK (page_no > 0 AND page_no <= 999),
  page_code TEXT NOT NULL,
  page_name TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  default_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  field_bindings JSONB NOT NULL DEFAULT '{}'::jsonb,
  asset_bindings JSONB NOT NULL DEFAULT '{}'::jsonb,
  instruction_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1 CHECK (record_version > 0),
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  CHECK (jsonb_typeof(field_bindings) = 'object'),
  CHECK (jsonb_typeof(asset_bindings) = 'object'),
  CHECK (jsonb_typeof(instruction_defaults) = 'object'),
  UNIQUE (template_set_id, page_no),
  UNIQUE (template_set_id, page_code)
);

CREATE INDEX IF NOT EXISTS idx_design_template_set_items_set
  ON public.design_template_set_items(template_set_id, page_no)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_design_template_set_items_template
  ON public.design_template_set_items(template_id)
  WHERE archived_at IS NULL;

ALTER TABLE public.design_tasks
  ADD COLUMN IF NOT EXISTS template_set_id TEXT REFERENCES public.design_template_sets(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS template_set_item_id TEXT REFERENCES public.design_template_set_items(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS page_code TEXT,
  ADD COLUMN IF NOT EXISTS page_no INTEGER CHECK (page_no IS NULL OR (page_no > 0 AND page_no <= 999));

CREATE INDEX IF NOT EXISTS idx_design_tasks_template_set
  ON public.design_tasks(template_set_id, product_id, created_at DESC)
  WHERE archived_at IS NULL AND template_set_id IS NOT NULL;

INSERT INTO public.design_template_sets (
  id, set_code, name, version, category_scope, channel_scope, store_scope,
  match_rules, common_fact_keys, lifecycle_status, metadata, source_system
)
VALUES (
  'dtset_socks_rakuten_base_v1',
  'SOCKS-RAKUTEN-BASE',
  'Socks Rakuten Base Validator',
  '1.0',
  'socks',
  'rakuten',
  NULL,
  '{"purpose":"first-real-template-set-validator","operatorSelectionRequired":true}'::jsonb,
  '["productCode","name","category","material","size","colors","sellingPoints"]'::jsonb,
  'active',
  '{"stage":"v1-first-validator","batchGeneration":false,"humanReviewRequired":true}'::jsonb,
  'aione-ai-assisted-design-template-set-v1'
)
ON CONFLICT (set_code, version) DO NOTHING;

INSERT INTO public.design_template_set_items (
  id, template_set_id, template_id, page_no, page_code, page_name,
  required, default_enabled, field_bindings, asset_bindings,
  instruction_defaults, metadata, source_system
)
SELECT
  'dtsi_socks_rakuten_base_benefit_v1',
  'dtset_socks_rakuten_base_v1',
  dt.id,
  1,
  'benefit-01',
  'Benefit / Feature',
  TRUE,
  TRUE,
  '{"scope":"template-required-product-facts"}'::jsonb,
  '{"selection":"human-curated","preferredFolders":["02_产品图","03_实拍图"],"filenameHints":["主图","详情图","细节图"]}'::jsonb,
  '{}'::jsonb,
  '{"purpose":"prove-template-set-selection-before-generation"}'::jsonb,
  'aione-ai-assisted-design-template-set-v1'
FROM public.design_templates dt
WHERE dt.id='dtpl_socks_rakuten_benefit_1000x1500_v1'
ON CONFLICT (template_set_id, page_code) DO NOTHING;

COMMIT;
