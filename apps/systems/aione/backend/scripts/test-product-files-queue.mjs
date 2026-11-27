import assert from 'node:assert/strict';
import pg from 'pg';
import express from 'express';
import {readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {requestProductFiles} from '../src/services/selection-product-files.js';
import {createSelectionERPCommands} from '../src/routes/selection-erp-commands.js';
// Fixed isolated endpoint. Production DATABASE_URL is intentionally ignored.
const c=new pg.Client({connectionString:'postgres://aione_test:isolated-local-test-only@127.0.0.1:55432/aione_selection'});
await c.connect();
let server;
try {
  await c.query('BEGIN');
  await c.query(await readFile(new URL('../../../../../data-code/migrations/0205_selection_product_files.sql',import.meta.url),'utf8'));
  for(const table of ['selection_erp_commands','product_opportunities','selection_workspace_assets','selection_workspace_events'])
    await c.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING ALL) ON COMMIT DROP`);
  const record={id:'isolated:'+randomUUID(),selection_no:'qat261127999',owner_person_id:'86991',selection_workspace:{status:'confirmed',formalNumber:{code:'qat999'},data:{item_code:'qat999',skus:[]}}};
  await c.query("INSERT INTO product_opportunities(id,source_platform,title,owner_person_id,selection_no,selection_workspace) VALUES($1,'manual','isolated fixture','86991',$2,$3)",[record.id,record.selection_no,JSON.stringify(record.selection_workspace)]);
  const bytes=Buffer.from('isolated product bytes'),asset=randomUUID(),market=randomUUID();
  for(const id of [asset,market])await c.query('INSERT INTO selection_workspace_assets(id,selection_id,filename,content_type,bytes,sha256,position) VALUES($1,$2,\'fixture.jpg\',\'image/jpeg\',$3,$4,0)',[id,record.id,bytes,createHash('sha256').update(id).digest('hex')]);
  record.selection_workspace.researchAssetIds=[market];
  const a=await requestProductFiles(c,record,'86991');
  const b=await requestProductFiles(c,record,'86991');
  assert.equal(a.id,b.id);
  assert.equal(await requestProductFiles(c,{...record,selection_workspace:{...record.selection_workspace,status:'draft'}},'86991'),null);
  const app=express();app.use(express.json());
  app.use(createSelectionERPCommands({pool:c,tx:fn=>fn(c),integration:(req,res,next)=>req.headers['x-test-connector']==='isolated'?next():res.sendStatus(401)}));
  app.use((e,_req,res,_next)=>res.status(e.statusCode||500).json({error:e.message}));
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  const base='http://127.0.0.1:'+server.address().port;
  const call=(path,body,auth=true)=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(auth?{'x-test-connector':'isolated'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  assert.equal((await call('/claim',{},false)).status,401);
  const claimed=await (await call('/claim',{})).json();assert.equal(claimed.jobs.length,1);
  const job=claimed.jobs[0];assert.equal(job.payload.assets.length,1);
  assert.equal((await call('/'+job.id+'/assets/'+market)).status,404);
  assert.equal((await call('/'+job.id+'/assets/'+asset)).status,200);
  assert.equal((await call('/'+job.id+'/heartbeat',{leaseToken:randomUUID()})).status,409);
  assert.equal((await call('/'+job.id+'/heartbeat',{leaseToken:job.lease_token})).status,200);
  const receipt={status:'succeeded',leaseToken:job.lease_token,result:{state:'saved',code:'qat999',selectionId:record.id,wps:'unverified',googleDrive:'unverified'}};
  assert.equal((await call('/'+job.id+'/result',receipt)).status,200);
  assert.equal((await call('/'+job.id+'/result',receipt)).status,409);
  assert.equal((await (await call('/claim',{})).json()).jobs.length,0);
  const saved=(await c.query('SELECT selection_workspace FROM product_opportunities WHERE id=$1',[record.id])).rows[0];
  assert.equal(saved.selection_workspace.fileSync.state,'saved');
  assert.equal(saved.selection_workspace.status,'confirmed');
  console.log('PASS: isolated transaction, unique command, draft exclusion, connector auth, research attachment isolation, lease renewal, result idempotency, unchanged ERP intake status');
} finally {
  if(server)await new Promise(resolve=>server.close(resolve));
  await c.query('ROLLBACK');await c.end();
}


