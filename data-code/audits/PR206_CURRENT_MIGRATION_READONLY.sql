-- PR #206 CURRENT migration inventory -- READ ONLY
-- Run inside psql with: \i data-code/audits/PR206_CURRENT_MIGRATION_READONLY.sql
-- Do not run \i on a migration file. No DDL/DML executed here.
\set ON_ERROR_STOP on
BEGIN READ ONLY;
SELECT current_database() AS db_name,
       current_user AS db_user,
       now() AS inspected_at,
       to_regclass('public.schema_migrations') AS migration_registry,
       to_regclass('public.products') AS existing_products,
       to_regclass('public.product_skus') AS existing_skus,
       to_regclass('public.channel_listings') AS existing_channel_listings,
       to_regclass('public.platforms') AS canonical_platforms,
       to_regclass('public.stores') AS canonical_stores,
       to_regclass('public.listings') AS alternate_listings;
SELECT 'schema_migrations missing: STOP release and inspect legacy database; nothing changed' AS migration_audit_status
WHERE to_regclass('public.schema_migrations') IS NULL;
-- \gexec only runs the SELECT below if the registry exists.
SELECT $query$
SELECT version, description, applied_at
FROM public.schema_migrations
ORDER BY version;
$query$
WHERE to_regclass('public.schema_migrations') IS NOT NULL
\gexec
SELECT 'registry row count' AS metric,
       CASE WHEN to_regclass('public.schema_migrations') IS NULL
            THEN 'MISSING'
            ELSE 'PRESENT' END AS value;
SELECT 'channel_listings' AS name, count(*) AS count
FROM public.channel_listings;
COMMIT;
\echo '[AIONE] READ-ONLY SQL audit finished. No schema or data was modified.'
