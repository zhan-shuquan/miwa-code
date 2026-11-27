// ERP is the only correction author. Requests arrive on the authenticated outbound connector.
// Fail closed for business-history migrations that have not been individually reviewed.
const identifier=s=>{if(!/^[a-z_][a-z0-9_]*$/.test(s))throw Error('Unsupported SQL identifier');return '"'+s+'"'};
const keyFor=id=>'member-correction:'+id;
async function stored(c,id){return (await c.query('SELECT value FROM selection_workspace_config WHERE key=$1',[keyFor(id)])).rows[0]?.value;}
async function save(c,id,value){await c.query(`INSERT INTO selection_workspace_config(key,value) VALUES($1,$2::jsonb)
 ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`,[keyFor(id),JSON.stringify(value)]);}
const same=(a,b)=>['id','employeeId','oldMember','newMember','fingerprint'].every(k=>a[k]===b[k]);

async function inspect(c,r){
 const old=(await c.query('SELECT * FROM people WHERE id=$1',[r.oldMember])).rows[0];
 const target=(await c.query('SELECT id FROM people WHERE id=$1',[r.newMember])).rows;
 if(target.length)throw Error('正确会员号已被AIONE使用或保留，禁止自动合并');
 const grants=(await c.query("SELECT value FROM selection_workspace_config WHERE key='pool-grants'")).rows[0]?.value||{};
 if(Object.hasOwn(grants,r.newMember))throw Error('正确会员号已有业务授权记录，禁止自动合并');
 const reserved=(await c.query("SELECT value FROM selection_workspace_config WHERE key LIKE 'member-correction:%'")).rows;
 if(reserved.some(x=>x.value.id!==r.id && ['Checked','Applied'].includes(x.value.status) && [x.value.oldMember,x.value.newMember].includes(r.newMember)))throw Error('正确会员号已被其他纠错流程保留');
 if(old?.metadata?.erpEmployeeId && old.metadata.erpEmployeeId!==r.employeeId)throw Error('原会员号已关联其他ERP员工');
 if(old && !old.metadata?.erpEmployeeId)throw Error('原会员缺少可验证的ERP员工关联，请先审核历史身份');
 for(const email of r.loginEmails){
  const conflicts=await c.query(`SELECT id FROM people WHERE LOWER(primary_email)=$1 AND id<>$2
   UNION SELECT person_id FROM person_login_emails WHERE LOWER(email)=$1 AND person_id<>$2
   UNION SELECT person_id FROM external_identities WHERE LOWER(email_snapshot)=$1 AND person_id<>$2`,[email,r.oldMember]);
  if(conflicts.rowCount)throw Error('Google邮箱已关联其他会员，禁止自动改绑');
 }
 // Check exact typed values, excluding image bytes. Preserve immutable history; do not guess JSON paths.
 const columns=(await c.query(`SELECT table_name,column_name,data_type FROM information_schema.columns
 WHERE table_schema='public' AND data_type IN ('text','character varying','json','jsonb')`)).rows;
 const references=[];
 for(const x of columns){
  if(['people','external_identities','person_login_emails','selection_workspace_config','schema_migrations'].includes(x.table_name))continue;
  const col=identifier(x.column_name),table=identifier(x.table_name);
  const json=['json','jsonb'].includes(x.data_type);
  const result=await c.query(`SELECT count(*)::integer AS n FROM ${table} WHERE ${json?`${col}::text ~ $1`:`${col} IN ($1,$2)`}`,json?['"('+r.oldMember+'|'+r.newMember+')"']:[r.oldMember,r.newMember]);
  if(result.rows[0].n)references.push({table:x.table_name,field:x.column_name,count:result.rows[0].n});
 }
 if(references.length)throw Error('检测到需专项审核的历史业务引用；未修改任何记录：'+JSON.stringify(references));
 return {oldExists:Boolean(old),references,googleAssociations:(await c.query('SELECT count(*)::integer AS n FROM external_identities WHERE person_id=$1',[r.oldMember])).rows[0].n};
}

