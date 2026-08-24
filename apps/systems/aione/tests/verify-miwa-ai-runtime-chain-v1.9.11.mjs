import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "../../..");
const readApp = (rel) => fs.readFileSync(path.join(appRoot, rel), "utf8");
const readRepo = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const client = readApp("js/ai/ai-secretary-client.js");
const layer = readApp("js/shell/miwa-ai-layer.js");
const config = readApp("js/config/system-config.js");
const route = readApp("backend/src/routes/ai-secretary.js");
const service = readApp("backend/src/ai/ai-secretary-service.js");
const baseline = readApp("docs/BASELINE_V1.9.11_MIWA_AI_RUNTIME_CHAIN_VERIFICATION.md");
const cmd = readRepo("START_MIWA_AI_RUNTIME_AND_VERIFY.cmd");
const runtimePs1 = readRepo("START_MIWA_AI_RUNTIME_AND_VERIFY.ps1");
const verifyPs1 = readRepo("VERIFY_MIWA_AI_RUNTIME.ps1");

must(config.includes("20260824-v1.9.11-miwa-ai-runtime-chain-verification") || (config.includes("20260824-v1.9.16-ai-proposal-bridge") || (config.includes("20260824-v1.9.17-ai-context-router") || (config.includes("20260824-v1.9.18-1688-source-api-bridge") || (config.includes("20260824-v1.9.19-1688-oauth-bridge") || config.includes("20260824-v1.9.20-1688-permanent-token-direct"))))), "System asset version is below V1.9.11");
must(client.includes("/api/v1/ai-secretary/status") && client.includes("/api/v1/ai-secretary/execute") && client.includes("/api/v1/ai-secretary/confirm"), "Frontend AI runtime endpoints are incomplete");
must(client.includes("refreshStatus:loadRuntimeStatus"), "Frontend does not expose runtime status refresh");
must(layer.includes("window.AIONEAISecretary?.refreshStatus?.()"), "MIWA AI does not refresh Backend status when reopened");
must(route.includes('router.get("/status"') && route.includes('router.post("/execute"') && route.includes('router.post("/confirm"'), "Backend status/execute/confirm routes are incomplete");
must(service.includes("confirmAISecretaryProposal") && service.includes("human") && service.includes("previewLocalAction"), "Human confirmation / preview write boundary changed");
must(cmd.includes("START_MIWA_AI_RUNTIME_AND_VERIFY.ps1"), "Windows CMD wrapper does not delegate to the runtime PowerShell launcher");
must(runtimePs1.includes("START_AI_SECRETARY_PREVIEW.ps1") && runtimePs1.includes("VERIFY_MIWA_AI_RUNTIME.ps1"), "PowerShell runtime launcher is incomplete");
must(verifyPs1.includes("/api/v1/ai-secretary/status") && verifyPs1.includes("/api/v1/ai-secretary/execute") && verifyPs1.includes("/api/v1/ai-secretary/confirm"), "PowerShell end-to-end verification endpoints are incomplete");
must(verifyPs1.includes("x-aione-person-id") && verifyPs1.includes("86000"), "Runtime verification lacks local human actor context");
must(verifyPs1.includes("\\u521b\\u5efa\\u5de5\\u4f5c"), "Runtime verification no longer creates a human-confirmation proposal objective");
must(baseline.includes("STATUS") && baseline.includes("EXECUTE") && baseline.includes("HUMAN CONFIRM"), "V1.9.11 baseline does not record the complete runtime chain");

console.log("V1.9.11_MIWA_AI_RUNTIME_CHAIN_VALIDATION_OK");
