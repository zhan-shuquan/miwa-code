-- PR206 phase-one explicit approval: activate only 永井GD for AIONE manual product entry.
-- Does NOT map RMS account IDs, grant publishing permission, or write listing/product data.
-- Execute once via psql \i. Transaction aborts if there is any unexpected store/platform state.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $guard$
DECLARE matched int;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version='0112')
 THEN RAISE EXCEPTION '0112 migration not registered'; END IF;
 SELECT count(*) INTO matched
 FROM public.stores s JOIN public.platforms p ON p.id=s.platform_id
 WHERE p.code='RAKUTEN'
   AND (s.code,s.name) IN (('NAGAI_GD','永井GD'),('SHIAWASEYA','幸せ屋'),('PRIMELIFE','PrimeLife'))
   AND s.external_store_id IS NULL;
 IF matched<>3 THEN RAISE EXCEPTION 'Expected 3 unmapped canonical shops, got %',matched; END IF;
 IF (SELECT count(*) FROM public.stores s JOIN public.platforms p ON p.id=s.platform_id WHERE p.code='RAKUTEN')<>3
 THEN RAISE EXCEPTION 'Unexpected additional shops share this platform, stop'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.platforms WHERE code='RAKUTEN' AND name='楽天市場')
 THEN RAISE EXCEPTION 'RAKUTEN platform identity mismatch'; END IF;
END $guard$;
UPDATE public.platforms SET status='active',updated_at=now()
WHERE code='RAKUTEN' AND status='inactive';
UPDATE public.stores SET status='active',updated_at=now()
WHERE code='NAGAI_GD' AND name='永井GD' AND status='inactive'
 AND platform_id=(SELECT id FROM public.platforms WHERE code='RAKUTEN');
DO $verify$
DECLARE count_active int;
BEGIN
 SELECT count(*) INTO count_active FROM public.stores s
 JOIN public.platforms p ON p.id=s.platform_id
 WHERE p.code='RAKUTEN' AND s.status='active';
 IF count_active<>1 OR NOT EXISTS(
   SELECT 1 FROM public.stores s JOIN public.platforms p ON p.id=s.platform_id
   WHERE s.code='NAGAI_GD' AND s.status='active' AND p.code='RAKUTEN' AND p.status='active'
 ) OR EXISTS(SELECT 1 FROM public.stores WHERE code IN ('SHIAWASEYA','PRIMELIFE') AND status<>'inactive')
 THEN RAISE EXCEPTION 'Only Nagai GD must be active; transaction aborted'; END IF;
END $verify$;
COMMIT;
SELECT s.code,s.name,s.status AS store_status,p.status AS platform_status,s.external_store_id
FROM public.stores s JOIN public.platforms p ON p.id=s.platform_id
WHERE s.code IN ('NAGAI_GD','SHIAWASEYA','PRIMELIFE') ORDER BY s.code;
\echo '[AIONE] Only Nagai GD enabled for internal manual-entry; RMS integration remains unverified.'
