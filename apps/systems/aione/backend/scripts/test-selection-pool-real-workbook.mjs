import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import pg from 'pg';
import {parseIntakeWorkbook} from '../src/services/selection-intake-contract.js';
import {candidateKeys} from '../src/services/selection-pool-service.js';
const filename=process.argv[2];
if(!filename)throw Error('Provide original workbook path');
const buffer=await readFile(filename),hash=createHash('sha256').update(buffer).digest('hex');
const parsed=await parseIntakeWorkbook(buffer,filename);
assert.equal(parsed.rows.length,6);
assert.deepEqual(parsed.rows.map(r=>r.referencePrice),[3.75,16.5,4.7,11.27,13.9,15]);
for(const row of parsed.rows){assert.ok(row.title&&row.source.platformId&&row.source.url&&row.images.length);assert.ok(!row.error);}
const base='http://127.0.0.1:8765';
const login=await fetch(base+'/__preview/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({account:'manager'})});
assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
async function api(path,body){const r=await fetch(base+'/api/v1/selection-workspace/pool'+path,{method:body?'POST':'GET',headers:{cookie,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const j=await r.json();assert.ok(r.ok,JSON.stringify(j));return j;}
const payload={file:{filename:filename.split(/[\\/]/).pop(),base64:buffer.toString('base64')},requestKey:randomUUID()};
const first=(await api('/collect',payload)).items;
assert.equal(first.length,6);assert.ok(first.every(r=>['created','duplicate'].includes(r.state)),JSON.stringify(first));
const again=(await api('/collect',{...payload,requestKey:randomUUID()})).items;
assert.equal(again.length,6);assert.ok(again.every(r=>r.state==='duplicate'));
const db=new pg.Pool({connectionString:'postgres://aione_test:isolated-local-test-only@127.0.0.1:15432/aione_selection'});
try{
 const records=(await db.query("SELECT id,title,created_by_person_id,selection_no,selection_workspace FROM product_opportunities WHERE selection_workspace->'pool'->'source'->>'platformId'=ANY($1::text[])",[parsed.rows.map(r=>r.source.platformId)])).rows;
 const preserved=[];
 for(const row of parsed.rows){const r=records.find(x=>x.selection_workspace.pool.source.platformId===row.source.platformId);if(!r){const keys=await db.query('SELECT identity_key,selection_id FROM selection_identity_keys WHERE identity_key=ANY($1::text[])',[candidateKeys(row)]);assert.ok(keys.rows.length,'Missing row must be explained by an existing global identity');preserved.push({line:row.line,matches:keys.rows});continue;}assert.equal(r.title,row.title);assert.equal(r.selection_workspace.data.sourceUrl,row.source.url);assert.equal(Number(r.selection_workspace.data.custom_单个采购价),row.referencePrice);assert.ok(r.selection_no);}
 console.log(JSON.stringify({preservedDuplicates:preserved}));
 const fresh=records.filter(r=>r.created_by_person_id==='86990'&&r.selection_workspace.pool.state==='pending');
 if(fresh.length){const claimed=(await api('/action',{action:'claim',ids:fresh.map(r=>r.id)})).items;assert.ok(claimed.every(r=>r.stage.code==='source_found'));}
 for(const r of records){const evidence=(await db.query("SELECT person_id FROM work_evidence WHERE related_object_id=$1 AND action_code='pool-collect'",[r.id])).rows;assert.deepEqual(evidence,[{person_id:'86990'}]);}
 const report={originalSha256:hash,rows:6,embeddedImages:parsed.rows.reduce((n,r)=>n+r.images.length,0),createdThisRun:first.filter(r=>r.state==='created').length,duplicatesThisRun:first.filter(r=>r.state==='duplicate').length,claimedThisRun:fresh.length,reimportDuplicates:again.length,checks:['titles','offer IDs','purchase URLs','reference prices','unique records','selection numbers','claim stage','actual collector evidence'],environment:'isolated localhost:8765 / database15432',formalERPIntake:false};
 report.verifiedPoolRecords=records.length;report.preservedDuplicateMatches=preserved;
 await writeFile(new URL('../../../../../../output/selection-pool-real-workbook-result.json',import.meta.url),JSON.stringify(report,null,2));
 assert.equal(createHash('sha256').update(await readFile(filename)).digest('hex'),hash);
 console.log(JSON.stringify(report,null,2));
}finally{await db.end();}
