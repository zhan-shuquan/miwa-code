BEGIN;

CREATE TABLE IF NOT EXISTS public.person_login_emails (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  source_system TEXT NOT NULL DEFAULT 'aione',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ck_person_login_emails_status CHECK (status IN ('active','disabled','revoked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_person_login_emails_normalized
  ON public.person_login_emails (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_person_login_emails_person
  ON public.person_login_emails (person_id, status);

-- Register each current canonical primary email as an allowed login email.
INSERT INTO public.person_login_emails
  (id, person_id, email, status, is_primary, source_system, metadata)
SELECT
  'email:' || LOWER(primary_email),
  id,
  LOWER(primary_email),
  'active',
  TRUE,
  'aione-migration',
  '{"migration_source":"people.primary_email"}'::jsonb
FROM public.people
WHERE primary_email IS NOT NULL AND btrim(primary_email) <> ''
ON CONFLICT (LOWER(email)) DO NOTHING;

-- Current AIONE business login alias for person 86000.
INSERT INTO public.person_login_emails
  (id, person_id, email, status, is_primary, source_system, metadata)
VALUES
  ('email:info@miwa-happyhouse.com', '86000', 'info@miwa-happyhouse.com', 'active', FALSE, 'aione', '{"purpose":"google_login_alias"}'::jsonb)
ON CONFLICT (LOWER(email)) DO UPDATE SET
  person_id = EXCLUDED.person_id,
  status = 'active',
  updated_at = NOW();

COMMENT ON TABLE public.person_login_emails IS
  'Canonical verified/allowed login email aliases for AIONE people. A person may authenticate with more than one approved email without changing people.primary_email.';

COMMIT;
