// Numbering identity is not a work assignment. Keep unassigned owners null.
export function numberingMember(record) {
  return record.owner_person_id || record.created_by_person_id || null;
}
