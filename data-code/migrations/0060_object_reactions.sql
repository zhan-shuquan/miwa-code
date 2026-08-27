BEGIN;

-- V1.9.36｜统一对象互动事实。
-- 关注继续由 work_item_participants(observer) 表达“订阅关系”；
-- 点赞属于轻互动，不等同负责人/参与者，因此单独记录，未来可扩展到建议、创新、项目等对象。
CREATE TABLE IF NOT EXISTS public.object_reactions (
  id TEXT PRIMARY KEY,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (object_type, object_id, person_id, reaction_type),
  CHECK (length(trim(object_type)) > 0),
  CHECK (length(trim(object_id)) > 0),
  CHECK (length(trim(person_id)) > 0),
  CHECK (length(trim(reaction_type)) > 0),
  CHECK (removed_at IS NULL OR removed_at >= created_at)
);

CREATE INDEX IF NOT EXISTS idx_object_reactions_object
  ON public.object_reactions(object_type, object_id, reaction_type)
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_object_reactions_person
  ON public.object_reactions(person_id, reaction_type, created_at DESC)
  WHERE removed_at IS NULL;

COMMIT;
