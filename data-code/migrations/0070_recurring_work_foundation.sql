BEGIN;

CREATE TABLE IF NOT EXISTS public.work_templates (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  work_type TEXT NOT NULL DEFAULT 'recurring_task',
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  business_scope TEXT,
  related_object_type TEXT,
  related_object_id TEXT,
  evidence_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  completion_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','inactive','archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.recurring_rules (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  work_template_id TEXT NOT NULL REFERENCES public.work_templates(id) ON DELETE RESTRICT,
  cadence TEXT NOT NULL CHECK (cadence IN ('daily','weekly','monthly')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  generate_day SMALLINT,
  generate_time TIME NOT NULL DEFAULT '00:05',
  deadline_day SMALLINT,
  deadline_time TIME,
  audience_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  rule_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE,
  effective_to DATE,
  rule_version TEXT NOT NULL DEFAULT 'v1',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  CHECK (generate_day IS NULL OR generate_day BETWEEN 0 AND 31),
  CHECK (deadline_day IS NULL OR deadline_day BETWEEN 0 AND 31),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);

ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS work_template_id TEXT REFERENCES public.work_templates(id) ON DELETE SET NULL;
ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS recurring_rule_id TEXT REFERENCES public.recurring_rules(id) ON DELETE SET NULL;
ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS cycle_key TEXT;
ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;
ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS overdue_at TIMESTAMPTZ;
ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS responsible_person_id TEXT;
ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS assigned_by_person_id TEXT;
ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS verifier_person_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_work_items_recurring_cycle_assignee
  ON public.work_items(recurring_rule_id, cycle_key, responsible_person_id)
  WHERE recurring_rule_id IS NOT NULL AND cycle_key IS NOT NULL AND responsible_person_id IS NOT NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_recurring_cycle
  ON public.work_items(recurring_rule_id, cycle_key, due_at);
CREATE INDEX IF NOT EXISTS idx_work_items_responsible_status_due
  ON public.work_items(responsible_person_id, status, due_at)
  WHERE archived_at IS NULL;

ALTER TABLE public.work_evidence ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE public.work_evidence ADD COLUMN IF NOT EXISTS provider_file_id TEXT;
ALTER TABLE public.work_evidence ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.work_evidence ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.work_evidence ADD COLUMN IF NOT EXISTS valid_item_count INTEGER;
ALTER TABLE public.work_evidence ADD COLUMN IF NOT EXISTS validation_message TEXT;
ALTER TABLE public.work_evidence ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_work_evidence_provider_file
  ON public.work_evidence(provider, provider_file_id)
  WHERE provider_file_id IS NOT NULL;

COMMIT;
