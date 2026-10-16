// READ ONLY: inspect schema_migrations against repository files before CURRENT release.
// Never call the mutating migrate.js from a release-readiness check.
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../db.js';

const defaultDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../../data-code/migrations');
const directory=process.env.AIONE_MIGRATIONS_DIR||defaultDir;
const fail=(message)=>{console.error('[AIONE][BLOCK] '+message);process.exitCode=2;};

try {
  const files=(await readdir(directory)).filter(name=>/^\\d+_.*\\.sql$/.test(name)).sort();
  const entries=files.map(file=>({version:file.split('_')[0],file}));
  if(new Set(entries.map(x=>x.version)).size!==entries.length)throw new Error('Duplicate migration version in Repo; release blocked');
  const check=await pool.query("SELECT to_regclass('public.schema_migrations') AS relation");
  if(!check.rows[0]?.relation){
    fail('public.schema_migrations not present; manual schema baseline review required (no schema changes made)');
  } else {
    const result=await pool.query('SELECT version,description FROM public.schema_migrations ORDER BY version');
    const applied=new Set(result.rows.map(row=>String(row.version)));
    const pending=entries.filter(entry=>!applied.has(entry.version));
    const unknown=result.rows.filter(row=>!entries.some(entry=>entry.version===String(row.version)));
    console.log(JSON.stringify({
      mode:'READ_ONLY',repositoryMigrationCount:entries.length,
      databaseMigrationCount:result.rows.length,
      pending,unknownDatabaseVersions:unknown,
      schemaMutationPerformed:false
    },null,2));
    if(pending.length||unknown.length)fail('Migration inventory not aligned; review every pending/unknown version before release');
    else console.log('[AIONE] Migration inventory matched. This is not production migration approval.');
  }
} catch(error){
  fail(error.message);
} finally {
  await pool.end().catch(()=>{});
}
