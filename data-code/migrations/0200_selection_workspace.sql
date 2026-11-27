BEGIN;
-- Extend the canonical Selection object; do not create a second product catalog.
ALTER TABLE public.product_opportunities ADD COLUMN IF NOT EXISTS selection_workspace JSONB;
CREATE UNIQUE INDEX IF NOT EXISTS selection_workspace_code_unique ON public.product_opportunities ((selection_workspace->'data'->>'item_code')) WHERE selection_workspace->'data'->>'item_code' <> '';
CREATE TABLE IF NOT EXISTS public.selection_workspace_config (
 key TEXT PRIMARY KEY, value JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.selection_workspace_assets (
 id UUID PRIMARY KEY, selection_id TEXT NOT NULL REFERENCES public.product_opportunities(id),
 filename TEXT NOT NULL, content_type TEXT NOT NULL, bytes BYTEA NOT NULL, sha256 TEXT NOT NULL,
 position INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(selection_id,sha256)
);
CREATE TABLE IF NOT EXISTS public.selection_workspace_events (
 id BIGSERIAL PRIMARY KEY, selection_id TEXT NOT NULL, actor_id TEXT NOT NULL,
 action TEXT NOT NULL, version INTEGER NOT NULL, detail JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.selection_erp_jobs (
 id UUID PRIMARY KEY, selection_id TEXT NOT NULL REFERENCES public.product_opportunities(id), selection_version INTEGER NOT NULL,
 payload JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','succeeded','failed','conflict')),
 attempts INTEGER NOT NULL DEFAULT 0, lease_until TIMESTAMPTZ, lease_token UUID,
 result JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(selection_id,selection_version)
);
CREATE INDEX IF NOT EXISTS selection_erp_jobs_poll ON public.selection_erp_jobs(status,lease_until);
COMMIT;
