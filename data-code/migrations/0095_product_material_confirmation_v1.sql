BEGIN;

-- AIONE Product Truth & Material Human Gate V1.
-- Product Freeze (2026-09-11):
--   Human defines the Product; AI completes productization.
--   Final sales SKU and effective SOURCE material must be confirmed by a human
--   before a new production DesignTask can be created.

CREATE TABLE IF NOT EXISTS public.product_material_confirmations (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','invalidated')),
  sku_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  asset_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  snapshot_hash TEXT NOT NULL,
  confirmed_by_person_id TEXT,
  confirmed_at TIMESTAMPTZ,
  invalidated_at TIMESTAMPTZ,
  invalidated_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1 CHECK (record_version > 0),
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  UNIQUE (product_id, version),
  CHECK (jsonb_typeof(sku_snapshot) = 'array'),
  CHECK (jsonb_typeof(asset_ids) = 'array'),
  CHECK (confirmed_at IS NULL OR confirmed_by_person_id IS NOT NULL),
  CHECK (status <> 'confirmed' OR confirmed_at IS NOT NULL),
  CHECK (status <> 'invalidated' OR invalidated_at IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_material_confirmations_current
  ON public.product_material_confirmations(product_id)
  WHERE status='confirmed' AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_material_confirmations_product
  ON public.product_material_confirmations(product_id, version DESC, created_at DESC)
  WHERE archived_at IS NULL;

ALTER TABLE public.design_tasks
  ADD COLUMN IF NOT EXISTS material_confirmation_id TEXT
    REFERENCES public.product_material_confirmations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS material_snapshot_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_design_tasks_material_confirmation
  ON public.design_tasks(material_confirmation_id, created_at DESC)
  WHERE archived_at IS NULL AND material_confirmation_id IS NOT NULL;

COMMIT;
