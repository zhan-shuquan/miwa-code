BEGIN;
CREATE TABLE IF NOT EXISTS public.aione_shared_parameters (
 scope TEXT PRIMARY KEY CHECK(scope='global'),
 version BIGINT NOT NULL CHECK(version>=1),
 payload JSONB NOT NULL CHECK(jsonb_typeof(payload)='object'),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_by TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.aione_shared_parameter_history (
 scope TEXT NOT NULL CHECK(scope='global'),
 version BIGINT NOT NULL,
 payload JSONB NOT NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_by TEXT NOT NULL,
 change_reason TEXT NOT NULL,
 PRIMARY KEY(scope,version)
);
COMMIT;
