import { backfillSelectionPool } from "../src/services/selection-pool-service.js";
import { uploadJsonLimit } from "../src/services/selection-upload-policy.js";
import express from "express";
import pg from "pg";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, createHash } from "node:crypto";
import { createSelectionWorkspaceRouter } from "../src/routes/selection-workspace.js";
import { parameterFacts } from "../src/services/selection-workspace-contract.js";
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../../.."),
  appRoot = resolve(here, "../..");
if (process.env.NODE_ENV === "production")
  throw Error("Isolated preview cannot run in production");
const testPort = process.env.AIONE_TEST_DB_PORT || '55432';
if (!['55432','15432'].includes(testPort)) throw Error('Unsupported isolated database port');
const connectionString =
  `postgres://aione_test:isolated-local-test-only@127.0.0.1:${testPort}/aione_selection`;
// Never inherit a developer's production DATABASE_URL in this test launcher.
const pool = new pg.Pool({ connectionString });
// A minimal fresh test fixture with the existing canonical object's column contract.
// Production uses the existing table and migration only, never this bootstrap.
await pool.query(
  `CREATE TABLE IF NOT EXISTS product_opportunities(id TEXT PRIMARY KEY,source_platform TEXT NOT NULL,title TEXT NOT NULL,source_url TEXT,owner_person_id TEXT,created_by_person_id TEXT,record_version INT NOT NULL DEFAULT 1,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),archived_at TIMESTAMPTZ)`,
);
await pool.query(
  await readFile(
    resolve(root, "data-code/migrations/0200_selection_workspace.sql"),
    "utf8",
  ),
);
await pool.query(
  "CREATE TABLE IF NOT EXISTS people(id TEXT PRIMARY KEY, display_name TEXT)",
);
await pool.query(
  "INSERT INTO people(id,display_name) VALUES('test-employee','测试员工'),('test-partner','测试合伙人'),('test-admin','测试管理员') ON CONFLICT(id) DO NOTHING",
);
await pool.query(
  await readFile(
    resolve(root, "data-code/migrations/0201_selection_pool.sql"),
    "utf8",
  ),
);
await pool.query(
  "INSERT INTO people(id,display_name) VALUES('86990','选品负责人（测试）'),('86991','研究员工甲（测试）'),('86992','研究员工乙（测试）') ON CONFLICT(id) DO NOTHING",
);
await pool.query(
  'INSERT INTO selection_workspace_config(key,value) VALUES(\'pool-grants\',\'{"86990":{"collect":true,"manage":true,"assign":true}}\') ON CONFLICT(key) DO NOTHING',
);
await pool.query(
  "CREATE TABLE IF NOT EXISTS work_items(id TEXT PRIMARY KEY,title TEXT NOT NULL,work_type TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',owner_person_id TEXT,created_by_person_id TEXT,related_object_type TEXT,related_object_id TEXT,metadata JSONB NOT NULL DEFAULT '{}',created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now())",
);
await pool.query("ALTER TABLE work_items ADD COLUMN IF NOT EXISTS responsible_person_id TEXT, ADD COLUMN IF NOT EXISTS assigned_by_person_id TEXT, ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ");
await pool.query("CREATE TABLE IF NOT EXISTS work_evidence(id TEXT PRIMARY KEY,person_id TEXT,related_object_type TEXT,related_object_id TEXT,evidence_type TEXT NOT NULL,action_code TEXT,happened_at TIMESTAMPTZ NOT NULL DEFAULT now(),result_code TEXT,summary TEXT,payload JSONB NOT NULL DEFAULT '{}',created_at TIMESTAMPTZ NOT NULL DEFAULT now())");
await pool.query("ALTER TABLE work_evidence ADD COLUMN IF NOT EXISTS work_item_id TEXT");
await pool.query(await readFile(resolve(root,'data-code/migrations/0202_employee_master_cache.sql'),'utf8'));
await pool.query(await readFile(resolve(root,'data-code/migrations/0203_selection_upload_transport.sql'),'utf8'));
await pool.query(await readFile(resolve(root,'data-code/migrations/0204_selection_provenance.sql'),'utf8'));
await pool.query(await readFile(resolve(root,'data-code/migrations/0205_selection_product_files.sql'),'utf8'));
// Isolated fixtures only: never query or modify ERP personnel for UI regression.
await pool.query("INSERT INTO selection_workspace_config(key,value) VALUES('erp-employees',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value", [JSON.stringify({
  schemaVersion: 1, version: 'isolated-fixture', capturedAt: new Date().toISOString(), receivedAt: new Date().toISOString(),
  employees: [['86990','选品负责人（测试）','qmt'],['86991','研究员工甲（测试）','qat'],['86992','研究员工乙（测试）','qbt']].map(([memberId,name,prefix]) => ({employeeId:'FIXTURE-'+memberId,memberId,name,prefix,status:'Active',version:'isolated-fixture'}))
})]);
const backfill = await pool.connect();
try {
  await backfill.query("BEGIN");
  await backfillSelectionPool(backfill);
  await backfill.query("COMMIT");
} catch (e) {
  await backfill.query("ROLLBACK");
  throw e;
} finally {
  backfill.release();
}
const snapshot = JSON.parse(
  await readFile(resolve(root, ".local/erp-snapshot.json"), "utf8"),
);
if (process.env.AIONE_TEST_CHANNELS === '1')
  snapshot.selectionChannels = JSON.parse(await readFile(resolve(root,'.local/pool-v2-channels.json'),'utf8'));
