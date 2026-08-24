import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../../..");
const aione = path.resolve(__dirname, "..");

function must(condition, message) {
  if (!condition) throw new Error(message);
}
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

const modelPath = "contracts/data/aione-core-object-model.v1.json";
must(exists(modelPath), "缺少核心对象模型契约");
const model = JSON.parse(read(modelPath));
must(JSON.stringify(model.nineElements) === JSON.stringify(["goal","people","object","matter","platform","time","money","information","result"]), "美和9要素顺序发生变化");
for (const key of ["organization","business","position","assignment","workItem","workSession","workEvidence","moneyEvent","resultFact","businessEvent","knowledgeRoute","aiExecution"]) {
  must(model.objects[key], `缺少核心对象 ${key}`);
}

const migrations = [
  "data-code/migrations/0001_schema_migrations.sql",
  "data-code/migrations/0010_core_business_model.sql",
  "data-code/migrations/0020_work_time_money_result.sql",
  "data-code/migrations/0030_events_knowledge_ai.sql",
  "data-code/migrations/0040_legacy_bridge_notes.sql"
];
const allSql = migrations.map((file) => {
  must(exists(file), `缺少迁移 ${file}`);
  return read(file);
}).join("\n");
must(!/\b(DROP|TRUNCATE)\b/i.test(allSql), "V1.7迁移出现破坏性DROP/TRUNCATE");
for (const table of ["organizations","businesses","positions","assignments","object_registry","object_relations","work_items","work_sessions","work_evidence","money_events","result_facts","business_events","knowledge_routes","ai_executions"]) {
  must(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}\\b`, "i").test(allSql), `缺少表 ${table}`);
}
must(/CREATE OR REPLACE VIEW public\.v_person_daily_time_summary/i.test(allSql), "缺少人员每日时间汇总视图");
must(/public\.people remains the canonical person source/i.test(allSql), "未保护既有people主数据边界");
must(/product_opportunities/i.test(read("data-code/migrations/0040_legacy_bridge_notes.sql")), "未保留选品既有表兼容说明");

const packageJson = JSON.parse(fs.readFileSync(path.join(aione, "backend/package.json"), "utf8"));
must(packageJson.scripts?.["db:preflight"], "后端缺少数据库preflight命令");
must(packageJson.scripts?.["db:migrate"], "后端缺少数据库migrate命令");

const server = fs.readFileSync(path.join(aione, "backend/server.js"), "utf8");
must(server.includes('app.use("/api/v1", coreRouter)'), "未注册V1核心API");
must(server.includes('/api/product-opportunities'), "遗失选品Legacy API入口");
const coreRoute = fs.readFileSync(path.join(aione, "backend/src/routes/core.js"), "utf8");
for (const route of ["meta/object-model","time-summary","people/:personId/work-summary"]) {
  must(coreRoute.includes(route), `缺少API能力 ${route}`);
}
const coreModule = await import(new URL("../backend/src/core-model.js", import.meta.url));
const coreResourceNames = new Set([...Object.keys(coreModule.CORE_RESOURCES), ...Object.keys(coreModule.IMMUTABLE_FACT_RESOURCES)]);
for (const resource of ["organizations","businesses","positions","assignments","work-items","work-sessions","work-evidence","money-events","results","events","knowledge-routes","ai-executions"]) {
  must(coreResourceNames.has(resource), `缺少后端资源 ${resource}`);
}

must(exists("contracts/api/aione-core-v1.openapi.yaml"), "缺少OpenAPI契约");
must(exists("data-code/mappings/field-to-db.v1.json"), "缺少字段到数据库映射");
const mapping = JSON.parse(read("data-code/mappings/field-to-db.v1.json"));
must(mapping.mappings["work.timeEvidence"], "工作有效时间未映射到数据库事实");
must(mapping.mappings["selection_opportunity.*"], "选品成熟业务未保留Legacy映射");

console.log("V1.7_DATABASE_BACKEND_FOUNDATION_OK");
