import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {allocateSelectionNo,selectionBusinessDate} from '../src/services/selection-number-service.js';
const pool=new pg.Pool({connectionString:'postgres://aione_test:isolated-local-test-only@127.0.0.1:55432/aione_selection',max:20});
await pool.query(await readFile(new URL('../../../../../data-code/migrations/0204_selection_provenance.sql',import.meta.url),'utf8'));
const day='2098-12-29T15:00:00Z';
const tx=async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}};
const alloc=(member,id=randomUUID(),date=day)=>tx(c=>allocateSelectionNo(c,date,member,id));
try{
 assert.equal(selectionBusinessDate('2026-11-27T14:59:59Z'),'2026-11-27');
 assert.equal(selectionBusinessDate('2026-11-27T15:00:00Z'),'2026-11-28');
 const ids=Array.from({length:20},()=>randomUUID());
 const results=await Promise.all(ids.map(id=>alloc('86990',id)));
 assert.equal(new Set(results.map(x=>x.selectionNo)).size,20);
 assert(results.every(x=>/^qmt981230\d{3}$/.test(x.selectionNo)));
 const reused=await Promise.all(Array.from({length:8},()=>alloc('86990',ids[0])));
 assert(reused.every(x=>x.selectionNo===results[0].selectionNo));
 const other=await alloc('86991');assert.match(other.selectionNo,/^qat981230\d{3}$/);
 const seq=Number(results.map(x=>x.selectionNo.slice(-3)).sort().at(-1));
 const after=await alloc('86990');assert.equal(Number(after.selectionNo.slice(-3)),seq+1);
 const client=await pool.connect();try{
  await client.query('BEGIN');
  await client.query("UPDATE selection_workspace_config SET value=jsonb_set(value,'{employees}',(SELECT jsonb_agg(CASE WHEN e->>'memberId'='86991' THEN e||'{\"prefix\":null}'::jsonb ELSE e END) FROM jsonb_array_elements(value->'employees') e)) WHERE key='erp-employees'");
  await assert.rejects(allocateSelectionNo(client,day,'86991',randomUUID()),/补齐/);
  await client.query('ROLLBACK');
 }finally{client.release();}
 await tx(async c=>{
  const id='origin-test:'+randomUUID();
  await c.query("INSERT INTO product_opportunities(id,source_platform,title,created_by_person_id,owner_person_id,selection_no) VALUES($1,'isolated','origin test','86990','86990',$2)",[id,'xp98'+randomUUID()]);
  const before=(await c.query('SELECT * FROM product_opportunities WHERE id=$1',[id])).rows[0];
  await c.query("UPDATE product_opportunities SET owner_person_id='86991' WHERE id=$1",[id]);
  const after=(await c.query('SELECT * FROM product_opportunities WHERE id=$1',[id])).rows[0];
  assert.equal(after.selector_employee_id,'FIXTURE-86990');assert.equal(after.owner_employee_id,'FIXTURE-86991');assert.equal(after.selection_no,before.selection_no);
  await c.query('DELETE FROM product_opportunities WHERE id=$1',[id]);
 });
 console.log(JSON.stringify({passed:true,checks:['Tokyo date boundary','20 parallel personal allocations','8 identical retries','independent employee namespace','persistent sequence','missing prefix rejected','assignment keeps original stable Employee and historical number']}));
}finally{await pool.end();}
