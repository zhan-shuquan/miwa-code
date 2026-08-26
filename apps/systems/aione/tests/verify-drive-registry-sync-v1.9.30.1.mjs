import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyManagedDriveFile } from "../backend/src/integrations/miwa-drive-file-classifier.js";
import { listMiwaCorporateRecords, resolveMiwaCorporateIntent, searchMiwaCorporateRecordList } from "../backend/src/integrations/miwa-corporate-search.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const folder = {
  folderId:"1IqqUAdkQL8-xfZz_chY4eT2wBqw37J8h",
  route:"company-management-architecture",
  sourceLabel:"美和之家 → 经营与战略 → 经营架构"
};

const strategic = classifyManagedDriveFile({
  id:"18azT7_d50gxlNxhP-mKo5jw7IDcKLYXU",
  name:"00_美和集团AI经营总架构_战略版_2026-08-26.png",
  mimeType:"image/png",
  webViewLink:"https://drive.google.com/file/d/18azT7_d50gxlNxhP-mKo5jw7IDcKLYXU/view",
  modifiedTime:"2026-08-26T06:00:00Z"
}, folder);
assert.ok(strategic);
assert.equal(strategic.title, "美和集团AI经营总架构");
assert.equal(strategic.type, "IMAGE");
assert.equal(strategic.version, "战略版｜2026-08-26");
assert.ok(strategic.downloadPath.includes("/drive-assets/synced/"));

const summary = classifyManagedDriveFile({
  id:"1DMSCJrUzJwIGrqGzVz-JC2yxMv3C2E-5",
  name:"01_美和集团AI经营总架构_阶段性总结_2026-08-13.docx",
  mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}, folder);
assert.equal(summary.type, "DOCX");
assert.ok(summary.title.includes("阶段性总结"));

const actor = { personId:"86000" };
const records = [strategic, summary, ...listMiwaCorporateRecords(actor)];
const objective = "帮我找00_美和集团AI经营总架构_战略版_2026-08-26.png的链接";
const intent = resolveMiwaCorporateIntent(objective);
assert.ok(intent);
assert.equal(intent.type, "IMAGE");
const matches = searchMiwaCorporateRecordList(records, objective, { requestContext:actor, type:intent.type, limit:5 });
assert.equal(matches[0].assetId, strategic.assetId);
assert.equal(matches[0].sourceUrl, strategic.sourceUrl);

const sync = read("backend/src/integrations/miwa-drive-registry-sync.js");
const liveSearch = read("backend/src/integrations/miwa-corporate-live-search.js");
const driveClient = read("backend/src/integrations/google-drive-client.js");
const routes = read("backend/src/routes/drive-assets.js");
const service = read("backend/src/ai/ai-secretary-service.js");
const tools = read("backend/src/ai/tool-registry.js");
const deploy = read("../../../infra/gcp/cloud-shell/RUN_E_ENABLE_LIVE_MIWAAI.sh");

assert.ok(sync.includes('source_system=$1') && sync.includes('google-drive-sync'), "Drive sync must persist into knowledge_routes");
assert.ok(sync.includes('folderId:"1IqqUAdkQL8-xfZz_chY4eT2wBqw37J8h"'), "management architecture folder must be managed");
assert.ok(driveClient.includes("listDriveFolderFiles"), "Drive client must support shared-drive folder listing");
assert.ok(liveSearch.includes("syncMiwaManagedDriveFolders") && liveSearch.includes("listSyncedDriveCorporateRecords"), "AI search must merge synced Drive records");
assert.ok(routes.includes('router.post("/sync"') && routes.includes('router.get("/synced/:assetId/download"'), "sync control and secure synced download routes are required");
assert.ok(service.includes("executeMiwaCorporateRetrievalWithDriveSync"), "deterministic AI retrieval must use live Drive sync");
assert.ok(tools.includes("searchMiwaCorporateRecordsWithDriveSync") && tools.includes('"IMAGE"'), "tool search must understand synced image assets");
const deployVersion = deploy.match(/AIONE_IMAGE_TAG[^\n]*v1\.9\.(\d+)(?:\.(\d+))?/);
assert.ok(deployVersion, "production deployment image tag missing");
const deployMinor = Number(deployVersion[1]);
const deployPatch = Number(deployVersion[2] || 0);
assert.ok(deployMinor > 30 || (deployMinor === 30 && deployPatch >= 1), "production deployment must be V1.9.30.1 or newer");

console.log("V1.9.30.1 Google Drive -> AIONE Registry sync validation passed.");
