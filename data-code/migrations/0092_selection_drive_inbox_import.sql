BEGIN;

-- AIONE 1688 Drive Inbox Import V1.
-- Product Truth (2026-09-09):
--   * Frontend/business language is unified as 选品.
--   * 1688 groups/tags/remarks are source facts, not a second AIONE selection model.
--   * 直发选品 is retained only as a source-side fulfillment hint.
--   * Remark pure-number weight is source_weight_g (grams), not final billable weight.
--   * Google Drive Inbox is a single-level dropbox; processing state lives in AIONE.

-- Refuse to guess the meaning of archived or unknown historical selection states.
DO $$
DECLARE
  unexpected TEXT;
BEGIN
  SELECT string_agg(DISTINCT lifecycle_status, ', ' ORDER BY lifecycle_status)
    INTO unexpected
    FROM public.product_opportunities
   WHERE lifecycle_status NOT IN (
     'discovered','reviewing','qualified','rejected','converted','archived','pending','selected'
   );

  IF unexpected IS NOT NULL THEN
    RAISE EXCEPTION 'AIONE selection migration stopped: unknown lifecycle_status values: %', unexpected;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.product_opportunities WHERE lifecycle_status = 'archived'
  ) THEN
    RAISE EXCEPTION 'AIONE selection migration stopped: archived ProductOpportunity rows require explicit human disposition before CURRENT status normalization.';
  END IF;
END $$;

-- Align the already-created machine identity column with the locked Product Freeze name.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='product_opportunities' AND column_name='selection_code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='product_opportunities' AND column_name='selection_no'
  ) THEN
    ALTER TABLE public.product_opportunities RENAME COLUMN selection_code TO selection_no;
  END IF;
END $$;

DROP INDEX IF EXISTS public.uq_product_opportunities_selection_code;
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_opportunities_selection_no
  ON public.product_opportunities(selection_no)
  WHERE selection_no IS NOT NULL;

ALTER TABLE public.product_opportunities
  ADD COLUMN IF NOT EXISTS selection_date DATE,
  ADD COLUMN IF NOT EXISTS source_category TEXT,
  ADD COLUMN IF NOT EXISTS source_cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS source_price NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS source_supplier_name TEXT,
  ADD COLUMN IF NOT EXISTS source_group TEXT,
  ADD COLUMN IF NOT EXISTS source_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS source_note TEXT,
  ADD COLUMN IF NOT EXISTS source_weight_g NUMERIC(18,3),
  ADD COLUMN IF NOT EXISTS source_fulfillment_hint TEXT,
  ADD COLUMN IF NOT EXISTS source_added_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS classification_status TEXT,
  ADD COLUMN IF NOT EXISTS classification_confidence NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS classification_method TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='public.product_opportunities'::regclass
       AND conname='product_opportunities_source_weight_g_check'
  ) THEN
    ALTER TABLE public.product_opportunities
      ADD CONSTRAINT product_opportunities_source_weight_g_check
      CHECK (source_weight_g IS NULL OR source_weight_g > 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='public.product_opportunities'::regclass
       AND conname='product_opportunities_source_fulfillment_hint_check'
  ) THEN
    ALTER TABLE public.product_opportunities
      ADD CONSTRAINT product_opportunities_source_fulfillment_hint_check
      CHECK (source_fulfillment_hint IS NULL OR source_fulfillment_hint = 'direct') NOT VALID;
  END IF;
END $$;

-- One unified selection model. Existing direct/regular implementation values are implementation debt,
-- not separate Product Truth, so normalize them in place.
UPDATE public.product_opportunities
   SET selection_mode = 'selection'
 WHERE selection_mode IS NULL
    OR selection_mode = ''
    OR selection_mode IN ('direct','regular','standard');
ALTER TABLE public.product_opportunities ALTER COLUMN selection_mode SET DEFAULT 'selection';

-- Normalize the legacy implementation state names to the locked four-state Product Truth.
ALTER TABLE public.product_opportunities
  DROP CONSTRAINT IF EXISTS product_opportunities_lifecycle_status_check;

UPDATE public.product_opportunities
   SET lifecycle_status = CASE lifecycle_status
     WHEN 'discovered' THEN 'pending'
     WHEN 'reviewing'  THEN 'pending'
     WHEN 'qualified'  THEN 'selected'
     ELSE lifecycle_status
   END;

ALTER TABLE public.product_opportunities
  ADD CONSTRAINT product_opportunities_lifecycle_status_check
  CHECK (lifecycle_status IN ('pending','selected','rejected','converted'));
