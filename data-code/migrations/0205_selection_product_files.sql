-- Reuse the leased, idempotent ERP command queue. No historic records are enqueued.
ALTER TABLE public.selection_erp_commands DROP CONSTRAINT IF EXISTS selection_erp_commands_kind_check;
ALTER TABLE public.selection_erp_commands ADD CONSTRAINT selection_erp_commands_kind_check
  CHECK (kind IN ('person_prefix','formal_number','product_files'));
