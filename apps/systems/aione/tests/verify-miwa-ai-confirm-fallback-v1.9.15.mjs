import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "../../..");
const readApp = (rel) => fs.readFileSync(path.join(appRoot, rel), "utf8");
const readRepo = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const config = readApp("js/config/system-config.js");
const service = readApp("backend/src/ai/ai-secretary-service.js");
const route = readApp("backend/src/routes/ai-secretary.js");
const client = readApp("js/ai/ai-secretary-client.js");
const launcher = readRepo("START_MIWA_AI_REAL_MODEL.ps1");
const baseline = readApp("docs/BASELINE_V1.9.15_MIWA_AI_CONFIRM_WRITE_FALLBACK.md");

must((config.includes("20260824-v1.9.16-ai-proposal-bridge") || (config.includes("20260824-v1.9.17-ai-context-router") || (config.includes("20260824-v1.9.18-1688-source-api-bridge") || (config.includes("20260824-v1.9.19-1688-oauth-bridge") || config.includes("20260824-v1.9.20-1688-permanent-token-direct"))))), "Asset version is not V1.9.15");
must(service.includes("getAISecretaryWriteRuntimeStatus"), "Write runtime status is missing");
must(service.includes("AIONE_ALLOW_LOCAL_WRITE_FALLBACK"), "Local write fallback flag is missing");
must(service.includes("database_or_local_preview") && service.includes("databaseConfigured"), "Persistence mode/database readiness is not separated from model mode");
must(service.includes("previewLocalAction") && service.includes("当前未同步正式数据库") && service.includes("localConfirmedWorkFallback"), "Local AIONE fallback result is incomplete");
must(!service.includes('if (runtime.mode === "preview") return { persisted:false'), "Write fallback is still incorrectly tied to model preview mode");
must(route.includes("getAISecretaryWriteRuntimeStatus"), "Runtime status endpoint does not expose write mode");
must(launcher.includes('$env:AIONE_ALLOW_LOCAL_WRITE_FALLBACK = "true"'), "Local real-model launcher does not enable safe local fallback");
must(client.includes("ai-secretary-confirmed-local") && client.includes("presentConfirmationResult"), "Frontend does not record confirmed local fallback into AIONE collaboration store");
must(client.includes("workbench:snapshot?.page?.routeId") && client.includes("route:snapshot?.page?.hash"), "Local confirmed work item loses page context");
must(baseline.includes("不得伪装为正式数据库成功"), "Baseline does not preserve truthful persistence semantics");

console.log("V1.9.15_MIWA_AI_CONFIRM_WRITE_FALLBACK_OK");
