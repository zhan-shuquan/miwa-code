BEGIN;

CREATE TABLE IF NOT EXISTS public.business_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  actor_kind TEXT NOT NULL DEFAULT 'human' CHECK (actor_kind IN ('human','ai','system','automation')),
  actor_person_id TEXT,
  actor_ai_ref TEXT,
  correlation_id TEXT,
  causation_id TEXT,
  happened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_system TEXT NOT NULL DEFAULT 'aione'
);

CREATE INDEX IF NOT EXISTS idx_business_events_object ON public.business_events(object_type, object_id, happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_events_actor ON public.business_events(actor_person_id, happened_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_events_correlation ON public.business_events(correlation_id) WHERE correlation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.knowledge_routes (
  id TEXT PRIMARY KEY,
  object_type TEXT,
  object_id TEXT,
  field_code TEXT,
  route_kind TEXT NOT NULL
    CHECK (route_kind IN ('knowledge','rule','help','methodology','standard','policy','sop')),
  knowledge_id TEXT NOT NULL,
  anchor_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','deprecated')),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  source_system TEXT NOT NULL DEFAULT 'aione',
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_routes_field ON public.knowledge_routes(field_code, route_kind, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_routes_object ON public.knowledge_routes(object_type, object_id, route_kind, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_routes_knowledge ON public.knowledge_routes(knowledge_id, anchor_id);

CREATE TABLE IF NOT EXISTS public.ai_executions (
  id TEXT PRIMARY KEY,
  office_code TEXT,
  ai_secretary_code TEXT,
  requested_by_person_id TEXT,
  work_item_id TEXT REFERENCES public.work_items(id) ON DELETE SET NULL,
  objective TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','planning','waiting_confirmation','running','completed','failed','cancelled')),
  provider TEXT,
  model TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tool_call_count INTEGER NOT NULL DEFAULT 0 CHECK (tool_call_count >= 0),
  input_tokens BIGINT CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens BIGINT CHECK (output_tokens IS NULL OR output_tokens >= 0),
  estimated_cost NUMERIC(18,6) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  result_summary TEXT,
  evidence_id TEXT REFERENCES public.work_evidence(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_ai_executions_person_status ON public.ai_executions(requested_by_person_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_executions_work ON public.ai_executions(work_item_id, created_at DESC);

COMMIT;
