const CORE_TABLES = [
  'people','external_identities','organizations','businesses','positions','assignments',
  'work_items','work_item_participants','work_sessions','work_evidence','result_facts',
  'money_events','business_events','knowledge_routes','ai_talents','ai_offices',
  'ai_assignments','ai_executions','work_seeds','work_proposals','product_opportunities',
  'activity_logs','object_registry','object_relations','object_reactions'
];

const STATUS_COLUMNS = ['status','state','type','assignment_type','event_type','object_type','source_system'];

function quoteIdent(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error(`Unsafe identifier: ${value}`);
  return `"${value}"`;
}

export async function collectTableProfiles(db, schemaIndex) {
  const profiles = {};
  for (const table of CORE_TABLES) {
    if (!schemaIndex.tables.has(table)) continue;
    const tableSql = quoteIdent(table);
    const count = await db.query(`SELECT COUNT(*)::bigint AS count FROM public.${tableSql}`);
    const profile = { row_count: Number(count.rows[0].count), value_profiles: {} };
    const tableColumns = schemaIndex.columns.get(table) || new Set();
    for (const column of STATUS_COLUMNS) {
      if (!tableColumns.has(column)) continue;
      const columnSql = quoteIdent(column);
      const values = await db.query(`
        SELECT ${columnSql}::text AS value, COUNT(*)::bigint AS count
          FROM public.${tableSql}
         GROUP BY ${columnSql}
         ORDER BY COUNT(*) DESC, ${columnSql}::text
         LIMIT 50
      `);
      profile.value_profiles[column] = values.rows.map((row) => ({ value: row.value, count: Number(row.count) }));
    }
    profiles[table] = profile;
  }
  return profiles;
}

export async function collectIdentityProfile(db, schemaIndex) {
  if (!schemaIndex.tables.has('external_identities')) return { available: false };
  const cols = schemaIndex.columns.get('external_identities') || new Set();
  const required = ['provider','subject','person_id'];
  if (!required.every((name) => cols.has(name))) {
    return { available: true, incomplete_schema: true, missing_columns: required.filter((name) => !cols.has(name)) };
  }
  const [nulls, duplicates, multiPerson, orphan] = await Promise.all([
    db.query(`SELECT COUNT(*) FILTER (WHERE provider IS NULL OR btrim(provider::text)='')::bigint AS provider_missing, COUNT(*) FILTER (WHERE subject IS NULL OR btrim(subject::text)='')::bigint AS subject_missing FROM public.external_identities`),
    db.query(`SELECT COUNT(*)::bigint AS duplicate_groups FROM (SELECT provider, subject FROM public.external_identities GROUP BY provider, subject HAVING COUNT(*)>1) x`),
    db.query(`SELECT COUNT(*)::bigint AS ambiguous_groups FROM (SELECT provider, subject FROM public.external_identities GROUP BY provider, subject HAVING COUNT(DISTINCT person_id)>1) x`),
    schemaIndex.tables.has('people') ? db.query(`SELECT COUNT(*)::bigint AS orphan_count FROM public.external_identities e LEFT JOIN public.people p ON p.id=e.person_id WHERE e.person_id IS NOT NULL AND p.id IS NULL`) : Promise.resolve({ rows: [{ orphan_count: null }] })
  ]);
  return {
    available: true,
    provider_missing: Number(nulls.rows[0].provider_missing),
    subject_missing: Number(nulls.rows[0].subject_missing),
    duplicate_groups: Number(duplicates.rows[0].duplicate_groups),
    ambiguous_groups: Number(multiPerson.rows[0].ambiguous_groups),
    person_orphan_count: orphan.rows[0].orphan_count === null ? null : Number(orphan.rows[0].orphan_count)
  };
}
