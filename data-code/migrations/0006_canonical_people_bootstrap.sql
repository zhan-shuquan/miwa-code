BEGIN;

-- One-time migration of the current real AIONE internal human identities.
-- This moves person identity facts out of frontend/backend preview registries.
-- Google provider subjects are intentionally NOT seeded; first verified login
-- binds provider='google' + token.sub to the matching canonical person by email.
-- Roles, positions, assignments and permissions remain separate domain facts.

INSERT INTO public.people (id, display_name, primary_email, status, metadata, source_system)
VALUES
  ('86000', '占树全', 'mcpu2014@gmail.com', 'active', '{"migration_source":"preview_identity_registry"}'::jsonb, 'aione'),
  ('86001', '占金玲', '15105034553l@gmail.com', 'active', '{"migration_source":"preview_identity_registry"}'::jsonb, 'aione'),
  ('86002', '梁统剑', 'ccemilla0829@gmail.com', 'active', '{"migration_source":"preview_identity_registry"}'::jsonb, 'aione'),
  ('86003', '于硕', 'foreverfish26@gmail.com', 'active', '{"migration_source":"preview_identity_registry"}'::jsonb, 'aione'),
  ('86004', '刘冰燕', 'lby13606017336@gmail.com', 'active', '{"migration_source":"preview_identity_registry"}'::jsonb, 'aione'),
  ('86005', '陈永航', 'yamadakiyohara@gmail.com', 'active', '{"migration_source":"preview_identity_registry"}'::jsonb, 'aione'),
  ('86018', '单利影', 'sly1252@gmail.com', 'active', '{"migration_source":"preview_identity_registry"}'::jsonb, 'aione')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  primary_email = EXCLUDED.primary_email,
  status = EXCLUDED.status,
  metadata = public.people.metadata || EXCLUDED.metadata,
  updated_at = NOW(),
  record_version = public.people.record_version + 1;

COMMIT;
