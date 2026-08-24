BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_talents (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  talent_type TEXT NOT NULL DEFAULT 'specialist'
    CHECK (talent_type IN ('secretary','specialist','agent','skill_bundle')),
  status TEXT NOT NULL DEFAULT 'preset'
    CHECK (status IN ('preset','validating','active','paused','deprecated')),
  version TEXT,
  provider TEXT,
  model TEXT,
  responsibility_summary TEXT,
  capability_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  cost_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_talents_status ON public.ai_talents(status, talent_type);

CREATE TABLE IF NOT EXISTS public.ai_offices (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  office_type TEXT NOT NULL DEFAULT 'business_role'
    CHECK (office_type IN ('management_role','business_role')),
  status TEXT NOT NULL DEFAULT 'preset'
    CHECK (status IN ('preset','validating','active','paused','closed')),
  human_owner_position_id TEXT REFERENCES public.positions(id) ON DELETE SET NULL,
  human_owner_person_id TEXT,
  ai_secretary_talent_id TEXT REFERENCES public.ai_talents(id) ON DELETE SET NULL,
  scope_summary TEXT,
  responsibility_summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_offices_status ON public.ai_offices(status, office_type);
CREATE INDEX IF NOT EXISTS idx_ai_offices_owner ON public.ai_offices(human_owner_person_id);

CREATE TABLE IF NOT EXISTS public.ai_assignments (
  id TEXT PRIMARY KEY,
  ai_talent_id TEXT NOT NULL REFERENCES public.ai_talents(id) ON DELETE RESTRICT,
  ai_office_id TEXT NOT NULL REFERENCES public.ai_offices(id) ON DELETE RESTRICT,
  ai_position_id TEXT REFERENCES public.positions(id) ON DELETE SET NULL,
  assignment_type TEXT NOT NULL DEFAULT 'primary'
    CHECK (assignment_type IN ('primary','shared','temporary','project')),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','validating','active','ended','cancelled')),
  human_owner_person_id TEXT,
  responsibility_summary TEXT,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_person_id TEXT,
  updated_by_person_id TEXT,
  source_system TEXT NOT NULL DEFAULT 'aione',
  archived_at TIMESTAMPTZ,
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_ai_assignments_office_status ON public.ai_assignments(ai_office_id, status);
CREATE INDEX IF NOT EXISTS idx_ai_assignments_talent_status ON public.ai_assignments(ai_talent_id, status);

INSERT INTO public.ai_talents (id, code, name, talent_type, status, responsibility_summary, metadata)
VALUES ('ait-secretary-general', 'AI-SECRETARY-GENERAL', 'AI秘书', 'secretary', 'validating', '岗位AI办公室最高AI调度层；统一受领目标、读取上下文、调度AI人才与AIONE Tool，并在重大/写入动作前等待人类确认。', '{"stage":"v1.8-first-validator"}'::jsonb)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.ai_offices (id, code, name, office_type, status, ai_secretary_talent_id, scope_summary, metadata)
VALUES
  ('aio-chairman','chairman','会长兼董事长AI办公室','management_role','validating','ait-secretary-general','集团经营、AIONE建设、人才、资金、重大项目与关键决策','{"firstValidator":true}'::jsonb),
  ('aio-cross-border','cross-border-lead','跨境负责人AI办公室','management_role','preset','ait-secretary-general','跨境电商经营与业务闭环','{}'::jsonb),
  ('aio-wholesale','wholesale-lead','批发负责人AI办公室','management_role','preset','ait-secretary-general','日本批发经营与业务闭环','{}'::jsonb),
  ('aio-operations','operations','运营岗位AI办公室','business_role','preset','ait-secretary-general','店铺、商品、广告、活动与经营结果','{}'::jsonb),
  ('aio-procurement','procurement','采购岗位AI办公室','business_role','preset','ait-secretary-general','供应商、采购、成本、交期与库存关联','{}'::jsonb),
  ('aio-design','design','设计岗位AI办公室','business_role','preset','ait-secretary-general','视觉设计、素材、质量与交付','{}'::jsonb),
  ('aio-service','service','客服岗位AI办公室','business_role','preset','ait-secretary-general','客户咨询、售后、异常与服务质量','{}'::jsonb)
ON CONFLICT (code) DO NOTHING;

COMMIT;
