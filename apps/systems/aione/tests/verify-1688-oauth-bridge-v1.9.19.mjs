import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build1688AuthorizationUrl } from '../backend/src/integrations/alibaba1688-client.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const aioneRoot = path.resolve(here, '..');
const repoRoot = path.resolve(aioneRoot, '../../..');
const read = (relative) => fs.readFileSync(path.join(aioneRoot, relative), 'utf8');
const must = (condition, message) => { if (!condition) throw new Error(message); };

const oldKey = process.env.ALIBABA_1688_APP_KEY;
const oldSecret = process.env.ALIBABA_1688_APP_SECRET;
const oldRedirect = process.env.ALIBABA_1688_REDIRECT_URI;
try {
  process.env.ALIBABA_1688_APP_KEY = '12345678';
  process.env.ALIBABA_1688_APP_SECRET = 'test-secret-never-leak';
  process.env.ALIBABA_1688_REDIRECT_URI = 'http://127.0.0.1:8080/api/v1/integrations/1688/oauth/callback';
  const auth = build1688AuthorizationUrl({ state: 'state-123' });
  const u = new URL(auth.url);
  must(u.origin === 'https://auth.1688.com', '1688 OAuth authorization host mismatch');
  must(u.pathname === '/oauth/authorize', '1688 OAuth authorization path mismatch');
  must(u.searchParams.get('client_id') === '12345678', 'OAuth client_id missing');
  must(u.searchParams.get('site') === '1688', 'OAuth site missing');
  must(u.searchParams.get('response_type') === 'code', 'OAuth response_type missing');
  must(u.searchParams.get('state') === 'state-123', 'OAuth CSRF state missing');
  must(u.searchParams.get('redirect_uri') === process.env.ALIBABA_1688_REDIRECT_URI, 'OAuth redirect URI mismatch');
  must(!auth.url.includes('test-secret-never-leak'), 'AppSecret leaked into OAuth authorization URL');
} finally {
  if (oldKey === undefined) delete process.env.ALIBABA_1688_APP_KEY; else process.env.ALIBABA_1688_APP_KEY = oldKey;
  if (oldSecret === undefined) delete process.env.ALIBABA_1688_APP_SECRET; else process.env.ALIBABA_1688_APP_SECRET = oldSecret;
  if (oldRedirect === undefined) delete process.env.ALIBABA_1688_REDIRECT_URI; else process.env.ALIBABA_1688_REDIRECT_URI = oldRedirect;
}

const client = read('backend/src/integrations/alibaba1688-client.js');
must(client.includes('grant_type: "authorization_code"'), 'authorization code token exchange missing');
must(client.includes('need_refresh_token: "true"'), 'refresh token request missing');
must(client.includes('tokenCache?.refreshToken'), 'session refresh token reuse missing');

const route = read('backend/src/routes/integrations-1688.js');
must(route.includes('router.get("/oauth/start"'), 'OAuth start route missing');
must(route.includes('router.get("/oauth/callback"'), 'OAuth callback route missing');
must(route.includes('crypto.randomBytes(24)'), 'OAuth state must be random');
must(route.includes('exchange1688AuthorizationCode'), 'OAuth callback does not exchange code');

const page = read('pages/selection-workbench/record-detail/index.html');
must(page.includes("authorize:{label:'授权1688'"), 'selection page has no conditional authorize state');
must(page.includes('/api/v1/integrations/1688/oauth/start'), 'selection page does not launch 1688 OAuth');
must(page.includes("event?.data?.type !== 'aione:1688-oauth'"), 'selection page does not receive OAuth completion message');

const envExample = read('backend/.env.example');
must(envExample.includes('ALIBABA_1688_AUTHORIZE_URL=https://auth.1688.com/oauth/authorize'), 'authorize URL env template missing');
must(envExample.includes('ALIBABA_1688_REDIRECT_URI=http://127.0.0.1:8080/api/v1/integrations/1688/oauth/callback'), 'redirect URI env template missing');

const config = read('js/config/system-config.js');
must((config.includes('20260824-v1.9.19-1688-oauth-bridge') || config.includes('20260824-v1.9.20-1688-permanent-token-direct')), 'asset version is not V1.9.19 OAuth bridge');

const launcher = fs.readFileSync(path.join(repoRoot, 'START_MIWA_AI_REAL_MODEL.ps1'));
must(launcher[0] === 0xef && launcher[1] === 0xbb && launcher[2] === 0xbf, 'PowerShell launcher lost UTF-8 BOM');
const launcherText = launcher.toString('utf8');
must(launcherText.includes('ALIBABA_1688_ACCESS_TOKEN'), 'launcher does not support direct authorized token');
must(!/Set-Content|Out-File/.test(launcherText), 'launcher must not persist secrets');

console.log('PASS V1.9.19 1688 OAuth bridge');
