import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "../../..");
const read = (relative) => fs.readFileSync(path.resolve(appRoot, relative), "utf8");
const readRepo = (relative) => fs.readFileSync(path.resolve(repoRoot, relative), "utf8");

const apiClient = read("js/services/aione-api-client.js");
assert.match(apiClient, /AUTH_SESSION_KEY\s*=\s*"aione\.preview\.session\.v3"/);
assert.match(apiClient, /headers\.Authorization\s*=\s*`Bearer \$\{googleIdToken\}`/);
assert.match(apiClient, /return "";\s*\}\s*export function setAioneApiBaseUrl/s);

const previewAuth = read("js/auth/preview-auth.js");
assert.match(previewAuth, /googleCredential:/);
assert.match(previewAuth, /googleExpiresAt/);
assert.match(previewAuth, /publicAuthSession/);
assert.match(previewAuth, /!session\.googleCredential/);
assert.doesNotMatch(previewAuth, /window\.AIONEPreviewAuthSession\s*=\s*\{[^}]*googleCredential/s);

const backendAuth = read("backend/src/http/google-auth.js");
assert.match(backendAuth, /verifyIdToken\(\{ idToken: token, audience: clientId \}\)/);
assert.match(backendAuth, /findGooglePreviewIdentityByEmail/);
assert.match(backendAuth, /req\.aioneIdentity\s*=\s*Object\.freeze/);
assert.match(backendAuth, /personId: identity\.subjectType === "person" \? identity\.subjectId : null/);

const context = read("backend/src/http/context.js");
assert.match(context, /AIONE_ALLOW_PREVIEW_ACTOR/);
assert.match(context, /authenticatedIdentity\.personId/);

const server = read("backend/server.js");
assert.match(server, /resolveAioneGoogleIdentity/);
assert.match(server, /Access-Control-Allow-Headers", "Authorization,/);

const backendPackage = JSON.parse(read("backend/package.json"));
assert.equal(backendPackage.dependencies["google-auth-library"], "11.0.2");

const vercelPackage = JSON.parse(read("package.json"));
assert.equal(vercelPackage.dependencies["@vercel/oidc"], "3.8.5");

const bridge = read("api/aione-bridge.js");
assert.match(bridge, /getVercelOidcToken\(\)/);
assert.match(bridge, /gcpStsAudience/);
assert.match(bridge, /`\/\/iam\.googleapis\.com\/projects\//);
assert.match(bridge, /x-serverless-authorization/);
assert.match(bridge, /"authorization"/);
assert.match(bridge, /providerIdForVercelToken/);
assert.match(bridge, /issuer === "https:\/\/oidc\.vercel\.com" \? "global" : "team"/);
assert.match(bridge, /generateIdToken/);
assert.match(bridge, /audience: env\.backendUrl/);
assert.match(bridge, /parsedBody = req\.body/);
assert.match(bridge, /JSON\.stringify\(parsedBody\)/);
assert.match(bridge, /upstream\.headers\.get\("location"\)/);

const vercel = JSON.parse(read("vercel.json"));
assert.equal(vercel.rewrites, undefined);
assert.ok(vercel.routes.some((item) => item.src.includes("backend") && item.status === 404));
assert.ok(vercel.routes.some((item) => item.src.includes("SHA256SUMS") && item.status === 404));
assert.ok(vercel.routes.some((item) => item.src.includes("/api/") && String(item.dest || "").includes("aione-bridge")));

const integrationRoute = read("backend/src/routes/integrations-1688.js");
const selectionDetail = read("pages/selection-workbench/record-detail/index.html");
assert.match(integrationRoute, /req\.query\?\.response[\s\S]*?authorizeUrl/);
assert.match(selectionDetail, /oauth\/start\?response=json/);
assert.match(selectionDetail, /window\.open\('about:blank'/);

const deploy = readRepo("infra/gcp/cloud-shell/05_DEPLOY_BACKEND_PRIVATE.sh");
assert.match(deploy, /--no-allow-unauthenticated/);
assert.match(deploy, /AIONE_REQUIRE_GOOGLE_AUTH=true/);
assert.match(deploy, /AIONE_ALLOW_PREVIEW_ACTOR=false/);

const setup = readRepo("infra/gcp/cloud-shell/07_SETUP_VERCEL_OIDC_BRIDGE.sh");
assert.match(setup, /TEAM_PROVIDER_ID="\$\{WIF_PROVIDER_ID\}-team"/);
assert.match(setup, /GLOBAL_PROVIDER_ID="\$\{WIF_PROVIDER_ID\}-global"/);
assert.match(setup, /roles\/iam\.serviceAccountOpenIdTokenCreator/);
assert.match(setup, /roles\/run\.invoker/);
assert.match(setup, /EXPECTED_SUBJECT="owner:\$\{VERCEL_TEAM_SLUG\}:project:\$\{VERCEL_PROJECT_NAME\}:environment:\$\{VERCEL_ENVIRONMENT\}"/);

const lib = readRepo("infra/gcp/cloud-shell/lib.sh");
assert.match(lib, /AIONE_IMAGE_TAG:-v1\.9\.21/);
const fastPath = readRepo("infra/gcp/cloud-shell/RUN_C_SUBDOMAIN_BRIDGE.sh");
assert.match(fastPath, /02_BUILD_IMAGE\.sh/);
assert.match(fastPath, /05_DEPLOY_BACKEND_PRIVATE\.sh/);
assert.match(fastPath, /07_SETUP_VERCEL_OIDC_BRIDGE\.sh/);
assert.match(fastPath, /06_SMOKE_TEST\.sh/);

// Keep the temporary server registry aligned with the browser preview registry.
const frontendPairs = [...read("js/config/preview-identities.js").matchAll(/subjectId:\s*"([^"]+)"[\s\S]*?email:\s*"([^"]+)"/g)]
  .map((match) => `${match[1]}|${match[2].toLowerCase()}`);
const backendPairs = [...read("backend/src/auth/google-preview-identity-registry.js").matchAll(/subjectId:\s*"([^"]+)",\s*email:\s*"([^"]+)"/g)]
  .map((match) => `${match[1]}|${match[2].toLowerCase()}`);
assert.deepEqual([...new Set(backendPairs)].sort(), [...new Set(frontendPairs)].sort());

console.log("V1.9.21 subdomain secure API bridge static verification passed.");
