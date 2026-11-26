// Authorized cache of ERP Employee projections, never an editable personnel master.
import { fail } from './selection-workspace-contract.js';
export const employeeFields = ['employeeId','memberId','name','avatar','company','branch','department','designation','employmentType','grade','status','prefix','updatedAt','version'];
export function validateEmployeeSnapshot(input) {
  if (input?.schemaVersion !== 1 || !Array.isArray(input.employees) || !Number.isFinite(Date.parse(input.capturedAt))) fail('ERP人员快照无效');
  const members=new Set(), prefixes=new Set(), ids=new Set();
  const employees=input.employees.map(source=>{
    const row=Object.fromEntries(employeeFields.map(key=>[key,source[key] == null ? null : String(source[key])]));
    if (!row.employeeId || !row.name || !row.status || !row.version) fail('ERP人员字段不完整');
    for (const [value,set] of [[row.employeeId,ids],[row.memberId,members],[row.prefix?.toLowerCase(),prefixes]]) {
      if (value && set.has(value)) fail('ERP人员业务标识重复');
      if (value) set.add(value);
    }
    return row;
  });
  return {schemaVersion:1, capturedAt:input.capturedAt, version:String(input.version || ''), receivedAt:new Date().toISOString(), employees};
}
export function createEmployeeMaster({pool,config,putConfig,allowTestIdentities=false}) {
  async function receive(input,c=pool) {
    const snapshot=validateEmployeeSnapshot(input);
    await c.query("SELECT pg_advisory_xact_lock(hashtext('employee-master-cache'))");
    const previous=(await c.query("SELECT value FROM selection_workspace_config WHERE key='erp-employees'")).rows[0]?.value;
    if (previous && Date.parse(previous.capturedAt)>Date.parse(snapshot.capturedAt)) fail('拒绝过期人员快照',409);
    const identities=new Set((await c.query('SELECT id FROM people')).rows.map(r=>r.id));
    snapshot.employees=snapshot.employees.filter(r=>r.memberId && identities.has(r.memberId));
    await putConfig('erp-employees',snapshot,c);
    const ready=snapshot.employees.filter(e=>e.status==='Active' && e.prefix).map(e=>e.memberId);
    await c.query(`UPDATE selection_erp_commands cmd SET status='queued',result=NULL,updated_at=now()
      FROM product_opportunities p WHERE cmd.selection_id=p.id AND cmd.kind='formal_number'
      AND cmd.status='failed' AND cmd.result->>'message' LIKE '%前缀尚未配置%'
      AND cmd.payload->>'memberId'=ANY($1::text[]) AND p.owner_person_id=cmd.payload->>'memberId'
      AND p.selection_workspace->>'status'='number_pending'`,[ready]);
  }
  async function profile(memberId) {
    const snapshot=await config('erp-employees');
    return {employee:snapshot?.employees.find(r=>r.memberId===memberId) || null,
      source:'ERP Employee',version:snapshot?.version || null,updatedAt:snapshot?.capturedAt || null,
      cached:!snapshot || Date.now()-Date.parse(snapshot.receivedAt)>180000};
  }
  async function requireActive(req) {
    if (allowTestIdentities && req.aioneIdentity?.identitySource==='isolated_test') return;
    if (req.aioneIdentity?.identitySource==='isolated_test') fail('测试身份不能用于正式业务开发环境',403);
    const {employee}=await profile(req.aioneIdentity?.personId);
    if (!employee) fail('尚未关联ERP员工档案，请管理员配置美和会员号',403);
    if (employee.status!=='Active') fail('员工已停用，不能继续业务操作',403);
    const grants=(await config('pool-grants'))?.[employee.memberId] || {};
    if (!['research','collect','assign','manage'].some(key=>grants[key]===true)) fail('尚未获得选品业务权限，请管理员授权',403);
  }
  async function eligible({includeUnassigned=false}={}) {
    if (allowTestIdentities) return (await pool.query('SELECT id,display_name FROM people ORDER BY display_name')).rows;
    const snapshot=await config('erp-employees'), grants=await config('pool-grants') || {};
    return (snapshot?.employees || []).filter(e=>e.status==='Active' && (includeUnassigned || ['research','collect','manage'].some(k=>grants[e.memberId]?.[k])))
      .map(e=>({id:e.memberId,display_name:e.name,employeeId:e.employeeId}));
  }
  return {receive,profile,requireActive,eligible};
}
