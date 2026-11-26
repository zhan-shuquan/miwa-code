import { backfillSelectionPool } from "../src/services/selection-pool-service.js";
import { uploadJsonLimit } from "../src/services/selection-upload-policy.js";
import express from "express";
import { OAuth2Client } from "google-auth-library";
import { authConfig } from "../../js/config/auth-config.js";
import { resolveCanonicalGoogleIdentity } from "../src/auth/canonical-google-identity.js";
import pg from "pg";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, createHash } from "node:crypto";
import { createSelectionWorkspaceRouter } from "../src/routes/selection-workspace.js";
import { parameterFacts } from "../src/services/selection-workspace-contract.js";
const development = JSON.parse(await readFile(new URL("../config/local-development.json",import.meta.url),"utf8"));
const developmentURL = new URL(development.origin);
if (developmentURL.hostname !== "127.0.0.1") throw Error("Local-only development origin required");
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../../.."),
  appRoot = resolve(here, "../..");
if (process.env.NODE_ENV === "production")
  throw Error("Isolated preview cannot run in production");
const connectionString =
  "postgres://aione_test:isolated-local-test-only@127.0.0.1:55432/aione_employee_dev";
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
// Existing identity migrations register login identities, not employee master records.
const initialized=(await pool.query("SELECT to_regclass('public.person_login_emails') AS t")).rows[0].t;
if (!initialized) for (const name of ['0005_identity_foundation.sql','0006_canonical_people_bootstrap.sql','0007_person_login_emails.sql'])
  await pool.query(await readFile(resolve(root,'data-code/migrations',name),'utf8'));
await pool.query(await readFile(resolve(root,'data-code/migrations/0201_selection_pool.sql'),'utf8'));
await pool.query(
  "CREATE TABLE IF NOT EXISTS work_items(id TEXT PRIMARY KEY,title TEXT NOT NULL,work_type TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',owner_person_id TEXT,created_by_person_id TEXT,related_object_type TEXT,related_object_id TEXT,metadata JSONB NOT NULL DEFAULT '{}',created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now())",
);
await pool.query(await readFile(resolve(root,'data-code/migrations/0202_employee_master_cache.sql'),'utf8'));
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
snapshot.version = createHash("sha256")
  .update(parameterFacts(snapshot))
  .digest("hex");
snapshot.receivedAt = new Date().toISOString();
await pool.query(
  "INSERT INTO selection_workspace_config(key,value) VALUES('erp',$1) ON CONFLICT(key) DO NOTHING",
  [JSON.stringify(snapshot)],
);
const app = express(),
  sessions = new Map();
app.disable("x-powered-by");
app.use(express.json({ limit: uploadJsonLimit }));
const google=new OAuth2Client(authConfig.googleClientId);
const cookieName='aione_employee_dev';
app.post('/auth/google',async(req,res,next)=>{
  try {
    if (req.headers.origin !== development.origin) return res.sendStatus(403);
    const ticket=await google.verifyIdToken({idToken:req.body.credential,audience:authConfig.googleClientId});
    const verified=ticket.getPayload();
    if (!verified?.email_verified) return res.sendStatus(401);
    const identity=await resolveCanonicalGoogleIdentity({subject:verified.sub,email:verified.email},pool);
    if (!identity) return res.status(403).json({error:'此Google身份尚未关联已授权的美和会员'});
    const token=randomBytes(32).toString('hex');
    sessions.set(token,{identity,expires:Date.now()+8*3600000});
    res.cookie(cookieName,token,{httpOnly:true,sameSite:'strict',maxAge:8*3600000});
    res.json({ok:true});
  } catch(e){res.status(401).json({error:'Google身份验证失败，请重新登录'});}
});
app.use((req,res,next)=>{
  const token=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.split('=')[1];
  const session=sessions.get(token);
  if (session && session.expires>Date.now()) req.aioneIdentity=session.identity;
  else if (session) sessions.delete(token);
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
    allowTestIdentities: false,
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
app.get('/login',(_req,res)=>res.type('html').send(`<!doctype html><html lang="zh"><meta charset="utf-8"><title>AIONE · 员工关联开发验收</title><style>body{font:16px system-ui;max-width:580px;margin:12vh auto;color:#234738}h1{font-size:25px}#message{color:#9b2626}</style><h1>美和AIONE · 员工关联开发验收</h1><p>使用已关联美和会员的Google账号登录。</p><div id="google"></div><p id="message" role="status"></p><script src="https://accounts.google.com/gsi/client" async defer></script><script>window.onload=()=>{google.accounts.id.initialize({client_id:${JSON.stringify(authConfig.googleClientId)},callback:async r=>{const response=await fetch('/auth/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({credential:r.credential})});const data=await response.json();if(response.ok)location.href='/#/talent-home?section=my-profile';else document.getElementById('message').textContent=data.error;}});google.accounts.id.renderButton(document.getElementById('google'),{theme:'outline',size:'large'});};</script></html>`));
app.get("/", async (req, res) => {
  if (!req.aioneIdentity) return res.redirect("/login");
  let html = await readFile(resolve(appRoot, "index.html"), "utf8");
  html = html.replace(
    "<head>",
    "<head><script>window.AIONE_SELECTION_PREVIEW=true;window.AIONE_AUTHENTICATED_DEVELOPMENT=true;</script>",
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
app.listen(Number(developmentURL.port), developmentURL.hostname, () =>
  console.log("AIONE authenticated development: " + development.origin + "/login"),
);
