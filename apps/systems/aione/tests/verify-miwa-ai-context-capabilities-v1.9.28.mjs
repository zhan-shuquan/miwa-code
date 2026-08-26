import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { executeMiwaCorporateRetrieval, resolveMiwaCorporateIntent } from "../backend/src/integrations/miwa-corporate-search.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const actor = { personId:"86000" };

const single = executeMiwaCorporateRetrieval("把最新的美和集团总架构给我", actor);
assert.ok(single);
assert.equal(single.intent.resultMode, "single");
assert.equal(single.items.length, 1, "明确对象请求必须只返回唯一最佳结果");
assert.equal(single.items[0].assetId, "army-architecture");

const aiTalent = executeMiwaCorporateRetrieval("找一下AI人才军团体系", actor);
assert.equal(aiTalent.items.length, 1);
assert.equal(aiTalent.items[0].assetId, "ai-talent-army");

const list = executeMiwaCorporateRetrieval("有哪些集团核心资料？", actor);
assert.equal(list.intent.resultMode, "list");
assert.equal(list.items.length, 10);

const related = executeMiwaCorporateRetrieval("关于AI人才有哪些相关资料？", actor);
assert.ok(related);
assert.ok(["list","related"].includes(related.intent.resultMode));
assert.ok(related.items.length >= 1 && related.items.length <= 5);
assert.equal(related.items[0].assetId, "ai-talent-army");

assert.equal(resolveMiwaCorporateIntent("经营架构有什么可以优化？"), null, "正常业务分析不能被资料检索劫持");

const quick = read("js/ai/ai-quick-intents.js");
assert.ok(quick.includes('company_find_assets') && quick.includes('company_analyze'));
assert.ok(quick.includes('recordQuickIntentUsage') && quick.includes('localStorage'));

const client = read("js/ai/ai-secretary-client.js");
assert.ok(client.includes('aione_miwa_company_content'));
assert.ok(client.includes('fourTransformations') && client.includes('operationLoop'));
assert.ok(client.includes('aione:miwa-ai:history:v1'));
assert.ok(client.includes('quickIntentPrompt'));

const layer = read("js/shell/miwa-ai-layer.js");
assert.ok(layer.includes('renderQuickIntents') && layer.includes('aione:miwa-ai-quick-intent'));
assert.ok(layer.includes('miwa-ai-quick-intents'));

const provider = read("backend/src/ai/openai-provider.js");
assert.ok(provider.includes('读取AIONE正式页面内容'));
assert.ok(provider.includes('AIONE已路由能力意图'));
assert.ok(provider.includes('经营闭环是否完整'));

const deploy = read("../../../infra/gcp/cloud-shell/05_DEPLOY_BACKEND_PRIVATE.sh");
const live = read("../../../infra/gcp/cloud-shell/RUN_E_ENABLE_LIVE_MIWAAI.sh");
const lib = read("../../../infra/gcp/cloud-shell/lib.sh");
assert.ok(deploy.includes('OPENAI_API_KEY') && deploy.includes('AIONE_AI_PROVIDER=${AI_PROVIDER}'));
assert.ok(live.includes('AIONE_AI_MODE="live"') && live.includes('02_BUILD_IMAGE.sh'));
assert.ok(lib.includes('OPENAI_API_KEY_SECRET') && lib.includes('_PRE_AIONE_AI_MODE'));

console.log("V1.9.28 美和AI上下文分析、快捷能力与精准检索专项验证通过");
