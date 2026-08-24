BEGIN;

-- Non-destructive compatibility bridge for the existing minimal database.
-- Existing canonical tables are intentionally NOT recreated or renamed here:
--   public.people
--   public.external_identities
--   public.product_opportunities
--   public.activity_logs
--
-- The live database preflight must confirm public.people.id and product_opportunities columns
-- before physical foreign keys or column-level migrations are added in a later locked migration.

COMMENT ON TABLE public.assignments IS
  'person_id is a logical reference to existing public.people.id until live schema preflight confirms the physical type.';

COMMENT ON TABLE public.object_registry IS
  'Cross-domain index only; domain facts remain in their canonical tables such as product_opportunities.';

COMMENT ON TABLE public.work_sessions IS
  'Effective work-time evidence. It must not equate browser page-open duration with work time.';

COMMENT ON TABLE public.money_events IS
  'Single-source monetary facts for income/expense/cost; downstream homes and analysis read the same facts.';

COMMIT;
