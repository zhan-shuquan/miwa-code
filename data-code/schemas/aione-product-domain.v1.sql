-- AIONE Product Domain Schema V1.0
-- Status: VALIDATING
-- This file is a schema design asset, NOT an executable migration.
-- Formal DDL migration will be created only after Product Freeze + Technical Design review.

-- ============================================================
-- 1. Categories
-- ============================================================
CREATE TABLE public.categories (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  level INTEGER NOT NULL CHECK (level >= 1),
  code TEXT NOT NULL UNIQUE,
  name_zh TEXT NOT NULL,
  name_ja TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planned','active','paused','archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_categories_parent ON public.categories(parent_id, sort_order);
CREATE INDEX idx_categories_level_status ON public.categories(level, status);

-- ============================================================
-- 2. Brands
-- ============================================================
CREATE TABLE public.brands (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL,
  name_ja TEXT,
  name_en TEXT,
  brand_type TEXT NOT NULL CHECK (brand_type IN ('own','external','unbranded')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planned','active','paused','archived')),
  authorization_status TEXT NOT NULL DEFAULT 'not_required',
  risk_status TEXT NOT NULL DEFAULT 'normal',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_brands_type_status ON public.brands(brand_type, status);

-- ============================================================
-- 3. Products
-- ============================================================
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'physical'
    CHECK (product_type IN ('physical','digital','service','other')),
  lifecycle_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN ('draft','active','paused','discontinued','archived')),
  origin_selection_mode TEXT NOT NULL DEFAULT 'OTHER'
    CHECK (origin_selection_mode IN ('DIRECT','REGULAR','DEVELOPMENT','OTHER')),
  current_selection_mode TEXT NOT NULL DEFAULT 'OTHER'
    CHECK (current_selection_mode IN ('DIRECT','REGULAR','DEVELOPMENT','OTHER')),
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id TEXT REFERENCES public.brands(id) ON DELETE SET NULL,
  owner_person_id TEXT,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  source_platform TEXT,
  source_url TEXT,
  source_product_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_products_category ON public.products(category_id, lifecycle_status);
CREATE INDEX idx_products_brand ON public.products(brand_id, lifecycle_status);
CREATE INDEX idx_products_owner ON public.products(owner_person_id, lifecycle_status);
CREATE INDEX idx_products_selection_mode ON public.products(origin_selection_mode, current_selection_mode);
CREATE INDEX idx_products_source ON public.products(source_platform, source_product_id);

-- ============================================================
-- 4. Variants
-- ============================================================
CREATE TABLE public.product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','paused','archived')),
  option_signature JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  UNIQUE(product_id, code)
);

CREATE INDEX idx_product_variants_product ON public.product_variants(product_id, status, sort_order);

-- ============================================================
-- 5. SKUs
-- ============================================================
CREATE TABLE public.skus (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id TEXT REFERENCES public.product_variants(id) ON DELETE SET NULL,
  sku_code TEXT NOT NULL UNIQUE,
  jan_code TEXT,
  barcode TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','paused','archived')),
  inventory_tracking_mode TEXT NOT NULL DEFAULT 'tracked'
    CHECK (inventory_tracking_mode IN ('tracked','untracked','external')),
  purchase_unit TEXT,
  sales_unit TEXT,
  weight_g NUMERIC(12,3) CHECK (weight_g IS NULL OR weight_g >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_skus_product ON public.skus(product_id, status);
CREATE INDEX idx_skus_variant ON public.skus(variant_id, status);
CREATE INDEX idx_skus_jan ON public.skus(jan_code);

-- ============================================================
-- 6. Listings
-- ============================================================
CREATE TABLE public.listings (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  channel_code TEXT NOT NULL,
  store_code TEXT NOT NULL,
  external_listing_id TEXT,
  external_parent_id TEXT,
  listing_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (listing_status IN ('draft','ready','publishing','published','paused','rejected','ended')),
  listing_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (listing_type IN ('standard','variation_parent','variation_child','bundle')),
  currency TEXT NOT NULL DEFAULT 'JPY',
  sales_price NUMERIC(14,2) CHECK (sales_price IS NULL OR sales_price >= 0),
  compare_at_price NUMERIC(14,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  published_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  record_version INTEGER NOT NULL DEFAULT 1,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_listings_product ON public.listings(product_id, listing_status);
CREATE INDEX idx_listings_channel_store ON public.listings(channel_code, store_code, listing_status);
CREATE UNIQUE INDEX uq_listings_external
  ON public.listings(channel_code, store_code, external_listing_id)
  WHERE external_listing_id IS NOT NULL;

-- ============================================================
-- 7. Listing <-> SKU mapping
-- ============================================================
CREATE TABLE public.listing_skus (
  listing_id TEXT NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  sku_id TEXT NOT NULL REFERENCES public.skus(id) ON DELETE RESTRICT,
  external_sku_id TEXT,
  role TEXT NOT NULL DEFAULT 'primary' CHECK (role IN ('primary','variation','component')),
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (listing_id, sku_id, role)
);

CREATE INDEX idx_listing_skus_sku ON public.listing_skus(sku_id);

-- ============================================================
-- 8. Attributes
-- ============================================================
CREATE TABLE public.attributes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_zh TEXT NOT NULL,
  name_ja TEXT,
  value_type TEXT NOT NULL DEFAULT 'enum'
    CHECK (value_type IN ('enum','text','number','boolean')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planned','active','paused','archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE TABLE public.attribute_values (
  id TEXT PRIMARY KEY,
  attribute_id TEXT NOT NULL REFERENCES public.attributes(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  canonical_value TEXT NOT NULL,
  display_name_zh TEXT,
  display_name_ja TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  UNIQUE(attribute_id, code)
);

CREATE TABLE public.product_attribute_values (
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_id TEXT NOT NULL REFERENCES public.attributes(id) ON DELETE RESTRICT,
  attribute_value_id TEXT REFERENCES public.attribute_values(id) ON DELETE RESTRICT,
  raw_value TEXT,
  source_type TEXT NOT NULL DEFAULT 'aione'
    CHECK (source_type IN ('aione','supplier','1688','rakuten','amazon','ai','manual')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(product_id, attribute_id, attribute_value_id)
);

-- ============================================================
-- 9. Specifications
-- ============================================================
CREATE TABLE public.specifications (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_zh TEXT NOT NULL,
  name_ja TEXT,
  canonical_unit TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planned','active','paused','archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE TABLE public.product_specifications (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES public.product_variants(id) ON DELETE CASCADE,
  sku_id TEXT REFERENCES public.skus(id) ON DELETE CASCADE,
  specification_id TEXT NOT NULL REFERENCES public.specifications(id) ON DELETE RESTRICT,
  numeric_value NUMERIC(18,6),
  text_value TEXT,
  canonical_unit TEXT,
  raw_value TEXT,
  raw_unit TEXT,
  source_type TEXT NOT NULL DEFAULT 'aione',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_specs_product ON public.product_specifications(product_id, specification_id);
CREATE INDEX idx_product_specs_variant ON public.product_specifications(variant_id, specification_id);
CREATE INDEX idx_product_specs_sku ON public.product_specifications(sku_id, specification_id);

-- ============================================================
-- 10. Product Assets
-- ============================================================
CREATE TABLE public.product_assets (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id TEXT REFERENCES public.product_variants(id) ON DELETE SET NULL,
  sku_id TEXT REFERENCES public.skus(id) ON DELETE SET NULL,
  asset_type TEXT NOT NULL,
  role TEXT NOT NULL,
  uri TEXT NOT NULL,
  storage_ref TEXT,
  source_type TEXT NOT NULL DEFAULT 'upload'
    CHECK (source_type IN ('supplier','upload','ai_generated','system_generated','external')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','rejected','archived')),
  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_product_assets_product ON public.product_assets(product_id, role, status);

-- ============================================================
-- 11. Bundle / Kit
-- ============================================================
CREATE TABLE public.bundles (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','paused','archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE TABLE public.bundle_components (
  bundle_id TEXT NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  component_sku_id TEXT NOT NULL REFERENCES public.skus(id) ON DELETE RESTRICT,
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY(bundle_id, component_sku_id)
);

-- ============================================================
-- 12. Channel Category Mapping
-- ============================================================
CREATE TABLE public.category_channel_mappings (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  channel_code TEXT NOT NULL,
  external_category_id TEXT NOT NULL,
  external_category_path TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, channel_code, external_category_id)
);

CREATE INDEX idx_category_channel_mapping_external
  ON public.category_channel_mappings(channel_code, external_category_id);

-- ============================================================
-- 13. Deferred domains
-- ============================================================
-- Cost / Pricing profiles are intentionally not embedded in products.
-- Formal tables will be added after existing Cost Engine / Pricing Engine contracts are reconciled.
-- Inventory ledger and Order domain are also intentionally deferred.
