BEGIN;

INSERT INTO public.work_templates (
  id, code, title, description, work_type, business_scope,
  related_object_type, related_object_id, evidence_policy, completion_policy,
  status, metadata, created_by_person_id, updated_by_person_id
) VALUES (
  'wkt_1688_weekly_selection_v1',
  'miwa-crossborder-1688-weekly-selection',
  '提交本周1688选品',
  '每周六20:00前，将本人1688官方采购助手选品库中本人姓名分组导出的Excel提交到公司指定Google共享云盘位置。系统读取证据、去重并按岗位最低有效候选数量验收。',
  'recurring_task',
  '美和跨境 / 商品之家 / 选品中心',
  'selection_center',
  '1688_weekly_selection',
  '{"type":"google_drive_spreadsheet","provider":"google_drive","fileNamePattern":"YYYYMMDD_姓名_1688选品.xlsx","source":"1688_official_procurement_assistant_export"}'::jsonb,
  '{"validationMode":"deterministic","defaultMinValidSelections":1,"roleOverrides":[{"roleGroup":"operations_or_selection","minValidSelections":5}],"dedupeKeys":["1688_product_id","canonical_source_url"]}'::jsonb,
  'active',
  '{"current":true,"productFreezeVersion":"V1.0","workHomeEntry":"我的工作"}'::jsonb,
  NULL,
  NULL
)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  business_scope = EXCLUDED.business_scope,
  evidence_policy = EXCLUDED.evidence_policy,
  completion_policy = EXCLUDED.completion_policy,
  status = 'active',
  metadata = EXCLUDED.metadata,
  updated_at = NOW(),
  record_version = public.work_templates.record_version + 1;

INSERT INTO public.recurring_rules (
  id, code, name, work_template_id, cadence, timezone,
  generate_day, generate_time, deadline_day, deadline_time,
  audience_policy, rule_parameters, is_active, effective_from,
  rule_version, metadata, created_by_person_id, updated_by_person_id
) VALUES (
  'rr_1688_weekly_selection_v1',
  'miwa-crossborder-1688-weekly-selection',
  '美和跨境｜1688每周选品提交',
  (SELECT id FROM public.work_templates WHERE code='miwa-crossborder-1688-weekly-selection'),
  'weekly',
  'Asia/Tokyo',
  0,
  '00:05',
  6,
  '20:00',
  '{"peopleStatus":"active"}'::jsonb,
  '{"defaultMinValidSelections":1,"operationsOrSelectionMinValidSelections":5,"deadlineLabel":"每周六20:00"}'::jsonb,
  TRUE,
  DATE '2026-09-09',
  'v1',
  '{"current":true,"source":"Product Freeze V1.0","businessScope":"美和跨境 / 商品之家 / 选品中心"}'::jsonb,
  NULL,
  NULL
)
ON CONFLICT (code) DO UPDATE SET
  work_template_id = EXCLUDED.work_template_id,
  cadence = EXCLUDED.cadence,
  timezone = EXCLUDED.timezone,
  generate_day = EXCLUDED.generate_day,
  generate_time = EXCLUDED.generate_time,
  deadline_day = EXCLUDED.deadline_day,
  deadline_time = EXCLUDED.deadline_time,
  audience_policy = EXCLUDED.audience_policy,
  rule_parameters = EXCLUDED.rule_parameters,
  is_active = TRUE,
  effective_from = EXCLUDED.effective_from,
  rule_version = EXCLUDED.rule_version,
  metadata = EXCLUDED.metadata,
  updated_at = NOW(),
  record_version = public.recurring_rules.record_version + 1;

COMMIT;
