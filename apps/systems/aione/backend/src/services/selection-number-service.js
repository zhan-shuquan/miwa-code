import { fail } from './selection-workspace-contract.js';
export function selectionBusinessDate(value = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail('选品日期无效');
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
// Same transaction as creation. Allocation history is independent of record deletion.
export async function allocateSelectionNo(client, dateValue, memberId, selectionId) {
  if (!selectionId || !memberId) fail('新增选品需要已认证的ERP员工身份');
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['selection-allocation:'+selectionId]);
  const previous = (await client.query('SELECT * FROM selection_number_allocations WHERE selection_id=$1',[selectionId])).rows[0];
  if (previous) return {selectionNo:previous.selection_no,selectionDate:previous.selection_date,employeeId:previous.employee_id};
  const employee = (await client.query('SELECT * FROM aione_employee_directory WHERE id=$1',[memberId])).rows[0];
  if (!employee?.employee_id || employee.status !== 'Active') fail('原始选品人尚未关联有效ERP员工档案',403);
  const prefix = String(employee.item_prefix || '').trim();
  if (!prefix) fail('新增选品前，请管理员在ERP员工档案补齐员工货号前缀',409);
  const selectionDate = selectionBusinessDate(dateValue);
  for (const key of ['employee:'+employee.employee_id,'prefix:'+prefix.toLowerCase()].sort())
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['selection-day:'+selectionDate+':'+key]);
  const {number} = (await client.query(`SELECT COALESCE(MAX(sequence_number),0)+1 AS number
    FROM selection_number_allocations WHERE selection_date=$1::date
    AND (employee_id=$2 OR lower(item_prefix)=lower($3))`,[selectionDate,employee.employee_id,prefix])).rows[0];
  if (number>999) fail('该员工今日选品编号已达999，请次日再新增；已有记录可继续处理',409);
  const selectionNo=prefix+selectionDate.slice(2).replaceAll('-','')+String(number).padStart(3,'0');
  await client.query(`INSERT INTO selection_number_allocations
    (selection_id,selection_no,employee_id,item_prefix,selection_date,sequence_number) VALUES($1,$2,$3,$4,$5,$6)`,
    [selectionId,selectionNo,employee.employee_id,prefix,selectionDate,number]);
  return {selectionNo,selectionDate,employeeId:employee.employee_id};
}
