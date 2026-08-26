import assert from 'node:assert/strict';
import fs from 'node:fs';
import { searchMiwaCorporateRecords } from '../backend/src/integrations/miwa-corporate-search.js';
import { resolveSelectedPlanItems } from '../backend/src/ai/proposal-selection.js';

const actor = { personId:'86000' };

const management = searchMiwaCorporateRecords('美和集团AI经营总架构', { requestContext:actor, limit:3 });
assert.ok(management.length >= 1, 'AI经营总架构 should be retrievable');
assert.equal(management[0].title, '美和集团AI经营总架构');
assert.equal(management[0].kind, 'page');

const execution = searchMiwaCorporateRecords('美和集团AI执行总架构', { requestContext:actor, limit:3 });
assert.ok(execution.length >= 1, 'AI执行总架构 should be retrievable');
assert.equal(execution[0].title, '美和集团AI执行总架构');
assert.equal(execution[0].assetId, 'army-architecture');
assert.equal(execution[0].sourceName, '00_美和集团AI执行总架构_V0.1.pptx');

const historical = searchMiwaCorporateRecords('美和集团现代企业军团总架构', { requestContext:actor, limit:3 });
assert.ok(historical.length >= 1, 'historical alias should remain retrievable');
assert.equal(historical[0].assetId, 'army-architecture');
assert.equal(historical[0].title, '美和集团AI执行总架构');

const contextSnapshot = {
  page:{ routeId:'company-management-architecture', title:'美和集团AI经营总架构', hash:'#/company-management-architecture' },
  conversationContext:[
    { type:'message', role:'assistant', content:'优化清单：\n1. 建立战略目标到工作事项的纵向贯通\n2. 明确经营指标责任人\n3. 把确定性规则函数化\n4. 建立异常升级机制\n5. 建立真实验证指标\n6. 补充版本状态管理' }
  ]
};
const selected = resolveSelectedPlanItems('把第1、3、5项安排下去', contextSnapshot);
assert.deepEqual(selected.map((x) => x.index), [1,3,5]);
assert.match(selected[0].text, /战略目标/);
assert.match(selected[1].text, /规则函数化/);
assert.match(selected[2].text, /真实验证指标/);

const quickIntents = fs.readFileSync(new URL('../js/ai/ai-quick-intents.js', import.meta.url), 'utf8');
assert.match(quickIntents, /company_optimization_list/);

const client = fs.readFileSync(new URL('../js/ai/ai-secretary-client.js', import.meta.url), 'utf8');
assert.match(client, /conversationContext/);

const toolRegistry = fs.readFileSync(new URL('../backend/src/ai/tool-registry.js', import.meta.url), 'utf8');
assert.match(toolRegistry, /routeId:page/);
assert.match(toolRegistry, /objectType/);

const service = fs.readFileSync(new URL('../backend/src/ai/ai-secretary-service.js', import.meta.url), 'utf8');
assert.match(service, /confirmedByHuman:true/);
assert.match(service, /related_object_type/);
assert.match(service, /sourceRoute/);

console.log('V1.9.29 architecture naming + proposal execution verification passed.');
