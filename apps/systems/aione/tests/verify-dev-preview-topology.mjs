import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const baseline = read("../../../../infra/gcp/cloud-shell/CURRENT_BASELINE.sh");
const deploy = read("../../../../infra/gcp/cloudbuild/deploy-current.yaml");
const previewDeploy = read("../../../../infra/gcp/cloudbuild/deploy-preview.yaml");
const bridge = read("../api/aione-bridge.js");

assert.match(baseline, /AIONE_DEV_ORIGIN="https:\/\/dev\.aione\.miwa-happyhouse\.com"/);
assert.match(baseline, /AIONE_RUN_SERVICE="aione-backend-current"/);
assert.match(baseline, /AIONE_SQL_INSTANCE="aione-pg-dev"/);
assert.match(baseline, /AIONE_DB_PASSWORD_SECRET="aione-db-password-dev"/);
assert.match(bridge, /CURRENT_BACKEND_URL = "https:\/\/aione-backend-current-jjlnxogxta-an\.a\.run\.app"/);
assert.match(bridge, /vercelEnv === "preview"/);
assert.match(bridge, /process\.env\.AIONE_PREVIEW_BACKEND_URL/);
assert.match(bridge, /process\.env\.AIONE_PREVIEW_BACKEND_AUDIENCE/);
assert.match(bridge, /aione_preview_backend_not_configured/);
assert.match(bridge, /backendUrl: CURRENT_BACKEND_URL, backendAudience: CURRENT_BACKEND_URL/);
assert.doesNotMatch(bridge, /AIONE_PREVIEW_BACKEND_URL[^\n]+\|\|[^\n]+CURRENT_BACKEND_URL/);
assert.match(deploy, /AIONE_CORS_ORIGINS=\$\$\{AIONE_PRODUCTION_ORIGIN\},\$\$\{AIONE_DEV_ORIGIN\}/);
assert.doesNotMatch(deploy, /AIONE_TEST_ORIGIN/);
assert.match(previewDeploy, /_PREVIEW_SERVICE: aione-backend-preview/);
assert.match(previewDeploy, /_SQL_INSTANCE: aione-pg-dev/);
assert.match(previewDeploy, /selection:intake:schema:preflight/);
assert.match(previewDeploy, /--no-allow-unauthenticated/);
assert.doesNotMatch(previewDeploy, /aione-backend-current/);
assert.doesNotMatch(previewDeploy, /db:migrate|update-traffic/);

console.log("Production -> CURRENT backend and Preview -> configured Preview backend topology PASS.");
