import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const must = (condition, message) => { if (!condition) throw new Error(message); };

const layer = read("components/shell/ai/miwa-ai-layer.html");
const css = read("css/shell/miwa-ai-layer.css");
const js = read("js/shell/miwa-ai-layer.js");
const client = read("js/ai/ai-secretary-client.js");
const config = read("js/config/system-config.js");
const baseline = read("docs/BASELINE_V1.9.7_MIWA_AI_RENDER_HOTFIX_CANDIDATE.md");

must(layer.includes('data-miwa-ai-shell="flex-v1.9.7"'), "美和AI Panel未标记V1.9.7 Flex Shell");
must(layer.includes('class="miwa-ai-contextbar"') && layer.includes('class="miwa-ai-panel__body"') && layer.includes('class="miwa-ai-composer-shell"'), "美和AI四段式结构不完整");
must(css.includes('.miwa-ai-panel{') && css.includes('display:flex;flex-direction:column'), "美和AI Panel未切换为纵向Flex Shell");
must(css.includes('.miwa-ai-panel__body{flex:1 1 auto;min-height:0;overflow:auto'), "美和AI Body未建立稳定可滚动flex职责");
must(css.includes('.miwa-ai-composer-shell{flex:0 0 auto'), "美和AI Composer未固定在Flex Shell底部");
must(css.includes('[data-mode="workspace"] .miwa-ai-panel__body{display:grid'), "AI工作区内部双栏规则缺失");
must(js.includes('function validateLayerDOM()') && js.includes('Layer结构不完整'), "美和AI缺少运行时DOM完整性保护");
must(js.includes('当前Route解析失败，使用安全上下文'), "美和AI缺少Route安全回退");
must(js.includes('AI执行Client初始化失败') && js.includes('return false'), "AI Client异常未与UI渲染隔离");
must((config.includes('v1.9.7-miwa-ai-render-hotfix') || config.includes('v1.9.8-miwa-ai-entry-bridge-hotfix') || (config.includes('v1.9.9-miwa-ai-hard-entry-hotfix') || config.includes('v1.9.10-miwa-ai-self-healing-layer-hotfix') || config.includes('v1.9.11-miwa-ai-runtime-chain-verification')) || config.includes('v1.9.13-model-provider-layer') || (config.includes('v1.9.16-ai-proposal-bridge') || (config.includes('v1.9.17-ai-context-router') || (config.includes('v1.9.18-1688-source-api-bridge') || (config.includes('v1.9.19-1688-oauth-bridge') || config.includes('v1.9.20-1688-permanent-token-direct')))))), "系统资产版本未升级到V1.9.7");
must(client.includes('/api/v1/ai-secretary/status') && client.includes('/api/v1/ai-secretary/execute') && client.includes('/api/v1/ai-secretary/confirm'), "既有AI执行入口被破坏");
must(baseline.includes('不重新接AI') && baseline.includes('Header → Current Context → AI Body → Composer'), "V1.9.7修复基线文档不完整");

console.log("V1.9.7_MIWA_AI_RENDER_HOTFIX_VALIDATION_OK");
