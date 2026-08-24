BEGIN;

-- AIONE V1.7 core model.
-- IMPORTANT: public.people remains the canonical person source from the existing database.
-- person_id columns below are TEXT logical references until live preflight confirms the physical type of public.people.id.

CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
  org_type TEXT NOT NULL CHECK (org_type IN ('group','company','department','team','other')),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planned','active','paused','closed')),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  UNIQUE (parent_id, code)
);

CREATE INDEX IF NOT EXISTS idx_organizations_parent ON public.organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_organizations_type_status ON public.organizations(org_type, status);

CREATE TABLE IF NOT EXISTS public.businesses (
  id TEXT PRIMARY KEY,
  company_org_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
  parent_business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'planned'
    CHECK (lifecycle_status IN ('idea','planning','ready','launching','trial','active','adjusting','paused','closed')),
  goal_summary TEXT,
  launch_condition_summary TEXT,
  planned_at TIMESTAMPTZ,
  launched_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_businesses_company_status ON public.businesses(company_org_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_businesses_parent ON public.businesses(parent_business_id);

CREATE TABLE IF NOT EXISTS public.positions (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  position_type TEXT NOT NULL DEFAULT 'human' CHECK (position_type IN ('human','ai')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','paused','closed')),
  headcount_status TEXT NOT NULL DEFAULT 'not_enabled'
    CHECK (headcount_status IN ('not_enabled','enabled','recruiting','filled','frozen','closed','not_applicable')),
  headcount_limit INTEGER CHECK (headcount_limit IS NULL OR headcount_limit >= 0),
  responsibility_summary TEXT,
  capability_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  compensation_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  UNIQUE (organization_id, business_id, code)
);

CREATE INDEX IF NOT EXISTS idx_positions_org_business ON public.positions(organization_id, business_id);
CREATE INDEX IF NOT EXISTS idx_positions_headcount ON public.positions(headcount_status, status);

CREATE TABLE IF NOT EXISTS public.assignments (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  position_id TEXT NOT NULL REFERENCES public.positions(id) ON DELETE RESTRICT,
  organization_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  assignment_type TEXT NOT NULL DEFAULT 'primary'
    CHECK (assignment_type IN ('primary','concurrent','acting','rotation','temporary','project')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planned','active','ended','cancelled')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  responsibility_summary TEXT,
  business_scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  ended_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_assignments_person_status ON public.assignments(person_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_position_status ON public.assignments(position_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_business ON public.assignments(business_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_effective ON public.assignments(effective_from, effective_to);

CREATE TABLE IF NOT EXISTS public.object_registry (
  id TEXT PRIMARY KEY,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  canonical_table TEXT,
  display_name TEXT,
  lifecycle_status TEXT,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  owner_person_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  UNIQUE (object_type, object_id)
);

CREATE INDEX IF NOT EXISTS idx_object_registry_type ON public.object_registry(object_type, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_object_registry_business ON public.object_registry(business_id);
CREATE INDEX IF NOT EXISTS idx_object_registry_owner ON public.object_registry(owner_person_id);

CREATE TABLE IF NOT EXISTS public.object_relations (
  id TEXT PRIMARY KEY,
  from_object_type TEXT NOT NULL,
  from_object_id TEXT NOT NULL,
  to_object_type TEXT NOT NULL,
  to_object_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_object_relations_from ON public.object_relations(from_object_type, from_object_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_object_relations_to ON public.object_relations(to_object_type, to_object_id, relation_type);

COMMIT;
