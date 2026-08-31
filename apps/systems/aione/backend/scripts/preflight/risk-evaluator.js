export function evaluateRisks({ identityProfile, relationChecks, schemaIndex }) {
  const risks = [];
  const add = (severity, code, message, metric = null) => risks.push({ severity, code, message, metric });

  if (!schemaIndex.tables.has('people')) add('BLOCKER','MISSING_PEOPLE','public.people is missing');
  if (!schemaIndex.tables.has('external_identities')) add('BLOCKER','MISSING_EXTERNAL_IDENTITIES','public.external_identities is missing');

  if (identityProfile?.available) {
    if (identityProfile.incomplete_schema) add('BLOCKER','IDENTITY_SCHEMA_INCOMPLETE','external_identities is missing required identity columns', identityProfile.missing_columns);
    if ((identityProfile.duplicate_groups || 0) > 0) add('BLOCKER','IDENTITY_DUPLICATE_SUBJECT','Duplicate provider+subject groups exist', identityProfile.duplicate_groups);
    if ((identityProfile.ambiguous_groups || 0) > 0) add('BLOCKER','IDENTITY_AMBIGUOUS_PERSON','One provider+subject maps to multiple people', identityProfile.ambiguous_groups);
    if ((identityProfile.person_orphan_count || 0) > 0) add('BLOCKER','IDENTITY_ORPHAN_PERSON','External identities reference missing people', identityProfile.person_orphan_count);
    if ((identityProfile.provider_missing || 0) > 0 || (identityProfile.subject_missing || 0) > 0) add('HIGH','IDENTITY_MISSING_PROVIDER_SUBJECT','Identity rows have missing provider/subject', { provider_missing: identityProfile.provider_missing, subject_missing: identityProfile.subject_missing });
  }

  for (const check of relationChecks || []) {
    if ((check.orphan_count || 0) > 0) add('BLOCKER','CORE_RELATION_ORPHAN',`Logical orphan detected: ${check.check_id}`, check.orphan_count);
  }

  const blockers = risks.filter((risk) => risk.severity === 'BLOCKER');
  const high = risks.filter((risk) => risk.severity === 'HIGH');
  const goNoGo = blockers.length > 0 ? 'NO-GO' : high.length > 0 ? 'CONDITIONAL-GO' : 'GO';

  return { risks, blockers, go_no_go: goNoGo };
}
