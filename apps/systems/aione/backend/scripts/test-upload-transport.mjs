import assert from 'node:assert/strict';
import express from 'express';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { mountUploadTransport, CHUNK_BYTES } from '../src/services/selection-upload-transport.js';
const pool = new pg.Pool({ connectionString: 'postgres://aione_test:isolated-local-test-only@127.0.0.1:55432/aione_transport_check' });
const sha = b => createHash('sha256').update(b).digest('hex');
const tx = async fn => { const c = await pool.connect(); try { await c.query('BEGIN'); const r = await fn(c); await c.query('COMMIT'); return r; } catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); } };
await pool.query(await readFile(new URL('../../../../../data-code/migrations/0203_selection_upload_transport.sql', import.meta.url), 'utf8'));
const app = express(); app.use(express.json({limit: '4mb'}));
app.use((req,res,next)=>req.headers['x-test-owner'] ? next() : res.sendStatus(401));
mountUploadTransport(app, {pool,tx,actor:req=>req.headers['x-test-owner']});
app.post('/records/example/assets', (req,res)=>res.json({sha256:sha(Buffer.from(req.body.base64,'base64')),kind:req.body.kind}));
app.post(['/sku-file','/records'],(req,res)=>res.json({length:req.body.text.length}));
app.patch('/records/draft',(req,res)=>res.json({length:req.body.text.length}));
app.use((e,req,res,next)=>res.status(e.status || e.statusCode || 500).json({message:e.message}));
const server = app.listen(0,'127.0.0.1'); await new Promise(r=>server.once('listening',r));
const base='http://127.0.0.1:'+server.address().port;
const call=async(path,method,body,owner='owner-a')=>{const r=await fetch(base+path,{method,headers:{'content-type':'application/json','x-test-owner':owner},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
try {
  const original=randomBytes(20*1024*1024), payload=Buffer.from(JSON.stringify({base64:original.toString('base64'),kind:'product'}));
  assert.equal((await call('/records/example/assets','POST',JSON.parse(payload))).status,413);
  const init=await call('/upload-transport','POST',{path:'/records/example/assets',size:payload.length,sha256:sha(payload)});
  assert.equal(init.status,200,JSON.stringify(init)); const id=init.body.id;
  assert.equal((await call('/records/example/assets','POST',{uploadTransportId:id})).status,409);
  for(let offset=0,index=0;offset<payload.length;offset+=CHUNK_BYTES,index++) {
    const body={base64:payload.subarray(offset,offset+CHUNK_BYTES).toString('base64')};
    if(!index) assert.equal((await call('/upload-transport/'+id+'/'+index,'PUT',body,'owner-b')).status,404);
    const result=await call('/upload-transport/'+id+'/'+index,'PUT',body); assert.equal(result.status,200,JSON.stringify(result));
    if(!index) { assert.equal((await call('/upload-transport/'+id+'/'+index,'PUT',body)).status,200); assert.equal((await call('/upload-transport/'+id+'/'+index,'PUT',{base64:randomBytes(CHUNK_BYTES).toString('base64')})).status,409); }
  }
  assert.equal((await call('/records/example/assets','POST',{uploadTransportId:id},'owner-b')).status,404);
  assert.equal((await call('/pool/collect','POST',{uploadTransportId:id})).status,404);
  const completed=await call('/records/example/assets','POST',{uploadTransportId:id}); assert.equal(completed.status,200,JSON.stringify(completed));assert.equal(completed.body.sha256,sha(original));assert.equal(completed.body.kind,'product');
  assert.equal((await call('/upload-transport/'+id,'DELETE')).status,200);
  assert.equal((await call('/records/example/assets','POST',{uploadTransportId:id})).status,404);
  assert.equal((await call('/upload-transport','POST',{path:'/connector/snapshot',size:10,sha256:sha('x')})).status,400);
  assert.equal((await call('/upload-transport','POST',{path:'/pool/collect',size:200*1024*1024,sha256:sha('x')})).status,400);
  for(const [path,method] of [['/sku-file','POST'],['/records','POST'],['/records/draft','PATCH']]) {
    const body=Buffer.from(JSON.stringify({text:'x'.repeat(5*1024*1024)}));
    const transfer=await call('/upload-transport','POST',{path,size:body.length,sha256:sha(body)});assert.equal(transfer.status,200);
    for(let offset=0,index=0;offset<body.length;offset+=CHUNK_BYTES,index++)assert.equal((await call('/upload-transport/'+transfer.body.id+'/'+index,'PUT',{base64:body.subarray(offset,offset+CHUNK_BYTES).toString('base64')})).status,200);
    assert.equal((await call(path,method,{uploadTransportId:transfer.body.id},'owner-b')).status,404);
    const result=await call(path,method,{uploadTransportId:transfer.body.id});assert.equal(result.status,200);assert.equal(result.body.length,5*1024*1024);
    await call('/upload-transport/'+transfer.body.id,'DELETE');
  }
  console.log('PASS: 20MiB original across 4MiB proxy; exact SHA256; owner/path isolation; incomplete, duplicate-conflict and oversized rejection; cleanup.');
} finally { await new Promise(r=>server.close(r)); await pool.end(); }
