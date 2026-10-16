-- Additive canonical Store registry for existing-lifecycle CURRENT.
-- This migration never rewrites products, product_skus or channel_listings.
-- Store account mapping and seed records must be explicitly verified separately.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  platform_id uuid NOT NULL REFERENCES public.platforms(id),
  name text NOT NULL,
  business_scope text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  external_store_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stores_platform ON public.stores(platform_id);
COMMIT;
