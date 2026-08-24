import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const repoRoot = path.resolve(appRoot, "../../..");
const readApp = (rel) => fs.readFileSync(path.join(appRoot, rel), "utf8");
const readRepo = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const registry = readApp("backend/src/ai/model-provider-registry.js");
const service = readApp("backend/src/ai/ai-secretary-service.js");
const provider = readApp("backend/src/ai/openai-provider.js");
const tools = readApp("backend/src/ai/tool-registry.js");
const client = readApp("js/ai/ai-secretary-client.js");
const envExample = readApp("backend/.env.example");
const startPs1 = readRepo("START_MIWA_AI_REAL_MODEL.ps1");
const startCmd = fs.readFileSync(path.join(repoRoot, "START_MIWA_AI_REAL_MODEL.cmd"));
const verifyCmd = fs.readFileSync(path.join(repoRoot, "VERIFY_MIWA_AI_REAL_MODEL.cmd"));
const startPs1Buffer = fs.readFileSync(path.join(repoRoot, "START_MIWA_AI_REAL_MODEL.ps1"));
const verifyPs1Buffer = fs.readFileSync(path.join(repoRoot, "VERIFY_MIWA_AI_REAL_MODEL.ps1"));
const verifyPs1 = readRepo("VERIFY_MIWA_AI_REAL_MODEL.ps1");
const config = readApp("js/config/system-config.js");

must((config.includes("20260824-v1.9.16-ai-proposal-bridge") || (config.includes("20260824-v1.9.17-ai-context-router") || (config.includes("20260824-v1.9.18-1688-source-api-bridge") || (config.includes("20260824-v1.9.19-1688-oauth-bridge") || config.includes("20260824-v1.9.20-1688-permanent-token-direct"))))), "Asset version is not V1.9.13");
must(registry.includes("LIVE_PROVIDERS") && registry.includes("runModelProvider") && registry.includes("getModelProviderRuntimeStatus"), "Unified Model Provider Layer is incomplete");
must(registry.includes("AIONE_AI_PROVIDER") && registry.includes("provider_not_configured"), "Provider selection/fallback contract is missing");
must(service.includes("runModelProvider") && !service.includes('from "./openai-provider.js"'), "AI orchestration still depends directly on OpenAI provider");
must(provider.includes("/responses") && provider.includes("OPENAI_API_KEY"), "OpenAI Responses API provider is incomplete");
must(tools.includes("get_current_page_business_context"), "Current-page business context tool is missing");
must(client.includes("buildCurrentPageBusinessContext") && client.includes("getSelectionMetrics") && client.includes("businessContext"), "Selection workbench data is not entering AI context");
must(envExample.includes("AIONE_AI_MODE=preview") && envExample.includes("AIONE_AI_PROVIDER=openai"), "Provider-neutral env template is incomplete");
must(startPs1.includes('Read-Host "OPENAI_API_KEY" -AsSecureString'), "Real-model launcher does not hide API key input");
must(startPs1.includes('$env:AIONE_AI_MODE = "live"') && startPs1.includes('$env:AIONE_AI_PROVIDER = "openai"'), "Real-model launcher does not select live OpenAI provider");
must(!startPs1.includes("Set-Content") && !startPs1.includes("Out-File"), "Real-model launcher must not persist API key to a file");
must(verifyPs1.includes('$status.mode -ne "openai"') && verifyPs1.includes('$status.provider -ne "openai"'), "Real-model status verifier is incomplete");
must(![...startCmd].some((b) => b > 0x7f), "Real-model CMD wrapper must remain ASCII");
must(startCmd.toString("ascii").includes("\r\n"), "Real-model CMD wrapper must use CRLF");
must(![...verifyCmd].some((b) => b > 0x7f) && verifyCmd.toString("ascii").includes("\r\n"), "Real-model verifier CMD must remain ASCII + CRLF");
for (const [name, buffer] of [["START_MIWA_AI_REAL_MODEL.ps1", startPs1Buffer], ["VERIFY_MIWA_AI_REAL_MODEL.ps1", verifyPs1Buffer]]) {
  must(buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf, `${name} must use UTF-8 BOM`);
  must(buffer.toString("utf8").includes("\r\n"), `${name} must use CRLF`);
}

const frontendFiles = ["index.html", "js/ai/ai-secretary-client.js", "js/shell/miwa-ai-layer.js", "js/miwa-system.js"];
for (const rel of frontendFiles) {
  const text = readApp(rel);
  must(!/sk-[A-Za-z0-9_-]{16,}/.test(text), `Potential API key leaked into frontend: ${rel}`);
}

console.log("V1.9.13_MODEL_PROVIDER_LAYER_OK");
