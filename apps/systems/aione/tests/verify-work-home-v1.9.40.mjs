import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../../../../");
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const must=(ok,message)=>{if(!ok)throw new Error(message);};
const migration=read("data-code/migrations/0070_work_home_v2_assignment_and_batch.sql");
const core=read("apps/systems/aione/backend/src/routes/core.js");
const model=read("apps/systems/aione/backend/src/core-model.js");
const ai=read("apps/systems/aione/backend/src/ai/ai-secretary-service.js");
const tool=read("apps/systems/aione/backend/src/ai/tool-registry.js");
const page=read("apps/systems/aione/js/pages/miwa-work-home.js");
const routes=read("apps/systems/aione/js/config/route-registry.js");
const sidebar=read("apps/systems/aione/js/config/sidebar-registry.js");

for(const field of ["assigned_by_person_id","responsible_person_id","verifier_person_id"]) must(migration.includes(field),`missing role field ${field}`);
must(migration.includes("CREATE TABLE IF NOT EXISTS public.work_seeds")&&migration.includes("CREATE TABLE IF NOT EXISTS public.work_proposals"),"Work Seed / Proposal persistence missing");
must(core.includes('router.post("/work-home/batch/seeds"')&&core.includes('router.post("/work-home/batch/:batchId/approve"'),"batch endpoints missing");
must(core.includes("COALESCE(w.responsible_person_id,w.owner_person_id)")&&core.includes("assigned_by_person_id=$1"),"same Work role-aware query missing");
must(model.includes('responsiblePersonId: "responsible_person_id"')&&model.includes('assignedByPersonId: "assigned_by_person_id"'),"core model roles missing");
must(ai.includes("responsible_person_id,assigned_by_person_id,verifier_person_id"),"AI confirmation still conflates creator and responsible person");
must(tool.includes("responsiblePersonId")&&tool.includes("assignedByPersonId")&&tool.includes("verifierPersonId"),"AI proposal role contract missing");
must(routes.includes('"work-assigned"')&&routes.includes('"work-batch"')&&sidebar.includes("批量安排工作"),"Work Home routes missing");
must(page.includes("function responsiblePersonId")&&page.includes('id==="work-assigned"')&&page.includes("function workNineHtml"),"role-aware frontend missing");
must(page.includes("WORKBENCH_LABELS")&&page.includes("OBJECT_TYPE_LABELS"),"internal codes are not mapped to business semantics");
must(page.includes("工作安排（必填）")&&page.includes("WORK SEED")&&page.includes("批量批准并派发"),"batch seed UI missing");
must(page.includes('completed:"已闭环"')&&page.includes('in_progress:"执行中"'),"formal Work status labels regressed");

console.log("V1.9.40 Work Home assignment and batch baseline passed.");
