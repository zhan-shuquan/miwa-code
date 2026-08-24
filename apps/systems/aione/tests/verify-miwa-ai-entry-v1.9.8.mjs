import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const layerJs = read("js/shell/miwa-ai-layer.js");
const system = read("js/miwa-system.js");
const config = read("js/config/system-config.js");
const index = read("index.html");
const client = read("js/ai/ai-secretary-client.js");
const baseline = read("docs/BASELINE_V1.9.8_MIWA_AI_ENTRY_BRIDGE_HOTFIX_CANDIDATE.md");

must(layerJs.includes('const ENTRY_SELECTOR = "#desktop-miwa-ai-entry,#mobile-miwa-ai-entry"'), "Desktop/Mobile美和AI入口未统一桥接");
must(layerJs.includes('document.addEventListener("click", handleDelegatedClick, true)'), "美和AI入口未使用capture级全局事件委托");
must(layerJs.trim().endsWith("installGlobalEntryBridge();"), "美和AI事件桥未在模块加载时立即安装");
must(!layerJs.includes("initialized = true;\n  if (!validateLayerDOM())"), "初始化失败仍可能永久锁死");
must(layerJs.includes("MutationObserver") && layerJs.includes("waitForLayerAndOpen"), "AI Layer延迟挂载时缺少自动重试");
must(system.includes('const initShellModule = (name, fn) =>') && system.includes('initShellModule("美和AI", () => initMiwaAILayer())'), "Shell初始化未隔离，美和AI仍可能被前序模块阻断");
must((config.includes("20260824-v1.9.8-miwa-ai-entry-bridge-hotfix") || (config.includes("20260824-v1.9.9-miwa-ai-hard-entry-hotfix") || config.includes("20260824-v1.9.10-miwa-ai-self-healing-layer-hotfix") || config.includes("20260824-v1.9.11-miwa-ai-runtime-chain-verification")) || (config.includes("20260824-v1.9.16-ai-proposal-bridge") || (config.includes("20260824-v1.9.17-ai-context-router") || (config.includes("20260824-v1.9.18-1688-source-api-bridge") || (config.includes("20260824-v1.9.19-1688-oauth-bridge") || config.includes("20260824-v1.9.20-1688-permanent-token-direct")))))), "System Config未升级V1.9.8缓存版本");
must((index.includes("20260824-v1.9.8-miwa-ai-entry-bridge-hotfix") || (index.includes("20260824-v1.9.9-miwa-ai-hard-entry-hotfix") || index.includes("20260824-v1.9.10-miwa-ai-self-healing-layer-hotfix") || index.includes("20260824-v1.9.11-miwa-ai-runtime-chain-verification")) || (index.includes("20260824-v1.9.16-ai-proposal-bridge") || index.includes("20260824-v1.9.17-ai-context-router"))), "index资源版本未升级V1.9.8");
must(client.includes('/api/v1/ai-secretary/status') && client.includes('/api/v1/ai-secretary/execute') && client.includes('/api/v1/ai-secretary/confirm'), "原AI Backend执行入口被破坏");
must(baseline.includes("不重新接AI") && baseline.includes("事件委托桥接"), "V1.9.8基线说明不完整");
console.log("V1.9.8_MIWA_AI_ENTRY_BRIDGE_VALIDATION_OK");
