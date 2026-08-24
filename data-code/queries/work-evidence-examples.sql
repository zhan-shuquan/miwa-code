-- 某人某日有效工作时间结构
SELECT *
FROM public.v_person_daily_time_summary
WHERE person_id = $1 AND work_date = $2::date;

-- 某事业投入的有效人工时间
SELECT business_id, SUM(active_seconds) AS active_seconds
FROM public.work_sessions
WHERE business_id = $1
  AND session_type IN ('aione','external','other')
  AND started_at >= $2
  AND started_at < $3
GROUP BY business_id;

-- 某事业已经发生的收入/支出/成本
SELECT direction, currency, SUM(amount) AS amount
FROM public.money_events
WHERE business_id = $1
  AND occurred_at >= $2
  AND occurred_at < $3
  AND status <> 'cancelled'
GROUP BY direction, currency;

-- 某人的工作与结果证据（人才之家可读取）
SELECT wi.id, wi.title, wi.status, wi.started_at, wi.completed_at,
       COUNT(we.id) AS evidence_count,
       COUNT(rf.id) AS result_count
FROM public.work_items wi
LEFT JOIN public.work_evidence we ON we.work_item_id = wi.id
LEFT JOIN public.result_facts rf ON rf.work_item_id = wi.id
WHERE wi.owner_person_id = $1
GROUP BY wi.id
ORDER BY wi.updated_at DESC;