ALTER TABLE public.product_opportunities ALTER COLUMN lifecycle_status SET DEFAULT 'pending';

-- Source-added date is the business selection date when available; otherwise preserve creation date.
UPDATE public.product_opportunities
   SET selection_date = COALESCE(selection_date, source_added_at::date, created_at::date)
 WHERE selection_date IS NULL;

-- Locked xpYYMMDDNNN numbering. Re-key deprecated SEL-* implementation identifiers in one migration.
UPDATE public.product_opportunities
   SET selection_no = NULL
 WHERE selection_no IS NOT NULL
   AND selection_no !~ '^xp[0-9]{9}$';

CREATE TABLE IF NOT EXISTS public.selection_number_counters (
  selection_date DATE PRIMARY KEY,
  last_number INTEGER NOT NULL CHECK (last_number > 0 AND last_number <= 999),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed counters from any already-valid CURRENT identifiers.
INSERT INTO public.selection_number_counters(selection_date, last_number, updated_at)
SELECT selection_date,
       MAX(SUBSTRING(selection_no FROM 9 FOR 3)::INTEGER),
       NOW()
  FROM public.product_opportunities
 WHERE selection_no ~ '^xp[0-9]{9}$'
   AND selection_date IS NOT NULL
 GROUP BY selection_date
ON CONFLICT (selection_date) DO UPDATE
  SET last_number = GREATEST(public.selection_number_counters.last_number, EXCLUDED.last_number),
      updated_at = NOW();

DO $$
DECLARE
  row_item RECORD;
  next_no INTEGER;
BEGIN
  FOR row_item IN
    SELECT id, selection_date
      FROM public.product_opportunities
     WHERE selection_no IS NULL
     ORDER BY selection_date, created_at, id
  LOOP
    INSERT INTO public.selection_number_counters(selection_date, last_number, updated_at)
    VALUES (row_item.selection_date, 1, NOW())
    ON CONFLICT (selection_date) DO UPDATE
      SET last_number = public.selection_number_counters.last_number + 1,
          updated_at = NOW()
    RETURNING last_number INTO next_no;

    IF next_no > 999 THEN
      RAISE EXCEPTION 'AIONE selection migration stopped: more than 999 selections on %', row_item.selection_date;
    END IF;

    UPDATE public.product_opportunities
       SET selection_no = 'xp' || to_char(row_item.selection_date, 'YYMMDD') || lpad(next_no::TEXT, 3, '0')
     WHERE id = row_item.id;
  END LOOP;
END $$;

-- Keep Product JSON aligned where an older implementation embedded selectionCode.
UPDATE public.products p
   SET product_data = (COALESCE(p.product_data, '{}'::jsonb) - 'selectionCode')
                      || jsonb_build_object('selectionNo', o.selection_no)
  FROM public.product_opportunities o
 WHERE p.source_opportunity_id = o.id
   AND o.selection_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_opportunities_selection_date
  ON public.product_opportunities(selection_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_opportunities_source_group
  ON public.product_opportunities(source_group, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_product_opportunities_source_weight
  ON public.product_opportunities(source_weight_g)
  WHERE source_weight_g IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.selection_import_batches (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL DEFAULT '1688_selection_pool',
  source_file_id TEXT NOT NULL,
  source_file_name TEXT NOT NULL,
  source_file_path TEXT,
  source_file_hash TEXT NOT NULL,
  source_file_modified_at TIMESTAMPTZ,
  source_file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed')),
  record_count INTEGER NOT NULL DEFAULT 0 CHECK (record_count >= 0),
  created_count INTEGER NOT NULL DEFAULT 0 CHECK (created_count >= 0),
  updated_count INTEGER NOT NULL DEFAULT 0 CHECK (updated_count >= 0),
  skipped_count INTEGER NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
  error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  auto_classified_count INTEGER NOT NULL DEFAULT 0 CHECK (auto_classified_count >= 0),
  classification_review_count INTEGER NOT NULL DEFAULT 0 CHECK (classification_review_count >= 0),
  result_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  source_system TEXT NOT NULL DEFAULT 'aione-1688-drive-inbox'
);

CREATE INDEX IF NOT EXISTS idx_selection_import_batches_status_created
  ON public.selection_import_batches(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_selection_import_batches_file_id
  ON public.selection_import_batches(source_file_id, source_file_modified_at DESC);
CREATE INDEX IF NOT EXISTS idx_selection_import_batches_hash
  ON public.selection_import_batches(source_file_hash, status);

COMMIT;
