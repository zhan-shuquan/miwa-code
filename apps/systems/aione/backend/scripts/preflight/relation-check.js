async function safeScalar(db, sql, key) {
  const { rows } = await db.query(sql);
  return Number(rows[0]?.[key] || 0);
}

export async function collectRelationChecks(db, schemaIndex) {
  const checks = [];
  const has = (table, column) => schemaIndex.tables.has(table) && (schemaIndex.columns.get(table) || new Set()).has(column);

  if (has('assignments','person_id') && has('people','id')) {
    checks.push({
      check_id: 'assignments.person_id.people',
      orphan_count: await safeScalar(db, `SELECT COUNT(*)::bigint AS n FROM public.assignments a LEFT JOIN public.people p ON p.id=a.person_id WHERE a.person_id IS NOT NULL AND p.id IS NULL`, 'n')
    });
  }
  if (has('assignments','position_id') && has('positions','id')) {
    checks.push({
      check_id: 'assignments.position_id.positions',
      orphan_count: await safeScalar(db, `SELECT COUNT(*)::bigint AS n FROM public.assignments a LEFT JOIN public.positions p ON p.id=a.position_id WHERE a.position_id IS NOT NULL AND p.id IS NULL`, 'n')
    });
  }
  if (has('work_items','business_id') && has('businesses','id')) {
    checks.push({
      check_id: 'work_items.business_id.businesses',
      orphan_count: await safeScalar(db, `SELECT COUNT(*)::bigint AS n FROM public.work_items w LEFT JOIN public.businesses b ON b.id=w.business_id WHERE w.business_id IS NOT NULL AND b.id IS NULL`, 'n')
    });
  }
  if (has('work_items','owner_assignment_id') && has('assignments','id')) {
    checks.push({
      check_id: 'work_items.owner_assignment_id.assignments',
      orphan_count: await safeScalar(db, `SELECT COUNT(*)::bigint AS n FROM public.work_items w LEFT JOIN public.assignments a ON a.id=w.owner_assignment_id WHERE w.owner_assignment_id IS NOT NULL AND a.id IS NULL`, 'n')
    });
  }
  if (has('work_item_participants','work_item_id') && has('work_items','id')) {
    checks.push({
      check_id: 'work_item_participants.work_item_id.work_items',
      orphan_count: await safeScalar(db, `SELECT COUNT(*)::bigint AS n FROM public.work_item_participants x LEFT JOIN public.work_items w ON w.id=x.work_item_id WHERE x.work_item_id IS NOT NULL AND w.id IS NULL`, 'n')
    });
  }
  if (has('work_proposals','approved_work_id') && has('work_items','id')) {
    checks.push({
      check_id: 'work_proposals.approved_work_id.work_items',
      orphan_count: await safeScalar(db, `SELECT COUNT(*)::bigint AS n FROM public.work_proposals x LEFT JOIN public.work_items w ON w.id=x.approved_work_id WHERE x.approved_work_id IS NOT NULL AND w.id IS NULL`, 'n')
    });
  }
  if (has('ai_offices','ai_secretary_talent_id') && has('ai_talents','id')) {
    checks.push({
      check_id: 'ai_offices.ai_secretary_talent_id.ai_talents',
      orphan_count: await safeScalar(db, `SELECT COUNT(*)::bigint AS n FROM public.ai_offices o LEFT JOIN public.ai_talents t ON t.id=o.ai_secretary_talent_id WHERE o.ai_secretary_talent_id IS NOT NULL AND t.id IS NULL`, 'n')
    });
  }

  return checks;
}
