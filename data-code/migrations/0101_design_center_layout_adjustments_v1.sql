BEGIN;

ALTER TABLE public.product_hero_specs
  ADD COLUMN IF NOT EXISTS layout_adjustments JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.product_hero_specs
  DROP CONSTRAINT IF EXISTS product_hero_specs_layout_adjustments_object;
ALTER TABLE public.product_hero_specs
  ADD CONSTRAINT product_hero_specs_layout_adjustments_object
  CHECK (jsonb_typeof(layout_adjustments) = 'object');

CREATE TABLE IF NOT EXISTS public.design_layout_templates (
  id TEXT PRIMARY KEY,
  template_code TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  page_type TEXT NOT NULL DEFAULT 'hero',
  category_scope TEXT,
  channel_scope TEXT,
  layout_adjustments JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_hero_spec_id TEXT REFERENCES public.product_hero_specs(id) ON DELETE SET NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'active'
    CHECK (lifecycle_status IN ('draft','active','deprecated','archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1 CHECK (record_version > 0),
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  CHECK (jsonb_typeof(layout_adjustments) = 'object'),
  CHECK (jsonb_typeof(metadata) = 'object'),
  UNIQUE (template_code, version)
);

CREATE INDEX IF NOT EXISTS idx_design_layout_templates_scope
  ON public.design_layout_templates(page_type, category_scope, channel_scope, lifecycle_status, updated_at DESC)
  WHERE archived_at IS NULL;

COMMIT;
