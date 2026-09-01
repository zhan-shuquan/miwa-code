BEGIN;

-- AIONE P0 direct-selection -> continuous publishing foundation.
-- Product Truth: first stage validates real direct-selection business flow only.
-- Architecture Truth: these are canonical business tables; object_registry remains a cross-object index only.
-- Migration rule: CREATE for a fresh database, ALTER in place for legacy canonical tables.

CREATE TABLE IF NOT EXISTS public.product_categories (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES public.product_categories(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planned','active','paused','retired')),
  target_slot_capacity INTEGER CHECK (target_slot_capacity IS NULL OR target_slot_capacity > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_product_categories_parent_status
  ON public.product_categories(parent_id, status);

CREATE TABLE IF NOT EXISTS public.product_opportunities (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  source_platform TEXT NOT NULL,
  source_ref TEXT,
  source_url TEXT,
  supplier_ref TEXT,
  title TEXT NOT NULL,
  selection_mode TEXT NOT NULL DEFAULT 'direct',
  lifecycle_status TEXT NOT NULL DEFAULT 'discovered'
    CHECK (lifecycle_status IN ('discovered','reviewing','qualified','rejected','converted','archived')),
  owner_person_id TEXT,
  category_id TEXT REFERENCES public.product_categories(id) ON DELETE SET NULL,
  estimated_cost NUMERIC(18,4) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  estimated_sale_price NUMERIC(18,4) CHECK (estimated_sale_price IS NULL OR estimated_sale_price >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'JPY',
  qualification_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  UNIQUE (source_platform, source_ref)
);

-- Older AIONE databases may already contain a minimal product_opportunities
-- table (for example id + status only). Evolve that table in place instead of
-- dropping or replacing it so historical rows remain available for later
-- reconciliation/deprecation work.
ALTER TABLE public.product_opportunities
  ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_platform TEXT,
  ADD COLUMN IF NOT EXISTS source_ref TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS supplier_ref TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS selection_mode TEXT NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'discovered',
  ADD COLUMN IF NOT EXISTS owner_person_id TEXT,
  ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES public.product_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS estimated_sale_price NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'JPY',
  ADD COLUMN IF NOT EXISTS qualification_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by_person_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_by_person_id TEXT,
  ADD COLUMN IF NOT EXISTS record_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS source_system TEXT NOT NULL DEFAULT 'aione',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE public.product_opportunities
   SET source_platform = COALESCE(NULLIF(source_platform, ''), 'legacy'),
       title = COALESCE(NULLIF(title, ''), id),
       lifecycle_status = COALESCE(NULLIF(lifecycle_status, ''), 'discovered')
 WHERE source_platform IS NULL OR source_platform = ''
    OR title IS NULL OR title = ''
    OR lifecycle_status IS NULL OR lifecycle_status = '';

ALTER TABLE public.product_opportunities
  ALTER COLUMN source_platform SET NOT NULL,
  ALTER COLUMN title SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.product_opportunities'::regclass
       AND conname = 'product_opportunities_lifecycle_status_check'
  ) THEN
    ALTER TABLE public.product_opportunities
      ADD CONSTRAINT product_opportunities_lifecycle_status_check
      CHECK (lifecycle_status IN ('discovered','reviewing','qualified','rejected','converted','archived')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.product_opportunities'::regclass
       AND conname = 'product_opportunities_estimated_cost_check'
  ) THEN
    ALTER TABLE public.product_opportunities
      ADD CONSTRAINT product_opportunities_estimated_cost_check
      CHECK (estimated_cost IS NULL OR estimated_cost >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.product_opportunities'::regclass
       AND conname = 'product_opportunities_estimated_sale_price_check'
  ) THEN
    ALTER TABLE public.product_opportunities
      ADD CONSTRAINT product_opportunities_estimated_sale_price_check
      CHECK (estimated_sale_price IS NULL OR estimated_sale_price >= 0) NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_opportunities_source
  ON public.product_opportunities(source_platform, source_ref);
CREATE INDEX IF NOT EXISTS idx_product_opportunities_status
  ON public.product_opportunities(lifecycle_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_opportunities_owner
  ON public.product_opportunities(owner_person_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_product_opportunities_category
  ON public.product_opportunities(category_id, lifecycle_status);

CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  source_opportunity_id TEXT UNIQUE REFERENCES public.product_opportunities(id) ON DELETE SET NULL,
  category_id TEXT REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN ('draft','preparing','listing_ready','active','paused','retired')),
  owner_person_id TEXT,
  source_platform TEXT,
  source_ref TEXT,
  source_url TEXT,
  supplier_ref TEXT,
  cost_amount NUMERIC(18,4) CHECK (cost_amount IS NULL OR cost_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'JPY',
  product_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  readiness_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_products_category_status
  ON public.products(category_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_products_owner_status
  ON public.products(owner_person_id, lifecycle_status);

CREATE TABLE IF NOT EXISTS public.category_slots (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  slot_no INTEGER NOT NULL CHECK (slot_no > 0),
  product_id TEXT UNIQUE REFERENCES public.products(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','retired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category_id, slot_no),
  CHECK ((status = 'occupied' AND product_id IS NOT NULL) OR status <> 'occupied')
);

CREATE INDEX IF NOT EXISTS idx_category_slots_category_status
  ON public.category_slots(category_id, status, slot_no);

CREATE TABLE IF NOT EXISTS public.channel_listings (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  channel TEXT NOT NULL,
  shop_ref TEXT NOT NULL,
  external_listing_id TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN ('draft','ready','publishing','active','paused','failed','deleted')),
  current_price NUMERIC(18,4) CHECK (current_price IS NULL OR current_price >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'JPY',
  listing_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_published_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  last_error JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  UNIQUE (product_id, channel, shop_ref)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_channel_listings_external
  ON public.channel_listings(channel, shop_ref, external_listing_id)
  WHERE external_listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_channel_listings_status
  ON public.channel_listings(channel, shop_ref, lifecycle_status);

CREATE TABLE IF NOT EXISTS public.publishing_jobs (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES public.channel_listings(id) ON DELETE CASCADE,
  command_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','validating','ready','running','succeeded','failed','cancelled')),
  requested_by_kind TEXT NOT NULL DEFAULT 'system'
    CHECK (requested_by_kind IN ('human','ai','system','automation')),
  requested_by_person_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  error_data JSONB,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_publishing_jobs_status_schedule
  ON public.publishing_jobs(status, scheduled_at, created_at);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_listing
  ON public.publishing_jobs(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publishing_jobs_correlation
  ON public.publishing_jobs(correlation_id) WHERE correlation_id IS NOT NULL;

COMMIT;
