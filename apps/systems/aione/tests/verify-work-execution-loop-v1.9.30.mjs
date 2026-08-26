import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const must=(c,m)=>{if(!c)throw new Error(m)};

const core=read("backend/src/routes/core.js");
const work=read("js/pages/miwa-work-home.js");
const context=read("js/ai/ai-context-router.js");
const capabilities=read("js/ai/ai-capability-registry.js");
const quick=read("js/ai/ai-quick-intents.js");
const layer=read("js/shell/miwa-ai-layer.js");
const provider=read("backend/src/ai/openai-provider.js");
const service=read("backend/src/ai/ai-secretary-service.js");
const deploy=read("../../../infra/gcp/cloud-shell/RUN_E_ENABLE_LIVE_MIWAAI.sh");

for(const route of [
  'router.get("/work-home/:id/execution"',
  'router.post("/work-home/:id/start"',
  'router.post("/work-home/:id/evidence"',
  'router.post("/work-home/:id/complete"',
  'router.post("/work-home/:id/approve"'
]) must(core.includes(route),`缺少工作执行接口 ${route}`);
must(core.includes("public.work_evidence")&&core.includes("public.result_facts"),"工作执行没有沉淀证据和结果事实");
must(core.includes('eventType:"work.started"')&&core.includes('eventType:"work.evidence_added"')&&core.includes('"work.completion_submitted"')&&core.includes('"work.completed"'),"工作执行事件链不完整");
must(core.includes('canSubmitCompletion: access.canExecute && ["in_progress","blocked"].includes(row.status)'),"提交完成没有强制经过执行状态");
must(work.includes("data-work-open")&&work.includes("data-work-action=\"start\"")&&work.includes("data-work-complete-form")&&work.includes("data-work-action=\"ai-review\""),"工作之家缺少执行详情、开始、完成或AI复盘动作");
must(work.includes("AIONEWorkExecutionContext")&&work.includes("aione:work-detail-context-change"),"工作详情没有注入美和AI上下文");
must(context.includes('type:"work_item"')&&context.includes("AIONEWorkExecutionContext")&&context.includes('work_item_execution_detail'),"AI Context Router没有识别工作事项执行上下文");
must(capabilities.includes('capability("work.execution_review"')&&capabilities.includes('capability("work.evidence_gap"'),"缺少工作复盘AI能力");
must(quick.includes('quick("work_review"')&&quick.includes('return "work"'),"缺少工作之家快捷意图");
must(layer.includes('aione:work-detail-context-change'),"美和AI Layer不会随工作详情上下文刷新");
must(provider.includes("work_evidence")&&provider.includes("result_facts")&&provider.includes("status=completed"),"Live模型缺少工作证据复盘约束");
must(service.includes("persistAIWorkReview")&&service.includes("ai_review_generated")&&service.includes("workReviewPersisted"),"AI复盘没有沉淀为工作复盘记录");
must(deploy.includes('v1.9.30')&&deploy.includes('工作之家 → 打开工作 → 开始执行'),"生产部署脚本尚未切到V1.9.30验收链");
console.log("V1.9.30 Work execution evidence + AI review loop validation passed.");
