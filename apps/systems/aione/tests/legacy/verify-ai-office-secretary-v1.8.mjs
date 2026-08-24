import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here=path.dirname(fileURLToPath(import.meta.url));
const aione=path.resolve(here,"..");
const root=path.resolve(aione,"../../..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const readA=(p)=>fs.readFileSync(path.join(aione,p),"utf8");
const exists=(p)=>fs.existsSync(path.join(root,p));
const must=(c,m)=>{if(!c)throw new Error(m)};

const routes=readA("js/config/route-registry.js");
const system=readA("js/miwa-system.js");
const defs=readA("js/config/business-page-definitions-extra.js");
const offices=readA("js/config/ai-office-registry.js");
const aside=readA("components/shell/aside/aside.html");
const client=readA("js/ai/ai-secretary-client.js");
const fieldRegistry=readA("js/config/field-registry.js");

must(routes.includes('route("ai-office", "AI办公室"'),"缺少AI办公室Route");
must(system.includes('"ai-office"'),"AI办公室未进入标准业务母版路由集合");
must(defs.includes('routeId:"ai-office",title:"AI办公室"'),"缺少AI办公室标准业务页面定义");
must(fieldRegistry.includes('"ai-office":"ai_office"')&&fieldRegistry.includes('"ai-office": Object.freeze(['),"AI办公室字段Schema缺失");
for(const name of ["会长兼董事长AI办公室","跨境负责人AI办公室","批发负责人AI办公室","运营岗位AI办公室","采购岗位AI办公室","设计岗位AI办公室","客服岗位AI办公室"])must(offices.includes(name),`缺少预设岗位AI办公室：${name}`);
must(offices.includes('subjectId === "86000"')&&offices.includes('status: "验证中"'),"首个验证者未绑定会长兼董事长AI办公室");

must(aside.includes('data-ai-office-link')&&aside.includes('data-ai-office-name'),"右侧AI秘书未连接岗位AI办公室");
must(aside.includes('id="ai-secretary-send"')&&!aside.includes('AI执行接口待接入'),"AI秘书命令入口仍是旧占位状态");
must(aside.includes('今天最重要的三件事'),"缺少第一验证指令");
must(client.includes('/api/v1/ai-secretary/execute')&&client.includes('/api/v1/ai-secretary/confirm'),"前端未接AI秘书Backend接口");
must(client.includes('getCollaborationData')&&client.includes('getNotifications'),"AI秘书未汇总工作/通知上下文");
must(client.includes('nineElements: ["目标","人","物","事","平台","时间","钱","信息","结果"]'),"AI秘书上下文未保持9要素固定顺序");

for(const file of [
  "apps/systems/aione/backend/src/ai/office-registry.js",
  "apps/systems/aione/backend/src/ai/tool-registry.js",
  "apps/systems/aione/backend/src/ai/openai-provider.js",
  "apps/systems/aione/backend/src/ai/preview-provider.js",
  "apps/systems/aione/backend/src/ai/ai-secretary-service.js",
  "apps/systems/aione/backend/src/routes/ai-secretary.js"
]) must(exists(file),`缺少AI秘书Backend模块 ${file}`);
const server=read("apps/systems/aione/backend/server.js");
must(server.includes('app.use("/api/v1/ai-secretary", aiSecretaryRouter)'),"AI秘书Router未注册");
must(server.includes("AIONE_CORS_ORIGINS"),"本地5500->8080预演CORS未配置");
const toolRegistry=read("apps/systems/aione/backend/src/ai/tool-registry.js");
for(const t of ["get_context_snapshot","get_work_snapshot","get_calendar_snapshot","get_notifications_snapshot","get_backend_work_summary","list_backend_open_work","search_knowledge_routes","propose_create_work_item"])must(toolRegistry.includes(`\"${t}\"`),`缺少AIONE Tool ${t}`);
must(!toolRegistry.includes('tool("create_work_item"'),"模型工具层不应直接暴露写入create_work_item");
const provider=read("apps/systems/aione/backend/src/ai/openai-provider.js");
must(provider.includes("/responses")&&provider.includes("function_call_output")&&provider.includes("previous_response_id"),"OpenAI Responses API Tool Loop不完整");
must(provider.includes("美和9要素")&&provider.includes("propose_create_work_item"),"AI秘书系统指令/人类确认边界不完整");
const service=read("apps/systems/aione/backend/src/ai/ai-secretary-service.js");
must(service.includes("AIONE_AI_MODE")&&service.includes("OPENAI_API_KEY"),"AI Provider配置缺失");
must(service.includes("confirmAISecretaryProposal")&&service.includes("requestContext?.personId"),"写入动作缺少人类确认身份检查");

const migration="data-code/migrations/0050_ai_office_orchestration.sql";
must(exists(migration),"缺少0050 AI办公室迁移");
const sql=read(migration);
for(const table of ["ai_talents","ai_offices","ai_assignments"])must(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`).test(sql),`缺少${table}表`);
must(sql.includes("会长兼董事长AI办公室")&&sql.includes("AI秘书"),"AI办公室首批预设数据缺失");
must(!/\b(DROP|TRUNCATE)\b/i.test(sql),"0050出现破坏性DDL");

const core=await import(new URL("../backend/src/core-model.js", import.meta.url));
for(const resource of ["ai-talents","ai-offices","ai-assignments"])must(core.CORE_RESOURCES[resource],`后端Core Resource缺少 ${resource}`);
const contract=JSON.parse(read("contracts/data/aione-core-object-model.v1.json"));
for(const key of ["aiTalent","aiOffice","aiAssignment","aiExecution"])must(contract.objects[key],`数据契约缺少 ${key}`);
const openapi=read("contracts/api/aione-core-v1.openapi.yaml");
for(const route of ["/ai-talents:","/ai-offices:","/ai-assignments:","/ai-secretary/status:","/ai-secretary/execute:","/ai-secretary/confirm:"])must(openapi.includes(route),`OpenAPI缺少 ${route}`);

console.log("V1.8_AI_OFFICE_SECRETARY_VALIDATION_OK");
