import assert from "node:assert/strict";
import { executeMiwaCorporateRetrieval, resolveMiwaCorporateIntent, searchMiwaCorporateRecords } from "../backend/src/integrations/miwa-corporate-search.js";

const actor = { personId:"86000" };

function first(objective) {
  const result = executeMiwaCorporateRetrieval(objective, actor);
  assert.ok(result, `intent should resolve: ${objective}`);
  assert.ok(result.items.length, `result should not be empty: ${objective}`);
  return result;
}

const architecture = first("把最新的美和集团总架构给我");
assert.equal(architecture.items[0].assetId, "army-architecture");
assert.equal(architecture.items[0].type, "PPTX");
assert.equal(architecture.items[0].version, "V0.1");
assert.ok(architecture.items[0].downloadPath.includes("army-architecture"));

const aiTalent = first("找一下AI人才军团体系");
assert.equal(aiTalent.items[0].assetId, "ai-talent-army");

const commandMap = first("打开作战指挥关系图");
assert.equal(commandMap.intent.requestedAction, "open");
assert.equal(commandMap.items[0].assetId, "command-map");
assert.ok(commandMap.items[0].sourceUrl.includes("drive.google.com"));

const battleLoop = first("下载最新的经营闭环PDF");
assert.equal(battleLoop.intent.requestedAction, "download");
assert.equal(battleLoop.items[0].assetId, "battle-loop");
assert.equal(battleLoop.items[0].type, "PDF");

const list = first("有哪些集团核心资料？");
assert.equal(list.intent.requestedAction, "list");
assert.equal(list.items.length, 10);
assert.ok(list.items.every((item) => item.kind === "asset"));

const spirit = first("美和灵魂的正式内容在哪里？");
assert.equal(spirit.items[0].route, "company-spirit");
assert.equal(spirit.items[0].kind, "page");

assert.equal(resolveMiwaCorporateIntent("经营架构有什么可以优化？"), null, "normal corporate discussion must not be hijacked by deterministic file retrieval");

const unauthorized = searchMiwaCorporateRecords("集团总架构", { requestContext:{}, limit:5 });
assert.equal(unauthorized.length, 0, "internal corporate records must not be returned without an authenticated person context");

console.log("V1.9.27 美和AI企业资料检索专项验证通过");
