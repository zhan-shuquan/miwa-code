import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const aione=path.resolve(here,"..");
const root=path.resolve(aione,"../../..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const exists=(p)=>fs.existsSync(path.join(root,p));
const must=(c,m)=>{if(!c)throw new Error(m)};

for(const file of [
  "Dockerfile",
  ".dockerignore",
  "infra/gcp/cloud-shell/lib.sh",
  "infra/gcp/cloud-shell/00_DISCOVER.sh",
  "infra/gcp/cloud-shell/01_PREPARE_RUNTIME.sh",
  "infra/gcp/cloud-shell/02_BUILD_IMAGE.sh",
  "infra/gcp/cloud-shell/03_DB_PREFLIGHT.sh",
  "infra/gcp/cloud-shell/04_DB_MIGRATE.sh",
  "infra/gcp/cloud-shell/05_DEPLOY_BACKEND_PRIVATE.sh",
  "infra/gcp/cloud-shell/06_SMOKE_TEST.sh",
  "infra/gcp/cloud-shell/RUN_A_PREPARE_AND_PREFLIGHT.sh",
  "infra/gcp/cloud-shell/RUN_B_MIGRATE_AND_DEPLOY.sh"
]) must(exists(file),`缺少V1.9云端运行资产 ${file}`);

const docker=read("Dockerfile");
must(docker.includes("node:24-bookworm-slim"),"Docker Node基线未锁定");
must(docker.includes("COPY data-code/migrations/ /app/data-code/migrations/"),"容器未包含Migration资产");
must(!/OPENAI_API_KEY\s*=|DB_PASS\s*=\s*[^$<]/.test(docker),"Dockerfile疑似硬编码Secret");

const lib=read("infra/gcp/cloud-shell/lib.sh");
must(lib.includes('SOURCE_RUN_SERVICE="${AIONE_SOURCE_RUN_SERVICE:-aione-backend}"'),"未保留现有aione-backend作为只读发现源");
must(lib.includes('RUN_SERVICE="${AIONE_RUN_SERVICE:-aione-backend-v190}"'),"V1.9未使用隔离的Cloud Run验证服务");
must(lib.includes("DB_PASSWORD_SECRET"),"未从Secret Manager映射DB密码");

const prepare=read("infra/gcp/cloud-shell/01_PREPARE_RUNTIME.sh");
must(prepare.includes("gcloud sql backups create"),"数据库迁移前缺少Cloud SQL备份");
must(prepare.includes("roles/cloudsql.client"),"Runtime服务账号缺少Cloud SQL Client授权步骤");
must(prepare.includes("roles/secretmanager.secretAccessor"),"Runtime服务账号缺少Secret访问授权步骤");

const preflight=read("infra/gcp/cloud-shell/03_DB_PREFLIGHT.sh");
must(preflight.includes("db:preflight")&&preflight.includes("--max-retries=0"),"Preflight Job配置不完整");

const migrate=read("infra/gcp/cloud-shell/04_DB_MIGRATE.sh");
must(migrate.includes('Type MIGRATE AIONE')&&migrate.includes('db:migrate'),"Migration缺少人工确认或执行命令");
must(migrate.includes("--max-retries=0"),"Migration Job不应自动重试DDL");

const deploy=read("infra/gcp/cloud-shell/05_DEPLOY_BACKEND_PRIVATE.sh");
must(deploy.includes("--no-allow-unauthenticated"),"真实数据Backend必须默认私有");
must(deploy.includes("AIONE_ALLOW_PREVIEW_ACTOR=false")&&deploy.includes("AIONE_ALLOW_SYSTEM_WRITES=false"),"云端不应启用本地Preview身份/系统写入");
must(deploy.includes("AIONE_AI_MODE=${AI_MODE}"),"云端AI模式未显式配置");

const smoke=read("infra/gcp/cloud-shell/06_SMOKE_TEST.sh");
must(smoke.includes("gcloud auth print-identity-token")&&smoke.includes("/health")&&smoke.includes("/api/v1/ai-secretary/status"),"私有Cloud Run Smoke Test不完整");

const preflightJs=read("apps/systems/aione/backend/scripts/preflight.js");
for(const t of ["people","external_identities","product_opportunities","activity_logs","schema_migrations","ai_offices"])must(preflightJs.includes(`\"${t}\"`),`DB Preflight缺少 ${t}`);
must(preflightJs.includes("existingMinimalRowCounts")&&preflightJs.includes("appliedMigrations"),"DB Preflight报告缺少行数/Migration状态");

const pkg=JSON.parse(read("apps/systems/aione/backend/package.json"));
must(["0.4.0","0.5.0"].includes(pkg.version),"Backend版本低于0.4.0");
must(pkg.dependencies.express==="5.1.0"&&pkg.dependencies.pg==="8.16.3","生产依赖未固定精确版本");

console.log("V1.9_CLOUD_DATA_RUNTIME_FOUNDATION_OK");
