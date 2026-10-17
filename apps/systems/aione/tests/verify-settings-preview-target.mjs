import assert from 'node:assert/strict';
import {resolveBackendTarget} from '../js/config/backend-preview-target.js';
const current='https://aione-backend-current-jjlnxogxta-an.a.run.app';
const target='https://candidate-abcdef1---aione-backend-current-jjlnxogxta-an.a.run.app';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'feat/shared-settings-center-20261015',AIONE_SETTINGS_PREVIEW_BACKEND_URL:target};
assert.deepEqual(resolveBackendTarget(env,current),{backendUrl:target,tokenAudience:current});
for(const patch of [{VERCEL_ENV:'production'},{VERCEL_ENV:'development'},{VERCEL_GIT_COMMIT_REF:'other'},{AIONE_SETTINGS_PREVIEW_BACKEND_URL:''}])assert.equal(resolveBackendTarget({...env,...patch},current).backendUrl,current);
for(const value of ['https://example.com',target+'?x=1',target+'/api',target+'#x',target.replace('https:','http:'),target.replace('current','other'),target.replace('https://','https://user:pass@')])assert.throws(()=>resolveBackendTarget({...env,AIONE_SETTINGS_PREVIEW_BACKEND_URL:value},current));
console.log('PASS preview bridge: branch/environment/host confinement, fixed IAM audience, fail-closed invalid URLs and unchanged production target');
