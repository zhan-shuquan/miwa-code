BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE people (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE,
  role_code text,
  team_code text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE person_external_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id text NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  provider text NOT NULL,
  location_type text NOT NULL,
  external_id text NOT NULL,
  display_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(person_id, provider, location_type)
);

CREATE TABLE work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  title text NOT NULL,
  assignee_person_id text REFERENCES people(id),
  business_home text,
  business_center text,
  related_object_type text,
  related_object_id text,
  status text NOT NULL DEFAULT 'todo',
  due_at timestamptz,
  source_type text,
  source_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_type, source_key, assignee_person_id)
);

CREATE TABLE selection_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by_person_id text REFERENCES people(id),
  work_item_id uuid REFERENCES work_items(id),
  provider text NOT NULL DEFAULT '1688',
  source_file_id text,
  source_file_name text,
  source_location_id uuid REFERENCES person_external_locations(id),
  status text NOT NULL DEFAULT 'received',
  row_count integer NOT NULL DEFAULT 0,
  parsed_count integer NOT NULL DEFAULT 0,
  new_count integer NOT NULL DEFAULT 0,
  duplicate_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  imported_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(provider, source_file_id)
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_zh text NOT NULL,
  parent_id uuid REFERENCES categories(id),
  level smallint NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE attribute_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_zh text NOT NULL,
  value_type text NOT NULL DEFAULT 'text',
  unit text,
  allowed_values jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE product_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_code text NOT NULL UNIQUE,
  import_id uuid REFERENCES selection_imports(id),
  selector_person_id text REFERENCES people(id),
  source_provider text NOT NULL,
  source_product_id text,
  source_url text NOT NULL,
  source_title text,
  source_supplier_name text,
  source_price numeric(14,2),
  source_currency text DEFAULT 'CNY',
  source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  category_id uuid REFERENCES categories(id),
  ai_score numeric(6,2),
  ai_decision text,
  ai_reason text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by_person_id text REFERENCES people(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_provider, source_product_id),
  UNIQUE(source_provider, source_url)
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL UNIQUE,
  source_opportunity_id uuid UNIQUE REFERENCES product_opportunities(id),
  name_zh text,
  name_ja text,
  category_id uuid REFERENCES categories(id),
  brand_id uuid REFERENCES brands(id),
  owner_person_id text REFERENCES people(id),
  status text NOT NULL DEFAULT 'draft',
  purchase_currency text DEFAULT 'CNY',
  base_purchase_cost numeric(14,2),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE product_skus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_code text NOT NULL UNIQUE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  source_sku_id text,
  name text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  purchase_cost numeric(14,2),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, source_sku_id)
);

CREATE TABLE product_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku_id uuid REFERENCES product_skus(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  source_type text NOT NULL DEFAULT 'ai',
  file_provider text,
  file_id text,
  url text,
  title text,
  content_text text,
  generation_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  platform_id uuid NOT NULL REFERENCES platforms(id),
  name text NOT NULL,
  business_scope text,
  status text NOT NULL DEFAULT 'active',
  external_store_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_code text NOT NULL UNIQUE,
  product_id uuid NOT NULL REFERENCES products(id),
  store_id uuid NOT NULL REFERENCES stores(id),
  external_item_id text,
  external_manage_number text,
  title text,
  price_jpy integer,
  status text NOT NULL DEFAULT 'draft',
  listing_url text,
  publish_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  published_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, external_item_id),
  UNIQUE(product_id, store_id)
);

CREATE INDEX idx_work_items_assignee_status ON work_items(assignee_person_id, status);
CREATE INDEX idx_selection_imports_person ON selection_imports(submitted_by_person_id, imported_at DESC);
CREATE INDEX idx_opportunities_status ON product_opportunities(status, created_at DESC);
CREATE INDEX idx_opportunities_selector ON product_opportunities(selector_person_id, created_at DESC);
CREATE INDEX idx_products_status ON products(status, created_at DESC);
CREATE INDEX idx_skus_product ON product_skus(product_id);
CREATE INDEX idx_assets_product ON product_assets(product_id, asset_type);
CREATE INDEX idx_stores_platform ON stores(platform_id);
CREATE INDEX idx_listings_store_status ON listings(store_id, status);

CREATE TABLE schema_migrations (
  version text PRIMARY KEY,
  description text,
  applied_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO schema_migrations(version, description)
VALUES ('0001', 'AIONE V1 clean CURRENT baseline');

COMMIT;
