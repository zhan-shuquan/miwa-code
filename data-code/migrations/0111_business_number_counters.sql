BEGIN;
CREATE TABLE IF NOT EXISTS public.aione_business_number_counters (
 counter_key TEXT PRIMARY KEY,
 last_value BIGINT NOT NULL CHECK(last_value>=1),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMIT;
