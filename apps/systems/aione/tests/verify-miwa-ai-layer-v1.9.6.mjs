import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const desktop = read("components/shell/header/desktop-header.html");
const mobile = read("components/shell/header/mobile-topbar.html");
const layer = read("components/shell/ai/miwa-ai-layer.html");
const layerCss = read("css/shell/miwa-ai-layer.css");
const layerJs = read("js/shell/miwa-ai-layer.js");
const aside = read("components/shell/aside/aside.html");
const system = read("js/miwa-system.js");
const config = read("js/config/system-config.js");
const index = read("index.html");
const aiClient = read("js/ai/ai-secretary-client.js");
const baseline = read("docs/BASELINE_V1.9.6_MIWA_AI_LAYER_CANDIDATE.md");

const searchPos = desktop.indexOf('id="desktop-search-input"');
const aiPos = desktop.indexOf('id="desktop-miwa-ai-entry"');
const noticePos = desktop.indexOf('data-header-route="notifications"');
const helpPos = desktop.indexOf('aria-label="帮助中心"');
const settingsPos = desktop.indexOf('data-header-route="settings"');
must(searchPos >= 0 && searchPos < aiPos && aiPos < noticePos && noticePos < helpPos && helpPos < settingsPos, "Desktop Header顺序不是 全局搜索→美和AI→通知→帮助→设置");
must(mobile.indexOf('id="mobile-search-button"') < mobile.indexOf('id="mobile-miwa-ai-entry"'), "Mobile美和AI未位于搜索之后");
must(mobile.indexOf('id="mobile-miwa-ai-entry"') < mobile.indexOf('data-header-route="notifications"'), "Mobile美和AI未位于通知之前");

must(index.includes('id="miwa-ai-layer-host"'), "App Shell缺少独立美和AI Host");
must(config.includes('["miwa-ai-layer-host", versionedComponent("./components/shell/ai/miwa-ai-layer.html")]'), "System Config未加载独立美和AI组件");
must((config.includes('v1.9.6-miwa-ai-layer-candidate') || config.includes('v1.9.7-miwa-ai-render-hotfix') || config.includes('v1.9.8-miwa-ai-entry-bridge-hotfix') || (config.includes('v1.9.9-miwa-ai-hard-entry-hotfix') || config.includes('v1.9.10-miwa-ai-self-healing-layer-hotfix') || config.includes('v1.9.11-miwa-ai-runtime-chain-verification')) || config.includes('v1.9.13-model-provider-layer') || (config.includes('v1.9.16-ai-proposal-bridge') || (config.includes('v1.9.17-ai-context-router') || (config.includes('v1.9.18-1688-source-api-bridge') || (config.includes('v1.9.19-1688-oauth-bridge') || config.includes('v1.9.20-1688-permanent-token-direct')))))), "系统版本低于V1.9.6美和AI独立层基线");
must(system.includes('import { initMiwaAILayer }') && (system.includes('initMiwaAILayer();') || system.includes('initShellModule("美和AI", () => initMiwaAILayer())')), "Global Shell未初始化独立美和AI Layer");

must(layer.includes('id="miwa-ai-layer"') && layer.includes('data-mode="drawer"'), "美和AI Drawer结构缺失");
must(layer.includes('data-miwa-ai-action="toggle-workspace"'), "AI工作区扩展入口缺失");
must(layer.includes('data-miwa-ai-action="open-office"') && layer.includes('进入AI办公室'), "AI办公室升级入口缺失");
must(layer.includes('id="miwa-ai-current-context"') && layer.includes('id="miwa-ai-suggestion-grid"'), "美和AI上下文/能力推荐结构缺失");
must(layer.includes('id="ai-secretary-command-input"') && (layer.includes('技能/工具') || layer.includes('能力自动匹配')), "美和AI Composer结构缺失");
must(layer.includes('miwa-ai-brand-mark__core'), "美和AI专属M智核标记缺失");

must(layerCss.includes('.miwa-ai-layer[data-mode="workspace"]') && layerCss.includes('.miwa-ai-header-entry'), "美和AI Layer / Header入口视觉规则缺失");
must((layerJs.includes('const SUGGESTIONS') || layerJs.includes('routeAIONEAIContext')) && layerJs.includes('renderContext()'), "美和AI未按当前Route/Context生成能力推荐");
must(layerJs.includes('window.location.hash = "#/ai-office"'), "AI办公室路由升级未接入");
must(layerJs.includes('initAISecretaryClient()'), "美和AI Layer未复用现有AI执行Client");

must(!aside.includes('ai-secretary') && !aside.includes('AI秘书') && !aside.includes('美和AI'), "Aside重新混入AI核心交互");
must(aiClient.includes('/api/v1/ai-secretary/execute') && aiClient.includes('/api/v1/ai-secretary/confirm'), "既有AI Backend执行链被破坏");
must(aiClient.includes('label.textContent = role === "user" ? "我" : "美和AI"'), "AI前端消息身份未升级为美和AI");

must(baseline.includes('美和AI → AI工作区 → AI办公室') && baseline.includes('全局搜索 → 美和AI → 通知 → 帮助 → 设置'), "V1.9.6基线文档不完整");

console.log("V1.9.6_MIWA_AI_LAYER_VALIDATION_OK");
