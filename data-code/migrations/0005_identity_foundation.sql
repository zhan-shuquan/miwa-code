BEGIN;

-- AIONE canonical identity foundation.
-- This migration must support BOTH:
-- 1) a fresh AIONE database; and
-- 2) an older AIONE database that already has minimal people/external_identities tables.
-- Never drop/recreate identity tables during an upgrade: preserve existing facts and add
-- the canonical columns in place.

CREATE TABLE IF NOT EXISTS public.people (
  id TEXT PRIMARY KEY
);

ALTER TABLE public.people ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS primary_email TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS record_version INTEGER;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS source_system TEXT;
ALTER TABLE public.people ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Preserve a legacy `name` column when present by copying it into the canonical display name.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='people' AND column_name='name'
  ) THEN
    EXECUTE 'UPDATE public.people SET display_name = COALESCE(display_name, name) WHERE display_name IS NULL';
  END IF;
END $$;

UPDATE public.people SET status = 'active' WHERE status IS NULL;
UPDATE public.people SET metadata = '{}'::jsonb WHERE metadata IS NULL;
UPDATE public.people SET created_at = NOW() WHERE created_at IS NULL;
UPDATE public.people SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE public.people SET record_version = 1 WHERE record_version IS NULL;
UPDATE public.people SET source_system = 'aione' WHERE source_system IS NULL;

ALTER TABLE public.people ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.people ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.people ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
ALTER TABLE public.people ALTER COLUMN metadata SET NOT NULL;
ALTER TABLE public.people ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.people ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.people ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE public.people ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.people ALTER COLUMN record_version SET DEFAULT 1;
ALTER TABLE public.people ALTER COLUMN record_version SET NOT NULL;
ALTER TABLE public.people ALTER COLUMN source_system SET DEFAULT 'aione';
ALTER TABLE public.people ALTER COLUMN source_system SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_people_status') THEN
    ALTER TABLE public.people ADD CONSTRAINT ck_people_status
      CHECK (status IN ('planned','active','inactive','archived')) NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_people_primary_email_normalized
  ON public.people (LOWER(primary_email))
  WHERE primary_email IS NOT NULL AND btrim(primary_email) <> '';
CREATE INDEX IF NOT EXISTS idx_people_status
  ON public.people(status) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.external_identities (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  subject TEXT NOT NULL
);

ALTER TABLE public.external_identities ADD COLUMN IF NOT EXISTS person_id TEXT;
ALTER TABLE public.external_identities ADD COLUMN IF NOT EXISTS email_snapshot TEXT;
ALTER TABLE public.external_identities ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.external_identities ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE public.external_identities ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE public.external_identities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE public.external_identities ADD COLUMN IF NOT EXISTS last_authenticated_at TIMESTAMPTZ;
ALTER TABLE public.external_identities ADD COLUMN IF NOT EXISTS source_system TEXT;

UPDATE public.external_identities SET status = 'active' WHERE status IS NULL;
UPDATE public.external_identities SET metadata = '{}'::jsonb WHERE metadata IS NULL;
UPDATE public.external_identities SET created_at = NOW() WHERE created_at IS NULL;
UPDATE public.external_identities SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE public.external_identities SET source_system = 'aione' WHERE source_system IS NULL;

ALTER TABLE public.external_identities ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.external_identities ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.external_identities ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
ALTER TABLE public.external_identities ALTER COLUMN metadata SET NOT NULL;
ALTER TABLE public.external_identities ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.external_identities ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.external_identities ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE public.external_identities ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.external_identities ALTER COLUMN source_system SET DEFAULT 'aione';
ALTER TABLE public.external_identities ALTER COLUMN source_system SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='uq_external_identities_provider_subject') THEN
    ALTER TABLE public.external_identities ADD CONSTRAINT uq_external_identities_provider_subject UNIQUE (provider, subject);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_external_identities_status') THEN
    ALTER TABLE public.external_identities ADD CONSTRAINT ck_external_identities_status
      CHECK (status IN ('active','disabled','revoked')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_external_identities_person') THEN
    ALTER TABLE public.external_identities ADD CONSTRAINT fk_external_identities_person
      FOREIGN KEY (person_id) REFERENCES public.people(id) ON DELETE RESTRICT NOT VALID;
  END IF;
END $$;

-- Do not force person_id NOT NULL on a legacy database until all historical rows have
-- been reconciled. New AIONE-auth writes always supply a person_id. The reconciliation
-- can later validate the FK and tighten nullability with explicit evidence.

CREATE INDEX IF NOT EXISTS idx_external_identities_person
  ON public.external_identities(person_id, status);
CREATE INDEX IF NOT EXISTS idx_external_identities_email
  ON public.external_identities(LOWER(email_snapshot))
  WHERE email_snapshot IS NOT NULL AND btrim(email_snapshot) <> '';

COMMENT ON TABLE public.people IS
  'Canonical AIONE human identity source. Organization/position/assignment remain separate domain facts.';
COMMENT ON TABLE public.external_identities IS
  'Authentication-provider identity mapping. provider + subject maps to one canonical person.';

COMMIT;
