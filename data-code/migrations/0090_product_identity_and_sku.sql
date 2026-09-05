BEGIN;

-- AIONE Product Identity V1.
-- Product Truth:
--   Selection owns a temporary system identity.
--   Formal Product identity is allocated only after Selection is qualified.
--   Product Code is MH + 7 digits and is immutable after allocation.
--   SKU Code is Product Code + -NN.
-- Architecture Truth:
--   PostgreSQL sequences provide concurrency-safe allocation.

CREATE SEQUENCE IF NOT EXISTS public.aione_selection_code_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.aione_product_code_seq START WITH 1 INCREMENT BY 1;

ALTER TABLE public.product_opportunities
  ADD COLUMN IF NOT EXISTS selection_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_opportunities_selection_code
  ON public.product_opportunities(selection_code)
  WHERE selection_code IS NOT NULL;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_products_product_code
  ON public.products(product_code)
  WHERE product_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.product_skus (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  sku_code TEXT NOT NULL UNIQUE,
  sku_no INTEGER NOT NULL CHECK (sku_no > 0),
  name TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN ('draft','preparing','listing_ready','active','paused','retired')),
  sku_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  UNIQUE (product_id, sku_no)
);

CREATE INDEX IF NOT EXISTS idx_product_skus_product_status
  ON public.product_skus(product_id, lifecycle_status, sku_no);

COMMIT;
