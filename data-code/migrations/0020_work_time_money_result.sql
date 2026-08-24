BEGIN;

CREATE TABLE IF NOT EXISTS public.work_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  work_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('draft','pending','in_progress','blocked','waiting','completed','cancelled','archived')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  owner_person_id TEXT,
  owner_assignment_id TEXT REFERENCES public.assignments(id) ON DELETE SET NULL,
  created_by_person_id TEXT,
  workbench_code TEXT,
  related_object_type TEXT,
  related_object_id TEXT,
  goal_summary TEXT,
  description TEXT,
  platform_code TEXT,
  money_status TEXT NOT NULL DEFAULT 'pending' CHECK (money_status IN ('has_amount','pending','not_applicable')),
  expected_result TEXT,
  result_summary TEXT,
  due_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_work_items_owner_status ON public.work_items(owner_person_id, status);
CREATE INDEX IF NOT EXISTS idx_work_items_business_status ON public.work_items(business_id, status);
CREATE INDEX IF NOT EXISTS idx_work_items_due ON public.work_items(due_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_work_items_related ON public.work_items(related_object_type, related_object_id);

CREATE TABLE IF NOT EXISTS public.work_item_participants (
  id TEXT PRIMARY KEY,
  work_item_id TEXT NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL,
  assignment_id TEXT REFERENCES public.assignments(id) ON DELETE SET NULL,
  participant_role TEXT NOT NULL DEFAULT 'collaborator'
    CHECK (participant_role IN ('owner','assignee','collaborator','reviewer','observer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (work_item_id, person_id, participant_role),
  CHECK (left_at IS NULL OR left_at >= joined_at)
);

CREATE INDEX IF NOT EXISTS idx_work_participants_person ON public.work_item_participants(person_id, participant_role);

CREATE TABLE IF NOT EXISTS public.work_sessions (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  assignment_id TEXT REFERENCES public.assignments(id) ON DELETE SET NULL,
  work_item_id TEXT REFERENCES public.work_items(id) ON DELETE SET NULL,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('aione','external','other','break','unclassified')),
  source_platform TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  active_seconds INTEGER NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
  detection_method TEXT NOT NULL DEFAULT 'manual_or_event',
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_system TEXT NOT NULL DEFAULT 'aione',
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_work_sessions_person_time ON public.work_sessions(person_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_sessions_work_item ON public.work_sessions(work_item_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_sessions_business_time ON public.work_sessions(business_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.work_evidence (
  id TEXT PRIMARY KEY,
  work_item_id TEXT REFERENCES public.work_items(id) ON DELETE SET NULL,
  person_id TEXT,
  assignment_id TEXT REFERENCES public.assignments(id) ON DELETE SET NULL,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  related_object_type TEXT,
  related_object_id TEXT,
  evidence_type TEXT NOT NULL,
  action_code TEXT,
  happened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  result_code TEXT,
  summary TEXT,
  evidence_uri TEXT,
  source_system TEXT NOT NULL DEFAULT 'aione',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_evidence_person_time ON public.work_evidence(person_id, happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_evidence_work ON public.work_evidence(work_item_id, happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_evidence_object ON public.work_evidence(related_object_type, related_object_id, happened_at DESC);

CREATE TABLE IF NOT EXISTS public.money_events (
  id TEXT PRIMARY KEY,
  direction TEXT NOT NULL CHECK (direction IN ('income','expense','cost','transfer','other')),
  money_type TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'JPY',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','paid','received','cancelled','reconciled')),
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  work_item_id TEXT REFERENCES public.work_items(id) ON DELETE SET NULL,
  person_id TEXT,
  related_object_type TEXT,
  related_object_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  source_system TEXT NOT NULL DEFAULT 'aione',
  external_ref TEXT,
  evidence_uri TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  record_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_money_events_business_time ON public.money_events(business_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_money_events_person_time ON public.money_events(person_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_money_events_work ON public.money_events(work_item_id);
CREATE INDEX IF NOT EXISTS idx_money_events_direction_status ON public.money_events(direction, status);

CREATE TABLE IF NOT EXISTS public.result_facts (
  id TEXT PRIMARY KEY,
  result_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'observed' CHECK (status IN ('planned','observed','validated','rejected','superseded')),
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  work_item_id TEXT REFERENCES public.work_items(id) ON DELETE SET NULL,
  person_id TEXT,
  related_object_type TEXT,
  related_object_id TEXT,
  metric_code TEXT,
  numeric_value NUMERIC(20,4),
  text_value TEXT,
  unit TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evidence_id TEXT REFERENCES public.work_evidence(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_system TEXT NOT NULL DEFAULT 'aione'
);

CREATE INDEX IF NOT EXISTS idx_result_facts_person_time ON public.result_facts(person_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_result_facts_business_time ON public.result_facts(business_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_result_facts_metric ON public.result_facts(metric_code, observed_at DESC);

CREATE OR REPLACE VIEW public.v_person_daily_time_summary AS
SELECT
  person_id,
  (started_at AT TIME ZONE 'Asia/Tokyo')::date AS work_date,
  SUM(active_seconds) FILTER (WHERE session_type = 'aione') AS aione_seconds,
  SUM(active_seconds) FILTER (WHERE session_type = 'external') AS external_seconds,
  SUM(active_seconds) FILTER (WHERE session_type = 'other') AS other_seconds,
  SUM(active_seconds) FILTER (WHERE session_type = 'break') AS break_seconds,
  SUM(active_seconds) FILTER (WHERE session_type = 'unclassified') AS unclassified_seconds,
  SUM(active_seconds) FILTER (WHERE session_type IN ('aione','external','other')) AS effective_work_seconds,
  SUM(active_seconds) AS recorded_seconds
FROM public.work_sessions
GROUP BY person_id, (started_at AT TIME ZONE 'Asia/Tokyo')::date;

COMMIT;
