BEGIN;
-- Reuse canonical opportunity, selection number, personnel, work and asset objects.
ALTER TABLE public.product_opportunities ADD COLUMN IF NOT EXISTS selection_no TEXT;
ALTER TABLE public.product_opportunities ADD COLUMN IF NOT EXISTS selection_date DATE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_opportunities_selection_no ON public.product_opportunities(selection_no) WHERE selection_no IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.selection_number_counters(selection_date DATE PRIMARY KEY,last_number BIGINT NOT NULL CHECK(last_number>0),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE public.selection_number_counters DROP CONSTRAINT IF EXISTS selection_number_counters_last_number_check;
ALTER TABLE public.selection_number_counters ALTER COLUMN last_number TYPE BIGINT;
ALTER TABLE public.selection_number_counters DROP CONSTRAINT IF EXISTS selection_number_counters_last_number_positive;
ALTER TABLE public.selection_number_counters ADD CONSTRAINT selection_number_counters_last_number_positive CHECK(last_number>0);
INSERT INTO public.selection_number_counters(selection_date,last_number)
SELECT to_date(substring(selection_no from 3 for 6),'YYMMDD'),max(substring(selection_no from 9)::bigint)
FROM public.product_opportunities WHERE selection_no ~ '^xp[0-9]{9,}$' GROUP BY 1
ON CONFLICT(selection_date) DO UPDATE SET last_number=greatest(selection_number_counters.last_number,excluded.last_number);
CREATE TABLE IF NOT EXISTS public.selection_intake_requests(
 actor_id TEXT NOT NULL, request_key TEXT NOT NULL, payload_hash TEXT NOT NULL,
 result JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(actor_id,request_key)
);
ALTER TABLE public.selection_intake_requests ADD COLUMN IF NOT EXISTS raw_text TEXT;
CREATE TABLE IF NOT EXISTS public.selection_erp_commands(
 id UUID PRIMARY KEY, command_key TEXT UNIQUE NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('person_prefix','formal_number')),
 selection_id TEXT REFERENCES public.product_opportunities(id), payload JSONB NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','succeeded','failed')),
 attempts INTEGER NOT NULL DEFAULT 0, lease_token UUID, lease_until TIMESTAMPTZ, result JSONB,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.selection_identity_keys(
 identity_key TEXT PRIMARY KEY, selection_id TEXT NOT NULL REFERENCES public.product_opportunities(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS selection_identity_record ON public.selection_identity_keys(selection_id);
-- Authorization is configuration, never a special-case member ID in code.
INSERT INTO public.selection_workspace_config(key,value)
SELECT 'pool-grants', '{"86000":{"collect":true,"assign":true,"manage":true,"manageGrants":true}}'::jsonb
WHERE EXISTS(SELECT 1 FROM public.people WHERE id='86000')
ON CONFLICT(key) DO NOTHING;
COMMIT;
