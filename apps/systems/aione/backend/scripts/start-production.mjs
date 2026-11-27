// Package the existing reviewed ERP rule host with the API; never expose local ERP.
import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';

const embedded = process.env.AIONE_EMBEDDED_ERP_COST === 'true';
const children = new Set();
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => { for (const child of children) child.kill('SIGKILL'); process.exit(code); }, 5000).unref();
  process.exitCode = code;
}
function launch(command, args, env = process.env) {
  const child = spawn(command, args, { env, stdio: 'inherit', windowsHide: true });
  children.add(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { children.delete(child); if (!stopping) stop(code || 1); });
  return child;
}
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => stop(0));

if (embedded) {
  if (process.env.AIONE_SELECTION_WORKSPACE_ENABLED !== 'true' || process.env.ERP_COST_URL !== 'http://127.0.0.1:8755')
    throw Error('Embedded ERP cost host requires selection workspace and loopback URL');
  for (const key of ['ERP_REVIEWED_RULE_SHA256', 'ERP_REVIEWED_IDENTIFICATION_SHA256'])
    if (!/^[a-f0-9]{64}$/.test(process.env[key] || '')) throw Error(`Missing reviewed hash: ${key}`);
  const env = Object.fromEntries(['PATH', 'LANG', 'ERP_REVIEWED_RULE_SHA256', 'ERP_REVIEWED_IDENTIFICATION_SHA256']
    .filter(key => process.env[key]).map(key => [key, process.env[key]]));
  env.PYTHONUNBUFFERED = '1';
  launch('python3', [fileURLToPath(new URL('../src/services/erp-cost-runner.py', import.meta.url))], env);
  let ready = false;
  for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
    ready = await new Promise(resolve => {
      const socket = connect({ host: '127.0.0.1', port: 8755 });
      socket.setTimeout(200);
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('error', () => resolve(false));
      socket.once('timeout', () => { socket.destroy(); resolve(false); });
    });
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) { stop(1); throw Error('Reviewed ERP cost host did not start'); }
}
if (!stopping) launch(process.execPath, [fileURLToPath(new URL('../server.js', import.meta.url))]);
