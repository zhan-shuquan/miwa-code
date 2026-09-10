BEGIN;

CREATE TABLE IF NOT EXISTS public.design_templates (
  id TEXT PRIMARY KEY,
  template_code TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  output_type TEXT NOT NULL,
  category_scope TEXT,
  channel_scope TEXT,
  store_scope TEXT,
  canvas_width INTEGER NOT NULL CHECK (canvas_width > 0),
  canvas_height INTEGER NOT NULL CHECK (canvas_height > 0),
  layout_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  required_source_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_product_facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  allowed_operations JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  prompt_template_ref TEXT,
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
  UNIQUE (template_code, version)
);

CREATE INDEX IF NOT EXISTS idx_design_templates_scope
  ON public.design_templates(category_scope, channel_scope, lifecycle_status, template_code, version);

CREATE TABLE IF NOT EXISTS public.design_tasks (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  template_id TEXT NOT NULL REFERENCES public.design_templates(id) ON DELETE RESTRICT,
  task_type TEXT NOT NULL,
  task_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (task_status IN ('draft','proposed','approved','running','completed','rejected','failed','cancelled')),
  input_asset_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_fact_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  instruction_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  input_snapshot_hash TEXT NOT NULL,
  instruction_hash TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  ai_execution_id TEXT REFERENCES public.ai_executions(id) ON DELETE SET NULL,
  approved_by_person_id TEXT,
  approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failure_code TEXT,
  failure_detail JSONB,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','approved','rejected','regenerate_requested')),
  reviewed_by_person_id TEXT,
  reviewed_at TIMESTAMPTZ,
  review_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1 CHECK (record_version > 0),
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  CHECK (jsonb_typeof(input_asset_ids) = 'array'),
  CHECK (jsonb_typeof(input_fact_snapshot) = 'object'),
  CHECK (jsonb_typeof(instruction_snapshot) = 'object'),
  CHECK (approved_at IS NULL OR approved_by_person_id IS NOT NULL),
  CHECK (reviewed_at IS NULL OR reviewed_by_person_id IS NOT NULL),
  CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_design_tasks_product_status
  ON public.design_tasks(product_id, task_status, created_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_design_tasks_template
  ON public.design_tasks(template_id, task_status, created_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_design_tasks_review
  ON public.design_tasks(product_id, review_status, created_at DESC)
  WHERE archived_at IS NULL;

COMMIT;
