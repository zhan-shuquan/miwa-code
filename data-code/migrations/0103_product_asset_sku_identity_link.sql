BEGIN;

-- ProductAsset remains the single image fact. Link an uploaded SKU image to
-- the stable ProductSKU identity. Never derive this link from _cNN or row order.
-- Existing lifecycle uses text IDs; the older CURRENT baseline already has
-- a UUID sku_id. ADD IF NOT EXISTS preserves both schemas.
ALTER TABLE public.product_assets
  ADD COLUMN IF NOT EXISTS sku_id TEXT;

-- A composite FK enforces that a bound SKU belongs to the SAME Product.
-- All IDs and product_id values are comparable within each supported schema.
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_skus_product_id_id
  ON public.product_skus(product_id, id);

DO $body$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_product_assets_product_sku_same_product'
      AND conrelid = 'public.product_assets'::regclass
  ) THEN
    IF (SELECT atttypid FROM pg_attribute WHERE attrelid='public.product_assets'::regclass AND attname='sku_id') =
       (SELECT atttypid FROM pg_attribute WHERE attrelid='public.product_skus'::regclass AND attname='id') THEN
      ALTER TABLE public.product_assets
        ADD CONSTRAINT fk_product_assets_product_sku_same_product
        FOREIGN KEY (product_id, sku_id)
        REFERENCES public.product_skus(product_id, id)
        ON DELETE RESTRICT;
    ELSE
      RAISE EXCEPTION 'ProductAsset.sku_id and ProductSKU.id types differ; stop and review CURRENT schema';
    END IF;
  END IF;
END
$body$;

CREATE INDEX IF NOT EXISTS idx_product_assets_bound_sku
  ON public.product_assets(product_id, sku_id)
  WHERE sku_id IS NOT NULL;

COMMENT ON COLUMN public.product_assets.sku_id IS
  'Optional immutable ProductSKU identity for explicitly confirmed SKU imagery; filename order is not identity.';

COMMIT;
