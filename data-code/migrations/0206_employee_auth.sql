BEGIN;

-- Credential state only. ERP Employee / people remain the identity authority.
CREATE TABLE IF NOT EXISTS aione_auth_credentials (
  person_id TEXT PRIMARY KEY REFERENCES people(id) ON DELETE RESTRICT,
  password_hash TEXT,
  must_change BOOLEAN NOT NULL DEFAULT TRUE,
  temporary_expires_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  auth_epoch BIGINT NOT NULL DEFAULT 0,
  google_not_before TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE aione_auth_credentials ADD COLUMN IF NOT EXISTS google_not_before TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS aione_auth_sessions (
  token_hash TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  auth_epoch BIGINT NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('password','google')),
  purpose TEXT NOT NULL CHECK(purpose IN ('activate','business')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS aione_auth_sessions_person ON aione_auth_sessions(person_id);
CREATE TABLE IF NOT EXISTS aione_auth_throttle (
  key_hash TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS aione_auth_audit (
  id BIGSERIAL PRIMARY KEY,
  person_id TEXT REFERENCES people(id) ON DELETE RESTRICT,
  actor_id TEXT,
  action TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE aione_auth_credentials IS 'Restricted authentication credentials; never exported as employee profile data';
COMMENT ON TABLE aione_auth_audit IS 'Authentication actions only; never include passwords, hashes or tokens';

CREATE TABLE IF NOT EXISTS aione_auth_admin_receipts (
  request_id TEXT PRIMARY KEY,
  request_digest TEXT NOT NULL,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS aione_google_binding_tickets (
  token_hash TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  authorized_by TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

COMMIT;