export async function processMemberCorrections(c,requests,employees){
 if(requests==null)return [];
 if(!Array.isArray(requests)||requests.length>20)throw Error('纠错请求格式无效');
 const receipts=[];
 for(const r of requests){
  if(!r.id || !r.employeeId || !/^\d{1,140}$/.test(r.oldMember) || !/^\d{1,140}$/.test(r.newMember) || r.oldMember===r.newMember || !r.reason || !r.operator || !r.fingerprint || !['Checking','Approved'].includes(r.state))throw Error('纠错审核字段不完整');
  if(!Array.isArray(r.loginEmails)||r.loginEmails.length>2||r.loginEmails.some(e=>!/^\S+@\S+\.\S+$/.test(e)))throw Error('纠错邮箱无效');
  const employee=employees.find(e=>e.employeeId===r.employeeId && e.memberId===r.oldMember);
  if(!employee)throw Error('纠错与ERP当前员工快照不一致');
  const prior=await stored(c,r.id);
  if(prior&&!same(prior,r))throw Error('纠错编号被用于不同身份，禁止重放');
  if(prior?.status==='Applied'){employee.memberId=r.newMember;receipts.push(prior);continue;}
  const receipt=Object.fromEntries(['id','employeeId','oldMember','newMember','fingerprint','reason','operator'].map(k=>[k,r[k]]));
  await c.query('SAVEPOINT member_correction');
  try{
   const report=await inspect(c,r);
   if(r.state==='Checking'){
    Object.assign(receipt,{status:'Checked',checkedAt:new Date().toISOString(),report});
   }else{
    if(prior?.status!=='Checked')throw Error('尚未完成线上关联检查，不能执行纠错');
    // Atomic identity-table transaction. Existing Google subject values are never changed.
    await c.query('LOCK TABLE people,person_login_emails,external_identities IN SHARE ROW EXCLUSIVE MODE');
    await inspect(c,r);
    const old=(await c.query('SELECT * FROM people WHERE id=$1 FOR UPDATE',[r.oldMember])).rows[0];
    if(old)await c.query(`UPDATE people SET primary_email=NULL,status='inactive',metadata=metadata||$2::jsonb,updated_at=now() WHERE id=$1`,[r.oldMember,JSON.stringify({correctedTo:r.newMember,correctionId:r.id,originalPrimaryEmail:old.primary_email})]);
    await c.query(`INSERT INTO people(id,display_name,primary_email,status,source_system,metadata)
     VALUES($1,$2,$3,$4,'erp-employee',$5::jsonb)`,[r.newMember,employee.name,old?.primary_email||null,employee.status==='Active'?'active':'inactive',JSON.stringify({...old?.metadata,erpEmployeeId:r.employeeId,memberCorrectionId:r.id})]);
    await c.query('UPDATE person_login_emails SET person_id=$2,updated_at=now() WHERE person_id=$1',[r.oldMember,r.newMember]);
    await c.query('UPDATE external_identities SET person_id=$2,updated_at=now() WHERE person_id=$1',[r.oldMember,r.newMember]);
    for(const email of r.loginEmails)await c.query(`INSERT INTO person_login_emails(id,person_id,email,status,source_system) VALUES($1,$2,$3,$4,'erp-employee')
     ON CONFLICT(LOWER(email)) DO NOTHING`,['email:'+email,r.newMember,email,employee.status==='Active'?'active':'disabled']);
    const grants=(await c.query("SELECT value FROM selection_workspace_config WHERE key='pool-grants'")).rows[0]?.value||{};
    if(Object.hasOwn(grants,r.oldMember)){grants[r.newMember]=grants[r.oldMember];delete grants[r.oldMember];}
    await c.query("UPDATE selection_workspace_config SET value=$1::jsonb WHERE key='pool-grants'",[JSON.stringify(grants)]);
    employee.memberId=r.newMember;
    Object.assign(receipt,{status:'Applied',appliedAt:new Date().toISOString(),report});
   }
   await save(c,r.id,receipt);
   await c.query('RELEASE SAVEPOINT member_correction');
  }catch(error){
   await c.query('ROLLBACK TO SAVEPOINT member_correction');
   employee.memberId=r.oldMember;
   Object.assign(receipt,{status:'Blocked',message:error.message});
   await save(c,r.id,receipt);
   await c.query('RELEASE SAVEPOINT member_correction');
  }
  receipts.push(receipt);
 }
 return receipts;
}
