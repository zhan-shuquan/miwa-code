-- Expiring transport buffers only; business assets remain in the existing asset table.
CREATE TABLE IF NOT EXISTS selection_upload_transport (
  id UUID PRIMARY KEY,
  owner_id TEXT NOT NULL,
  path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  sha256 TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '1 hour'
);
CREATE INDEX IF NOT EXISTS selection_upload_transport_owner ON selection_upload_transport(owner_id, expires_at);
CREATE TABLE IF NOT EXISTS selection_upload_chunks (
  upload_id UUID REFERENCES selection_upload_transport(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  bytes BYTEA NOT NULL,
  PRIMARY KEY(upload_id, position)
);
