BEGIN;

-- AIONE canonical identity foundation.
-- Purpose: make a fresh AIONE database self-initializing without depending on
-- undocumented legacy identity tables.
-- Keep this layer deliberately small: people are canonical human identities;
-- external_identities maps authentication-provider subjects to people.
-- No preview/test users are seeded by this migration.

CREATE TABLE IF NOT EXISTS public.people (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  primary_email TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('planned','active','inactive','archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_people_primary_email_normalized
  ON public.people (LOWER(primary_email))
  WHERE primary_email IS NOT NULL AND btrim(primary_email) <> '';
CREATE INDEX IF NOT EXISTS idx_people_status
  ON public.people(status) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.external_identities (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  person_id TEXT NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  email_snapshot TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','disabled','revoked')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_authenticated_at TIMESTAMPTZ,
  source_system TEXT NOT NULL DEFAULT 'aione',
  UNIQUE (provider, subject)
);

CREATE INDEX IF NOT EXISTS idx_external_identities_person
  ON public.external_identities(person_id, status);
CREATE INDEX IF NOT EXISTS idx_external_identities_email
  ON public.external_identities(LOWER(email_snapshot))
  WHERE email_snapshot IS NOT NULL AND btrim(email_snapshot) <> '';

COMMENT ON TABLE public.people IS
  'Canonical AIONE human identity source. Organization/position/assignment are separate domain facts.';
COMMENT ON TABLE public.external_identities IS
  'Authentication-provider identity mapping. provider + subject is globally unique and maps to one canonical person.';

COMMIT;
