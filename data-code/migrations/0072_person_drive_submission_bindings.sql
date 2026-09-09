BEGIN;

CREATE TABLE IF NOT EXISTS public.person_external_locations (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  purpose_code TEXT NOT NULL,
  external_id TEXT NOT NULL,
  display_name TEXT,
  external_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  record_version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (person_id, provider, purpose_code),
  UNIQUE (provider, purpose_code, external_id)
);

INSERT INTO public.person_external_locations (
  id, person_id, provider, purpose_code, external_id, display_name, external_url, status, metadata
) VALUES
  ('pel_86000_1688', '86000', 'google_drive', '1688_weekly_selection_submission', '1lsO67GNKsjGHB6xgKwT76Ap4Hxo7CPOU', '占树全', 'https://drive.google.com/drive/folders/1lsO67GNKsjGHB6xgKwT76Ap4Hxo7CPOU', 'active', '{"parentFolderId":"1_hCOozd_Het_7LqMXxHBwdk4ku37JFHs"}'::jsonb),
  ('pel_86001_1688', '86001', 'google_drive', '1688_weekly_selection_submission', '1qTbvmFkCNYdWSiYcMyxJ4MKTkY3fUIaZ', '占金玲', 'https://drive.google.com/drive/folders/1qTbvmFkCNYdWSiYcMyxJ4MKTkY3fUIaZ', 'active', '{"parentFolderId":"1_hCOozd_Het_7LqMXxHBwdk4ku37JFHs"}'::jsonb),
  ('pel_86002_1688', '86002', 'google_drive', '1688_weekly_selection_submission', '1aNQR6N_GwclC6jRVi-MrwyJ55zGgfzf6', '梁统剑', 'https://drive.google.com/drive/folders/1aNQR6N_GwclC6jRVi-MrwyJ55zGgfzf6', 'active', '{"parentFolderId":"1_hCOozd_Het_7LqMXxHBwdk4ku37JFHs"}'::jsonb),
  ('pel_86003_1688', '86003', 'google_drive', '1688_weekly_selection_submission', '1i-qJPFSttQ7FKck8NFyvp0M3tsX0Hs31', '于硕', 'https://drive.google.com/drive/folders/1i-qJPFSttQ7FKck8NFyvp0M3tsX0Hs31', 'active', '{"parentFolderId":"1_hCOozd_Het_7LqMXxHBwdk4ku37JFHs"}'::jsonb),
  ('pel_86004_1688', '86004', 'google_drive', '1688_weekly_selection_submission', '1pLNKB9e9CVpFYxOArrGIwfRQDwPIdx8m', '刘冰燕', 'https://drive.google.com/drive/folders/1pLNKB9e9CVpFYxOArrGIwfRQDwPIdx8m', 'active', '{"parentFolderId":"1_hCOozd_Het_7LqMXxHBwdk4ku37JFHs"}'::jsonb),
  ('pel_86005_1688', '86005', 'google_drive', '1688_weekly_selection_submission', '1QhA-xNkSW4nJX7howcF5BUHzpvC5Xj7B', '陈永航', 'https://drive.google.com/drive/folders/1QhA-xNkSW4nJX7howcF5BUHzpvC5Xj7B', 'active', '{"parentFolderId":"1_hCOozd_Het_7LqMXxHBwdk4ku37JFHs"}'::jsonb),
  ('pel_86018_1688', '86018', 'google_drive', '1688_weekly_selection_submission', '1PsFuEC6CI3BFi6G6zmu-KE22F99bAzqU', '单利影', 'https://drive.google.com/drive/folders/1PsFuEC6CI3BFi6G6zmu-KE22F99bAzqU', 'active', '{"parentFolderId":"1_hCOozd_Het_7LqMXxHBwdk4ku37JFHs"}'::jsonb)
ON CONFLICT (person_id, provider, purpose_code) DO UPDATE SET
  external_id = EXCLUDED.external_id,
  display_name = EXCLUDED.display_name,
  external_url = EXCLUDED.external_url,
  status = 'active',
  metadata = EXCLUDED.metadata,
  updated_at = NOW(),
  record_version = public.person_external_locations.record_version + 1;

COMMIT;
