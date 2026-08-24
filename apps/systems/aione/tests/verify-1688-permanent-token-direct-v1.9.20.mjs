import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSigned1688Request, get1688RuntimeStatus } from '../backend/src/integrations/alibaba1688-client.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const aioneRoot = path.resolve(here, '..');
const repoRoot = path.resolve(aioneRoot, '../../..');
const read = (relative) => fs.readFileSync(path.join(aioneRoot, relative), 'utf8');
const must = (condition, message) => { if (!condition) throw new Error(message); };

const keys = ['ALIBABA_1688_APP_KEY','ALIBABA_1688_APP_SECRET','ALIBABA_1688_ACCESS_TOKEN','ALIBABA_1688_TOKEN_MODE'];
const old = Object.fromEntries(keys.map(k => [k, process.env[k]]));
try {
  process.env.ALIBABA_1688_APP_KEY = '12345678';
  process.env.ALIBABA_1688_APP_SECRET = 'secret-never-leak';
  process.env.ALIBABA_1688_ACCESS_TOKEN = 'permanent-token-test';
  process.env.ALIBABA_1688_TOKEN_MODE = 'static';
  const status = get1688RuntimeStatus();
  must(status.configured === true, 'direct token runtime should be configured');
  must(status.ready === true, 'direct token runtime should be ready');
  must(status.authorized === true, 'direct token runtime should be authorized');
  must(status.tokenMode === 'static_access_token', 'runtime should report static access token');
  must(status.missing.length === 0, 'no direct token settings should be missing');

  const signed = buildSigned1688Request({
    appKey: process.env.ALIBABA_1688_APP_KEY,
    appSecret: process.env.ALIBABA_1688_APP_SECRET,
    accessToken: process.env.ALIBABA_1688_ACCESS_TOKEN,
    params: { productId: '826154588274' }
  });
  must(signed.body.access_token === 'permanent-token-test', 'signed request did not use direct access token');
  must(signed.body.productId === '826154588274', 'signed request lost offer id');
  must(String(signed.url).includes('_aop_signature='), 'signed request has no AOP signature');
  must(!String(signed.url).includes('secret-never-leak'), 'AppSecret leaked into URL');

  delete process.env.ALIBABA_1688_ACCESS_TOKEN;
  const missing = get1688RuntimeStatus();
  must(missing.configured === false, 'static mode without token must not be configured');
  must(missing.ready === false, 'static mode without token must not be ready');
  must(missing.missing.includes('ALIBABA_1688_ACCESS_TOKEN'), 'missing token was not reported');
} finally {
  for (const key of keys) {
    if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key];
  }
}

const launcher = fs.readFileSync(path.join(repoRoot, 'START_MIWA_AI_REAL_MODEL.ps1'));
must(launcher[0] === 0xef && launcher[1] === 0xbb && launcher[2] === 0xbf, 'PowerShell launcher lost UTF-8 BOM');
const launcherText = launcher.toString('utf8');
must(launcherText.includes('Read-Host "ALIBABA_1688_ACCESS_TOKEN" -AsSecureString'), 'launcher does not securely request permanent Access Token');
must(launcherText.includes('$env:ALIBABA_1688_TOKEN_MODE = "static"'), 'launcher does not force direct-token mode');
must(launcherText.includes('AppKey/AppSecret/Access Token loaded; permanent-token direct mode'), 'launcher status does not identify direct-token mode');
must(!/Set-Content|Out-File/.test(launcherText), 'launcher must not persist secrets');

const page = read('pages/selection-workbench/record-detail/index.html');
must(page.includes('1688 Backend \\u5c1a\\u672a\\u8f7d\\u5165\\u6c38\\u4e45 Access Token'), 'selection page has no direct-token guidance');
must(!page.includes("if(code === 'alibaba_1688_authorization_required' || code === 'alibaba_1688_access_token_required'){\n        setAutoFillButtonState('authorize')"), 'selection page still routes token failures into OAuth');

const envExample = read('backend/.env.example');
must(envExample.includes('ALIBABA_1688_TOKEN_MODE=static'), 'env template is not direct-token mode');
must(envExample.includes('ALIBABA_1688_ACCESS_TOKEN='), 'env template has no permanent token field');

const config = read('js/config/system-config.js');
must(config.includes('20260824-v1.9.20-1688-permanent-token-direct'), 'asset version is not V1.9.20 direct token');

console.log('PASS V1.9.20 1688 permanent-token direct bridge');
