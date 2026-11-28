// Authentication-only extension of the existing outbound connector.
// Do not log encrypted requests, passwords, hashes or credentials.
export async function processEmployeeAuthManagement({base,token,erp}) {
  const api=async(path,body)=>{
    const response=await fetch(base+'/api/v1/employee-auth-admin'+path,{
      method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','x-aione-connector-token':token},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)
    });
    if(response.status===404)return null; // Before staged backend rollout, no auth work.
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Object.assign(Error('Authentication management channel unavailable'),{status:response.status});
    return result;
  };
  const publicKey=await api('/public-key');if(!publicKey)return;
  const outgoing=await erp('erp-auth-management.py',{publicKey});
  const results=[];
  for(const command of outgoing.commands||[]) {
    try {results.push(await api('/commands',command));}
    catch(e) {
      // Retry uncertain outcomes with the same encrypted request ID; server receipts
      // prevent a second reset. Permanent failures are visible in ERP for review.
      if([400,409].includes(e.status))results.push({requestId:command.requestId,ok:false,message:'管理请求被拒绝或已过期，请管理员检查后重新发起'});
      else break; // One unavailable auth channel must not delay every queued command.
    }
  }
  const status=await api('/status',{personIds:outgoing.personIds||[]});
  await erp('erp-auth-management.py',{results,statuses:status?.employees||[]});
}
