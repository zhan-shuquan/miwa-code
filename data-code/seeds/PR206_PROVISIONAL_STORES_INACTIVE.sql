-- PR #206: provisional internal store master-data, NOT verified RMS integrations.
-- Review platform ownership before running. Three shops are provisionally linked
-- to Rakuten but deliberately INACTIVE; external IDs remain NULL.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $guard$
BEGIN
 IF to_regclass('public.platforms') IS NULL OR to_regclass('public.stores') IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='0112')
 THEN RAISE EXCEPTION 'Missing migration 0112; no store initialization allowed'; END IF;
 IF EXISTS(SELECT 1 FROM public.platforms WHERE code='RAKUTEN' AND name<>'楽天市場')
 THEN RAISE EXCEPTION 'RAKUTEN platform code conflicts with existing name'; END IF;
 IF EXISTS(
  SELECT 1 FROM public.stores s
  LEFT JOIN public.platforms p ON p.id=s.platform_id
  WHERE s.code IN ('NAGAI_GD','SHIAWASEYA','PRIMELIFE')
    AND ((s.code='NAGAI_GD' AND s.name<>'永井GD')
      OR (s.code='SHIAWASEYA' AND s.name<>'幸せ屋')
      OR (s.code='PRIMELIFE' AND s.name<>'PrimeLife')
      OR p.code<>'RAKUTEN' OR p.code IS NULL
      OR s.external_store_id IS NOT NULL)
 ) THEN RAISE EXCEPTION 'Existing store conflicts with planned provisional record'; END IF;
 IF EXISTS(
  SELECT 1 FROM public.stores
  WHERE name IN ('永井GD','幸せ屋','PrimeLife')
    AND code NOT IN ('NAGAI_GD','SHIAWASEYA','PRIMELIFE')
 ) THEN RAISE EXCEPTION 'Existing display name is mapped to different stable ID'; END IF;
END $guard$;

INSERT INTO public.platforms(code,name,status)
VALUES('RAKUTEN','楽天市場','inactive')
ON CONFLICT(code) DO NOTHING;

INSERT INTO public.stores(code,name,platform_id,status,external_store_id)
SELECT v.code,v.name,p.id,'inactive',NULL
FROM (VALUES ('NAGAI_GD','永井GD'),('SHIAWASEYA','幸せ屋'),('PRIMELIFE','PrimeLife')) AS v(code,name)
JOIN public.platforms p ON p.code='RAKUTEN'
ON CONFLICT(code) DO NOTHING;

DO $verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n
 FROM public.stores s JOIN public.platforms p ON p.id=s.platform_id
 WHERE p.code='RAKUTEN'
   AND (s.code,s.name) IN (('NAGAI_GD','永井GD'),('SHIAWASEYA','幸せ屋'),('PRIMELIFE','PrimeLife'))
   AND s.external_store_id IS NULL;
 IF n<>3 THEN RAISE EXCEPTION 'Expected exactly three internal stores, found %',n; END IF;
END $verify$;
COMMIT;
SELECT s.code,s.name,s.id AS store_id,s.status,p.code AS platform_code,
       p.status AS platform_status,s.external_store_id
FROM public.stores s JOIN public.platforms p ON p.id=s.platform_id
WHERE s.code IN ('NAGAI_GD','SHIAWASEYA','PRIMELIFE')
ORDER BY s.code;
\echo '[AIONE] PROVISIONAL ONLY: keep inactive until actual platform/account mapping is verified.'
