BEGIN;

-- V1.9.40 keeps work_items as the only formal work fact. The legacy
-- owner_person_id remains a compatibility mirror of responsible_person_id.
ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS assigned_by_person_id TEXT,
  ADD COLUMN IF NOT EXISTS responsible_person_id TEXT,
  ADD COLUMN IF NOT EXISTS verifier_person_id TEXT;

UPDATE public.work_items
SET responsible_person_id = COALESCE(responsible_person_id, owner_person_id),
    assigned_by_person_id = COALESCE(assigned_by_person_id, created_by_person_id),
    verifier_person_id = COALESCE(verifier_person_id, created_by_person_id)
WHERE responsible_person_id IS NULL
   OR assigned_by_person_id IS NULL
   OR verifier_person_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_responsible_status
  ON public.work_items(responsible_person_id, status);
CREATE INDEX IF NOT EXISTS idx_work_items_assigned_by
  ON public.work_items(assigned_by_person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_items_verifier_status
  ON public.work_items(verifier_person_id, status);

CREATE TABLE IF NOT EXISTS public.work_seeds (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  work_request TEXT NOT NULL,
  responsible_input TEXT,
  responsible_person_id TEXT,
  time_requirement TEXT,
  related_material TEXT,
  notes TEXT,
  source_type TEXT NOT NULL DEFAULT 'local_file'
    CHECK (source_type IN ('local_file','manual','api','system')),
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','interpreted','proposal_created','rejected')),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_person_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_seeds_batch ON public.work_seeds(batch_id, created_at);

CREATE TABLE IF NOT EXISTS public.work_proposals (
  id TEXT PRIMARY KEY,
  seed_id TEXT REFERENCES public.work_seeds(id) ON DELETE SET NULL,
  batch_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting_confirmation'
    CHECK (status IN ('waiting_confirmation','needs_confirmation','approved','rejected','expired')),
  title TEXT NOT NULL,
  work_type TEXT NOT NULL DEFAULT 'assigned',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  responsible_person_id TEXT,
  assigned_by_person_id TEXT NOT NULL,
  verifier_person_id TEXT,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  workbench_code TEXT,
  related_object_type TEXT,
  related_object_id TEXT,
  goal_summary TEXT,
  description TEXT,
  expected_result TEXT,
  due_at TIMESTAMPTZ,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  ai_confidence NUMERIC(4,3) CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),
  structured_facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_auto_approval_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  approved_work_id TEXT REFERENCES public.work_items(id) ON DELETE SET NULL,
  created_by_person_id TEXT NOT NULL,
  approved_by_person_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_proposals_batch_status
  ON public.work_proposals(batch_id, status, created_at);

COMMIT;
