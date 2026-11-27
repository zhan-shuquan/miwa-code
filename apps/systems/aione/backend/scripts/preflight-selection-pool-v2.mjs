// Read-only metadata check. Never migrates, scans product data, or prints credentials.
import pg from 'pg';
const required = {
  work_items: ['id','title','work_type','status','owner_person_id','responsible_person_id','assigned_by_person_id','created_by_person_id','related_object_type','related_object_id','metadata','completed_at','updated_at'],
  work_evidence: ['id','work_item_id','person_id','related_object_type','related_object_id','evidence_type','action_code','result_code','summary','payload','happened_at'],
};
if (!process.env.DATABASE_URL) throw Error('DATABASE_URL is required; use the existing authorized connection, never put credentials in command arguments');
const client = new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000});
try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  await client.query("SET LOCAL statement_timeout='10s'");
  const {rows}=await client.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[])",[Object.keys(required)]);
  const missing=Object.entries(required).flatMap(([table,columns])=>columns.filter(column=>!rows.some(r=>r.table_name===table&&r.column_name===column)).map(column=>`${table}.${column}`));
  const primary=await client.query("SELECT tc.table_name,kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu USING(constraint_catalog,constraint_schema,constraint_name,table_name) WHERE tc.table_schema='public' AND tc.constraint_type='PRIMARY KEY' AND tc.table_name=ANY($1::text[])",[Object.keys(required)]);
  for (const table of Object.keys(required)) {
    const keys=primary.rows.filter(r=>r.table_name===table).map(r=>r.column_name);
    if(keys.length!==1||keys[0]!=='id')missing.push(`${table}: expected single id primary key`);
  }
  console.log(JSON.stringify({readOnly:true,ok:missing.length===0,missing,checkedColumns:rows.length},null,2));
  if(missing.length)process.exitCode=1;
} catch(error) {
  console.error(JSON.stringify({ok:false,code:error.code||'PREFLIGHT_FAILED'}));
  process.exitCode=1;
} finally {
  await client.query('ROLLBACK').catch(()=>{});
  await client.end().catch(()=>{});
}