snapshot.version = createHash("sha256")
  .update(parameterFacts(snapshot))
  .digest("hex");
snapshot.receivedAt = new Date().toISOString();
await pool.query(
  "INSERT INTO selection_workspace_config(key,value) VALUES('erp',$1) ON CONFLICT(key) DO NOTHING",
  [JSON.stringify(snapshot)],
);
if (process.env.AIONE_TEST_CHANNELS === '1')
  await pool.query("UPDATE selection_workspace_config SET value=jsonb_set(value,'{selectionChannels}',$1::jsonb) WHERE key='erp'", [JSON.stringify(snapshot.selectionChannels)]);
const app = express(),
  sessions = new Map();
app.disable("x-powered-by");
app.use(express.json({ limit: uploadJsonLimit }));
const accounts = {
  manager: {
    personId: "86990",
    subjectId: "86990",
    subjectType: "person",
    displayName: "选品负责人（测试）",
  },
  employeeA: {
    personId: "86991",
    subjectId: "86991",
    subjectType: "person",
    displayName: "研究员工甲（测试）",
  },
  employeeB: {
    personId: "86992",
    subjectId: "86992",
    subjectType: "person",
    displayName: "研究员工乙（测试）",
  },
  employee: {
    personId: "test-employee",
    subjectId: "test-employee",
    subjectType: "person",
    displayName: "测试员工",
  },
  partner: {
    personId: "test-partner",
    subjectId: "test-partner",
    subjectType: "person",
    displayName: "测试合伙人",
  },
  admin: {
    subjectId: "test-admin",
    subjectType: "admin",
    displayName: "测试管理员",
  },
};
app.post("/__preview/login", (req, res) => {
  const i = accounts[req.body.account];
  if (!i) return res.sendStatus(400);
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { ...i, identitySource: "isolated_test" });
  res.cookie("selection_preview", token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 8 * 3600000,
  });
  res.json({ ok: true });
});
app.use((req, res, next) => {
  const token = String(req.headers.cookie || "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("selection_preview="))
    ?.split("=")[1];
  req.aioneIdentity = sessions.get(token);
  next();
});
app.get("/__preview/identity", (req, res) =>
  req.aioneIdentity ? res.json(req.aioneIdentity) : res.sendStatus(401),
);
app.get("/api/v1/me", (req, res) =>
  req.aioneIdentity ? res.json(req.aioneIdentity) : res.sendStatus(401),
);
app.use(
  "/api/v1/selection-workspace",
  createSelectionWorkspaceRouter(pool, {
    allowTestIdentities: true,
    costUrl: process.env.ERP_COST_URL || "http://127.0.0.1:8755",
    connectorToken: process.env.AIONE_CONNECTOR_TOKEN,
    reviewedRuleHash: snapshot.rules.sha256,
    reviewedIdentificationHash: snapshot.identification?.sha256,
  }),
);
// No old writes, publishing, paid AI or general ERP API are reachable on this server.
app.use("/api", (req, res) =>
  res.status(403).json({ error: "此隔离预览仅开放选品API；其他业务未执行" }),
);
app.get("/preview", (_req, res) =>
  res.type("html").send(
    `<!doctype html><html lang="zh"><meta charset="utf-8"><title>AIONE 商品之家开发预览</title><style>body{font:16px system-ui;background:#f7f8f6;color:#234738;margin:8vh auto;max-width:650px}button{padding:14px 20px;margin:8px;border:1px solid #b9cbbf;border-radius:8px;background:white;cursor:pointer}h1{font-size:26px}</style><h1>美和AIONE · 商品之家开发预览</h1><p>独立测试数据；ERP历史参数待验证。正式发布与付费AI入口已在服务端关闭。</p><p>选择测试身份，验证个人数据隔离：</p>${Object.entries(
      accounts,
    )
      .map(
        ([id, i]) => `<button data-account="${id}">${i.displayName}</button>`,
      )
      .join(
        "",
      )}<script>document.onclick=async e=>{if(!e.target.dataset.account)return;await fetch('/__preview/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account:e.target.dataset.account})});location.href='/#/product-home';}</script></html>`,
  ),
);
app.get("/", async (req, res) => {
  if (!req.aioneIdentity) return res.redirect("/preview");
  let html = await readFile(resolve(appRoot, "index.html"), "utf8");
  html = html.replace(
    "<head>",
    "<head><script>window.AIONE_SELECTION_PREVIEW=true;</script>",
  );
  res.type("html").send(html);
});
// Serve only the existing public UI trees, not backend, test fixtures or rule exports.
for (const dir of [
  "js",
  "css",
  "components",
  "pages",
  "assets",
  "fonts",
  "images",
])
  app.use("/" + dir, express.static(resolve(appRoot, dir)));
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.statusCode || 500).json({
    error: err.code === "23505" ? "货号已存在，未重复创建" : err.message,
  });
});
app.listen(8765, "127.0.0.1", () =>
  console.log("AIONE isolated preview: http://127.0.0.1:8765/preview"),
);
