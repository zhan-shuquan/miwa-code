// ERP projections authorize existing identity tables; no independent employee registry.
export async function synchronizeEmployeeIdentities(c, snapshot) {
  const activeIds=[];
  for(const e of snapshot.employees) {
    if(!e.memberId)continue;
    const current=(await c.query('SELECT id,metadata FROM people WHERE id=$1',[e.memberId])).rows[0];
    if(current?.metadata?.erpEmployeeId && current.metadata.erpEmployeeId!==e.employeeId)throw Error('ERP员工编号与已有会员关联冲突：'+e.memberId);
    if(!current && !e.loginEmails?.length)continue;
    for(const email of e.loginEmails||[]) {
      const conflicts=await c.query(`SELECT person_id FROM person_login_emails WHERE LOWER(email)=$1 AND person_id<>$2
        UNION SELECT id FROM people WHERE LOWER(primary_email)=$1 AND id<>$2
        UNION SELECT person_id FROM external_identities WHERE provider='google' AND LOWER(email_snapshot)=$1 AND person_id<>$2`,[email,e.memberId]);
      if(conflicts.rowCount)throw Error('登录邮箱已关联其他会员，禁止自动改绑：'+email);
    }
    const loginManaged=true;
    const metadata={erpEmployeeId:e.employeeId,erpLoginManaged:loginManaged};
    await c.query(`INSERT INTO people(id,display_name,status,source_system,metadata)
      VALUES($1,$2,$3,'erp-employee',$4::jsonb)
      ON CONFLICT(id) DO UPDATE SET display_name=EXCLUDED.display_name,status=EXCLUDED.status,
      metadata=people.metadata||EXCLUDED.metadata,updated_at=now(),record_version=people.record_version+1
      WHERE people.display_name IS DISTINCT FROM EXCLUDED.display_name
      OR people.status IS DISTINCT FROM EXCLUDED.status
      OR NOT people.metadata @> EXCLUDED.metadata`,
      [e.memberId,e.name,e.status==='Active'?'active':'inactive',JSON.stringify(metadata)]);
    activeIds.push(e.memberId);
    if(loginManaged) {
      // Revoke removed emails without deleting provider subjects or their historical ownership.
      await c.query("UPDATE person_login_emails SET status='disabled',updated_at=now() WHERE person_id=$1 AND NOT(LOWER(email)=ANY($2::text[]))",[e.memberId,e.loginEmails||[]]);
      for(const email of e.loginEmails||[])await c.query(`INSERT INTO person_login_emails(id,person_id,email,status,source_system)
        VALUES($1,$2,$3,$4,'erp-employee') ON CONFLICT(LOWER(email)) DO UPDATE SET status=EXCLUDED.status,updated_at=now()
        WHERE person_login_emails.person_id=EXCLUDED.person_id`,['email:'+email,e.memberId,email,e.status==='Active'?'active':'disabled']);
    }
  }
  await c.query("UPDATE people SET status='inactive',updated_at=now() WHERE metadata ? 'erpEmployeeId' AND NOT(id=ANY($1::text[]))",[activeIds]);
}
