import pool from "../../db.js";
import { listDriveFolderFiles } from "../integrations/google-drive-client.js";

const PURPOSE = "1688_weekly_selection_submission";

function yyyymmdd(isoDate) {
  return String(isoDate || "").slice(0, 10).replaceAll("-", "");
}

export async function getSubmissionLocation(personId) {
  const result = await pool.query(`
    SELECT l.person_id, p.display_name, l.external_id AS folder_id, l.external_url AS folder_url, l.metadata
    FROM public.person_external_locations l
    JOIN public.people p ON p.id=l.person_id
    WHERE l.person_id=$1 AND l.provider='google_drive' AND l.purpose_code=$2 AND l.status='active'
  `, [personId, PURPOSE]);
  return result.rows[0] || null;
}

export async function discover1688EvidenceForWorkItem({ workItemId }) {
  const itemResult = await pool.query(`
    SELECT w.id, w.responsible_person_id, w.cycle_key, w.due_at, p.display_name
    FROM public.work_items w
    JOIN public.people p ON p.id=w.responsible_person_id
    LEFT JOIN public.recurring_rules r ON r.id=w.recurring_rule_id
    WHERE w.id=$1 AND w.archived_at IS NULL AND r.code='weekly-1688-selection'
  `, [workItemId]);
  if (!itemResult.rowCount) {
    const error = new Error("1688 recurring work item not found.");
    error.statusCode = 404;
    throw error;
  }
  const item = itemResult.rows[0];
  const location = await getSubmissionLocation(item.responsible_person_id);
  if (!location) {
    const error = new Error("Employee 1688 Drive submission folder is not bound.");
    error.code = "submission_folder_not_bound";
    error.statusCode = 409;
    throw error;
  }

  const files = await listDriveFolderFiles({ folderId: location.folder_id, pageSize: 200 });
  const cycleStart = yyyymmdd(item.cycle_key);
  const dueDate = yyyymmdd(item.due_at);
  const expectedSuffix = `_${item.display_name}_1688选品.xlsx`;
  const matches = files.filter((file) => {
    const name = String(file.name || "");
    const date = name.slice(0, 8);
    return name.endsWith(expectedSuffix) && /^\d{8}$/.test(date) && date >= cycleStart && (!dueDate || date <= dueDate);
  });

  return {
    workItemId: item.id,
    personId: item.responsible_person_id,
    personName: item.display_name,
    cycleKey: item.cycle_key,
    folderId: location.folder_id,
    folderUrl: location.folder_url,
    expectedFileNamePattern: `YYYYMMDD_${item.display_name}_1688选品.xlsx`,
    files: matches
  };
}
