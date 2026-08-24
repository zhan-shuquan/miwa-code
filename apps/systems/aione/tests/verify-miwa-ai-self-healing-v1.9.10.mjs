import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const must = (condition, message) => { if (!condition) throw new Error(message); };

const layerJs = read('js/shell/miwa-ai-layer.js');
const config = read('js/config/system-config.js');
const system = read('js/miwa-system.js');
const index = read('index.html');

must((config.includes('20260824-v1.9.10-miwa-ai-self-healing-layer-hotfix') || config.includes('20260824-v1.9.11-miwa-ai-runtime-chain-verification') || config.includes('v1.9.13-model-provider-layer') || (config.includes('v1.9.16-ai-proposal-bridge') || (config.includes('v1.9.17-ai-context-router') || (config.includes('v1.9.18-1688-source-api-bridge') || (config.includes('v1.9.19-1688-oauth-bridge') || config.includes('v1.9.20-1688-permanent-token-direct')))))), 'System Config未升级V1.9.10资产版本');
must((system.includes('miwa-ai-layer.js?v=20260824-v1.9.10-miwa-ai-self-healing-layer-hotfix') || system.includes('miwa-ai-layer.js?v=20260824-v1.9.11-miwa-ai-runtime-chain-verification') || system.includes('v1.9.13-model-provider-layer') || system.includes('v1.9.16-ai-proposal-bridge') || system.includes('v1.9.17-ai-context-router')), '系统入口未加载V1.9.10美和AI模块');
must((index.includes('miwa-ai-layer.css?v=20260824-v1.9.10-miwa-ai-self-healing-layer-hotfix') || index.includes('miwa-ai-layer.css?v=20260824-v1.9.11-miwa-ai-runtime-chain-verification') || index.includes('v1.9.13-model-provider-layer') || index.includes('v1.9.16-ai-proposal-bridge') || index.includes('v1.9.17-ai-context-router')), 'index未显式加载V1.9.10 AI CSS');
must(layerJs.includes('const REQUIRED_LAYER_IDS'), '缺少美和AI必要DOM清单');
must(layerJs.includes('const LAYER_BODY_TEMPLATE'), '缺少美和AI正文自愈模板');
must(layerJs.includes('function repairLayerStructure()'), '缺少美和AI正文自愈函数');
must(layerJs.includes('panel.insertAdjacentHTML("beforeend", LAYER_BODY_TEMPLATE)'), '自愈函数未重建AI正文与Composer');
must(layerJs.includes('root.dataset.miwaAiRepaired = "true"'), '自愈成功未写入诊断标记');
must(layerJs.includes('repairLayerStructure();\n\n  let enhanced = false;'), '打开Layer后未优先执行正文自愈');
for (const id of ['miwa-ai-current-context','miwa-ai-current-route','miwa-ai-suggestion-grid','ai-secretary-runtime-status','ai-secretary-thread','ai-secretary-command-input','ai-secretary-send']) {
  must(layerJs.includes(id), `自愈模板缺少必要节点：${id}`);
}
console.log('V1.9.10_MIWAAI_SELF_HEALING_LAYER_OK');
