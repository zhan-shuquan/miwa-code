import { parseSupplierFile } from '../services/selection-sku-file.js';
import { completeShortName, completeSkuAttributes } from '../services/selection-recognition.js';
import { requestProductFiles } from '../services/selection-product-files.js';
import { confirmSpecifications } from '../services/selection-specifications.js';
import { createEmployeeMaster } from "../services/employee-master.js";
import { mountUploadTransport, CHUNK_BYTES } from "../services/selection-upload-transport.js";
import { fetchSelectionImage } from "../services/selection-remote-image.js";
import {
  get1688RuntimeStatus,
  fetch1688ProductByUrl,
} from "../integrations/alibaba1688-client.js";
import { createSelectionERPCommands } from "./selection-erp-commands.js";
import { createSelectionPoolRouter } from "./selection-pool.js";
import {
  findDuplicate,
  ensureSelectionNo,
  intakeOnce,
  checkPurchaseSource,
  registerKeys,
  syncResearchTask,
  requestFormalNumber,
} from "../services/selection-pool-service.js";
import { uploadPolicy } from "../services/selection-upload-policy.js";
import { imageDerivative } from "../services/selection-image-preview.js";
import {
  reconcileCosts,
  assertReconciled,
} from "../services/selection-cost-reconciliation.js";
import { Router } from "express";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { isDeepStrictEqual } from "node:util";
import {
  readQuickWorkbook,
  quickWorkbook,
  skuWorkbook,
} from "../services/selection-file-contract.js";
import {
  BINDINGS,
  confirmationIssues,
  fieldsFor,
  defaultLayout,
  validateLayout,
  validateData,
  parameterFacts,
  fail,
} from "../services/selection-workspace-contract.js";

const digest = (v) => createHash("sha256").update(v).digest("hex");
const admin = (i) =>
  i?.subjectType === "admin" &&
  ["legacy_admin_bridge", "isolated_test"].includes(i.identitySource);
export function createSelectionWorkspaceRouter(
  pool,
  {
    allowTestIdentities = false,
    costUrl,
    connectorToken,
    reviewedRuleHash,
    reviewedIdentificationHash,
  } = {},
) {
  const router = Router();
  const run = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (e) {
      next(e);
    }
  };
  const tx = async (fn) => {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const r = await fn(c);
      await c.query("COMMIT");
      return r;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  };
  const config = async (key) =>
    (
      await pool.query(
        "SELECT value FROM selection_workspace_config WHERE key=$1",
        [key],
      )
    ).rows[0]?.value;
  const putConfig = async (key, value, c = pool) =>
    c.query(
      "INSERT INTO selection_workspace_config(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2,version=selection_workspace_config.version+1,updated_at=now()",
      [key, JSON.stringify(value)],
    );
  const employees = createEmployeeMaster({pool,config,putConfig,allowTestIdentities});
  const employeeTable = allowTestIdentities ? "(SELECT id,display_name FROM aione_employee_directory UNION ALL SELECT id,display_name FROM people WHERE NOT EXISTS (SELECT 1 FROM aione_employee_directory e WHERE e.id=people.id)) AS employee_names" : "aione_employee_directory";
  const snapshot = async () => {
    const s = await config("erp");
    if (!s) fail("ERP参数尚未同步", 503);
    return s;
  };
  const person = (req) => req.aioneIdentity?.personId;
  const actor = (req) => person(req) || req.aioneIdentity?.subjectId || "admin";
  const auth = (req, res, next) => {
    if (!person(req) && !admin(req.aioneIdentity))
      return res.status(401).json({ error: "请登录有效人员账号" });
    next();
  };
  const requireAdmin = (req) => {
    if (!admin(req.aioneIdentity)) fail("需要管理员权限", 403);
  };
  const integration = (req, res, next) => {
    const value = String(req.headers["x-aione-connector-token"] || "");
    if (
      !connectorToken ||
      Buffer.byteLength(value) !== Buffer.byteLength(connectorToken) ||
      !timingSafeEqual(Buffer.from(value), Buffer.from(connectorToken))
    )
      return res.status(401).json({ error: "connector_identity_required" });
    next();
  };
  const row = async (req, id, c = pool, lock = false) => {
    const r = (
      await c.query(
        `SELECT *, (SELECT display_name FROM ${employeeTable} WHERE id=product_opportunities.created_by_person_id) AS selector_name, (SELECT display_name FROM ${employeeTable} WHERE id=product_opportunities.owner_person_id) AS owner_name FROM product_opportunities WHERE id=$1 AND selection_workspace IS NOT NULL AND ($2::boolean OR owner_person_id=$3) ${lock ? "FOR UPDATE" : ""}`,
        [
          id,
          admin(req.aioneIdentity) ||
            !!req.selectionManager ||
            req.poolAssetWrite === id,
          person(req) || "",
        ],
      )
    ).rows[0];
    if (!r) fail("记录不存在或无权访问", 404);
    return r;
  };
  const event = (c, req, r, action, detail = {}) =>
    c.query(
      "INSERT INTO selection_workspace_events(selection_id,actor_id,action,version,detail) VALUES($1,$2,$3,$4,$5)",
      [r.id, actor(req), action, r.record_version, JSON.stringify(detail)],
    );
  const researchIds = (r) => r.selection_workspace.researchAssetIds || [];
  const productAssets = (r, assets) =>
    assets.filter((a) => !researchIds(r).includes(a.id));
  const view = (r) => ({
    erpStatus: r.erp_job_status || "not_submitted",
    id: r.id,
    selectionNo: r.selection_no,
    sourcePlatform:
      r.selection_workspace.pool?.source?.platform || r.source_platform,
    owner: r.owner_person_id,
    selector: r.created_by_person_id,
    selectorEmployeeId: r.selector_employee_id,
    ownerEmployeeId: r.owner_employee_id,
    selectionDate: r.selection_date,
    selectorName: r.selector_name || null,
    ownerName: r.owner_name || null,
    version: r.record_version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    archived: !!r.archived_at,
    ...r.selection_workspace,
  });
  const calculate = async (data, s) => {
    if (!costUrl) fail("同源计算服务未配置", 503);
    const response = await fetch(costUrl + "/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        snapshot: s,
        values: { ...data, doctype: "Item" },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok) fail(result.error || "ERP规则计算失败", 422);
    return { ...result, reconciliation: reconcileCosts(result) };
  };
  router.post('/connector/employees',integration,run(async(req,res)=>{
    const result=await tx(c=>employees.receive(req.body,c));
    res.json({ok:true,...result});
  }));
  router.post(
    "/connector/snapshot",
    integration,
    run(async (req, res) => {
      const s = req.body;
      if (
        s.schemaVersion !== 1 ||
        !Array.isArray(s.fields) ||
        !Array.isArray(s.categories) ||
        !Array.isArray(s.brands) ||
        !s.settings ||
        !s.priceLists ||
        !Array.isArray(s.exchange)
      )
        fail("ERP快照结构无效");
      if (digest(s.rules?.source || "") !== reviewedRuleHash)
        fail("ERP计算规则变化，需要审核后更新规则版本", 409);
      if (digest(s.identification?.source || "") !== reviewedIdentificationHash)
        fail("ERP识别规则变化，需要审核", 409);
      s.rules.sha256 = reviewedRuleHash;
      s.identification.sha256 = reviewedIdentificationHash;
      const skuMaster = Array.isArray(s.skuMaster) ? s.skuMaster : [];
      delete s.skuMaster; // Personnel-scoped SKU facts must not enter public bootstrap data.
      s.verified = false;
      s.version = digest(parameterFacts(s));
      s.receivedAt = new Date().toISOString();
      delete s.employeeMaster;
      delete s.personPrefixes;
      await putConfig("erp", s);
      await putConfig("connection", { lastSeen: s.receivedAt });
      for (const master of skuMaster) {
        if (!master.selectionId || !master.itemCode || master.stage !== 'item_created' || !Array.isArray(master.skus)) continue;
        await tx(async c => {
          const updated = (await c.query(
            "UPDATE product_opportunities SET selection_workspace=jsonb_set(selection_workspace,'{erpResult}',$3::jsonb),record_version=record_version+1,updated_at=now() WHERE id=$1 AND selection_workspace->>'status'='submitted' AND selection_workspace->'data'->>'item_code'=$2 AND selection_workspace->'erpResult' IS DISTINCT FROM $3::jsonb RETURNING *",
            [master.selectionId, master.itemCode, JSON.stringify(master)],
          )).rows[0];
          if(updated) await requestProductFiles(c, updated, updated.owner_person_id);
        });
      }
      res.json({ ok: true, version: s.version });
    }),
  );
  router.post(
    "/connector/claim",
    integration,
    run(async (req, res) => {
      await putConfig("connection", { lastSeen: new Date().toISOString() });
      const jobs = await tx(async (c) => {
        const selected = (
          await c.query(
            "SELECT * FROM selection_erp_jobs WHERE (status='queued' OR (status='processing' AND lease_until<now())) AND (payload->>'testOnly')=$1 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 5",
            [req.body.formal === true ? 'false' : 'true'],
          )
        ).rows;
        for (const j of selected) {
          j.lease_token = randomUUID();
          await c.query(
            "UPDATE selection_erp_jobs SET status='processing',attempts=attempts+1,lease_until=now()+interval '2 minutes',lease_token=$2,updated_at=now() WHERE id=$1",
            [j.id, j.lease_token],
          );
        }
        return selected;
      });
      res.json({ jobs });
    }),
  );
  router.post(
    "/connector/jobs/:id/result",
    integration,
    run(async (req, res) => {
      const b = req.body;
      if (
        !["succeeded", "failed", "conflict"].includes(b.status) ||
        !b.leaseToken
      )
        fail("结果状态或租约无效");
      await tx(async (c) => {
        const job = (await c.query("SELECT * FROM selection_erp_jobs WHERE id=$1 AND lease_token=$2 AND status='processing' FOR UPDATE",
          [req.params.id,b.leaseToken])).rows[0];
        if (!job) fail("租约已失效或任务已经完成",409);
        if (job.payload.testOnly === false && b.status === "succeeded" &&
            (b.result?.stage !== "item_created" || b.result?.itemCode !== job.payload.data.item_code ||
             b.result?.selectionId !== job.selection_id))
          fail("缺少真实ERP商品建档凭据",409);
        await c.query("UPDATE selection_erp_jobs SET status=$2,result=$3,lease_until=NULL,updated_at=now() WHERE id=$1",
          [job.id,b.status,JSON.stringify(b.result || {})]);
        if (job.payload.testOnly === false) {
          const updated=(await c.query("UPDATE product_opportunities SET selection_workspace=jsonb_set(jsonb_set(selection_workspace,'{status}',to_jsonb($2::text)),'{erpResult}',$3::jsonb),updated_at=now() WHERE id=$1 RETURNING *",
            [job.selection_id,b.status === "succeeded" ? "submitted" : "confirmed",JSON.stringify(b.result || {})])).rows[0];
          if(b.status==='succeeded')await requestProductFiles(c,updated,job.payload.owner);
        }
      });
      res.json({ ok: true });
    }),
  );
  router.get(
    "/connector/jobs/:id/assets/:asset",
    integration,
    run(async (req, res) => {
      const r = (
        await pool.query(
          "SELECT a.* FROM selection_workspace_assets a JOIN selection_erp_jobs j ON j.selection_id=a.selection_id WHERE j.id=$1 AND a.id=$2",
          [req.params.id, req.params.asset],
        )
      ).rows[0];
      if (!r) fail("附件不存在", 404);
      res.type(r.content_type).send(r.bytes);
    }),
  );
  router.use(
    "/connector/commands",
    createSelectionERPCommands({ pool, tx, integration }),
  );
  router.use(auth);
  router.get('/employees/me',run(async(req,res)=>res.json(await employees.profile(person(req)))));
  router.use(async(req,res,next)=>{try{await employees.requireActive(req);next();}catch(e){next(e);}});
  mountUploadTransport(router, { pool, tx, actor });
  router.use(async (req, res, next) => {
    try {
      req.selectionManager = !!(await config("pool-grants"))?.[person(req)]
        ?.manage;
      next();
    } catch (e) {
      next(e);
    }
  });
  router.get('/employees',run(async(req,res)=>{
    if (!admin(req.aioneIdentity) && !req.selectionManager) fail('需要人员关联查看权限',403);
    const directory=await config('erp-employees');
    res.json({employees:directory?.employees || [],version:directory?.version || null,
      cached:!directory || Date.now()-Date.parse(directory.receivedAt)>180000});
  }));
  router.get(
    "/bootstrap",
    run(async (req, res) => {
      const s = await snapshot(),
        fields = fieldsFor(s),
        connection = await config("connection");
      const defaults = defaultLayout(fields),
        layout = (await config("layout")) || defaults;
      if ((layout.version || 0) < 38) {
        // One-time upgrade of structural requirements; keep administrator widths/order.
        for (const group of layout.groups) {
          const current = defaults.groups.find((g) => g.id === group.id);
          if (current)
            Object.assign(group, { label: current.label, icon: current.icon });
          if (group.id === "source") group.hidden = true;
        }
        for (const field of layout.fields) {
          if (field.group === "source") field.group = "basic";
          if (field.id === "marketReferencePrice") field.hidden = true;
          if (field.id === "selectionRationale" && field.rows === 6)
            field.rows = 9;
        }
        const mainOrder = ["basic", "market", "logistics", "operations"];
        layout.groups.sort((a, b) => {
          const rank = (g) =>
            mainOrder.includes(g.id) ? mainOrder.indexOf(g.id) : 10;
          return rank(a) - rank(b);
        });
        layout.version = 38;
        await putConfig("layout", layout);
      }
      if ((layout.version || 0) < 39) {
        // Explicit V3.9 layout migration, persisted once; later admin edits remain editable.
        const basic = defaults.fields.filter((f) => f.group === "basic");
        layout.fields = [
          ...basic.map((f) => ({
            ...layout.fields.find((old) => old.id === f.id),
            ...f,
          })),
          ...layout.fields.filter((f) => !basic.some((b) => b.id === f.id)),
        ];
        layout.version = 39;
        await putConfig("layout", layout);
      }
      if ((layout.version || 0) < 40) {
        layout.ratio = 72;
        const basic = layout.groups.find(g => g.id === 'basic');
        if (basic) basic.label = '商品信息';
        layout.version = 40;
        await putConfig('layout', layout);
      }
      if ((layout.version || 0) < 41) {
        layout.fields = layout.fields.filter(f => f.id !== "custom_主要材质1");
        const aux = defaults.fields.find(f => f.id === "custom_miwa_auxiliary_info");
        if (aux && !layout.fields.some(f => f.id === aux.id)) layout.fields.splice(layout.fields.findIndex(f=>f.id==="custom_miwa_selection_notes")+1,0,aux);
        layout.version = 41;
        await putConfig("layout",layout);
      }
      layout.fields = layout.fields.filter((f) =>
        fields.some((x) => x.id === f.id),
      );
      for (const f of defaults.fields)
        if (!layout.fields.some((x) => x.id === f.id)) layout.fields.push(f);
      for (const g of defaults.groups)
        if (!layout.groups.some((x) => x.id === g.id)) { if(g.id === "specifications") layout.groups.splice(layout.groups.findIndex(x=>x.id === "basic")+1,0,g); else layout.groups.push(g); }
      res.json({
        employeeOptions: (admin(req.aioneIdentity) || req.selectionManager) ? await employees.eligible() : [],
        identity: {
          id: actor(req),
          name:
            (
              await pool.query(`SELECT display_name FROM ${employeeTable} WHERE id=$1`, [
                person(req),
              ])
            ).rows[0]?.display_name || "人员档案待关联",
          admin: admin(req.aioneIdentity),
        },
        logisticsRelations: s.settings.logistics
          .filter((r) => r.enabled)
          .map((r) => ({ method: r.method, fulfillment: r.fulfillment })),
        itemAttributes: s.itemAttributes || [],
        platformPolicies: s.platformPolicies || {},
        uploadPolicy,
        fields,
        layout,
        defaults,
        parameters: {
          version: s.version,
          verified: false,
          source: s.source,
          capturedAt: s.capturedAt,
          platformRate: s.settings.platform_rate,
          targetMargin: s.settings.target_margin,
          tariffRate: s.settings.tariff_rate,
          exchange: s.exchange?.[0]?.exchange_rate,
          minimumProfit: null,
        },
        connection: {
          ...connection,
          online:
            !!connection &&
            Date.now() - Date.parse(connection.lastSeen) < 180000,
        },
        salesCapabilities: {
          multiplePlans: false,
          categoryRates: false,
          management: false,
          reason:
            "当前ERP仅有统一平台试算费率，尚无平台分类费率及负责人授权模型；多方案扩展暂未启用",
        },
        preferences: (await config("preferences:" + actor(req))) || {},
      });
    }),
  );
  router.put(
    "/layout",
    run(async (req, res) => {
      requireAdmin(req);
      await putConfig(
        "layout",
        validateLayout(req.body, fieldsFor(await snapshot())),
      );
      res.json({ ok: true });
    }),
  );
  router.put(
    "/preferences",
    run(async (req, res) => {
      if (JSON.stringify(req.body).length > 20000) fail("配置过大");
      const allowed = new Set([
        "image",
        "selectionNo",
        "sourcePlatform",
        "item_code",
        "item_name",
        "item_group",
        "custom_库存类型",
        "cost",
        "suggestion",
        "price",
        "profit",
        "margin",
        "selector",
        "brand",
        "owner",
        "createdAt",
        "status",
        "sourceUrl",
        "totalCost",
        "operationRate",
        "selectionRationale",
        "operatingStrategy",
        "erpStatus",
      ]);
      const { columns, widths = {} } = req.body;
      if (
        columns !== undefined &&
        (!Array.isArray(columns) ||
          !columns.length ||
          new Set(columns).size !== columns.length ||
          columns.some((key) => !allowed.has(key)))
      )
        fail("显示列配置无效");
      if (
        !widths ||
        typeof widths !== "object" ||
        Array.isArray(widths) ||
        Object.entries(widths).some(
          ([key, value]) =>
            !allowed.has(key) ||
            !Number.isFinite(value) ||
            value < 50 ||
            value > 2000,
        )
      )
        fail("列宽配置无效");
      await putConfig("preferences:" + actor(req), {
        ...(columns ? { columns } : {}),
        widths,
      });
      res.json({ ok: true });
    }),
  );
  router.get(
    "/sync",
    run(async (req, res) => {
      requireAdmin(req);
      res.json({
        connection: await config("connection"),
        jobs: (
          await pool.query(
            "SELECT id,selection_id,status,attempts,result,updated_at FROM selection_erp_jobs ORDER BY updated_at DESC LIMIT 100",
          )
        ).rows,
      });
    }),
  );
  router.post(
    "/source-check",
    run(async (req, res) => {
      const data = validateData(
        { sourceUrl: req.body.sourceUrl },
        await snapshot(),
      );
      if (!data.sourceUrl) fail("请先粘贴采购URL");
      const sourceSnapshot = await snapshot();
      let duplicates = [],
        review;
      try {
        review = await tx((c) =>
          checkPurchaseSource(
            c,
            data,
            req.body.excludeId || null,
            sourceSnapshot,
          ),
        );
      } catch (error) {
        if (error.statusCode === 409 || error.status === 409)
          duplicates = [{ exists: true }];
        else throw error;
      }
      let product = null,
        message = "链接已保留；未启用授权读取，可继续录入。";
      if (get1688RuntimeStatus().ready && /1688\.com/.test(data.sourceUrl)) {
        try {
          product = (await fetch1688ProductByUrl(data.sourceUrl)).product;
          message = "已读取授权商品资料";
        } catch (error) {
          message = "读取暂不可用：" + error.message;
        }
      }
      res.json({
        valid: true,
        duplicates,
        review,
        product,
        reading: { enabled: !!product, message },
      });
    }),
  );
  router.post(
    "/assist-context",
    run(async (req, res) => {
      const data = validateData(req.body.data || {}, await snapshot());
      const record = req.body.id ? await row(req, req.body.id) : null;
      const attachments = record
        ? (
            await pool.query(
              "SELECT id FROM selection_workspace_assets WHERE selection_id=$1",
              [record.id],
            )
          ).rows
        : [];
      res.json({
        enabled: false,
        status: "not_enabled",
        message:
          "将复用美和AI统一服务。当前开发环境未启用AI分析，未发起模型调用，也未产生费用。",
        context: {
          schemaVersion: "selection-v3.5",
          objective: String(req.body.objective || ""),
          data,
          recordId: record?.id,
          marketAttachmentIds: record ? researchIds(record) : [],
          productAttachmentIds: record
            ? productAssets(record, attachments).map((a) => a.id)
            : [],
          savedPricing: record?.selection_workspace.pricing || null,
          parametersVerified: false,
        },
        proposal: null,
      });
    }),
  );
  router.post(
    "/calculate",
    run(async (req, res) => {
      const s = await snapshot();
      res.json(await calculate(validateData(req.body, s), s));
    }),
  );
  router.post(
    "/sku-pricing",
    run(async (req, res) => {
      const s = await snapshot(),
        data = validateData(req.body, s),
        items = [];
      for (const sku of data.skus) {
        const pricing = await calculate(
          {
            ...data,
            custom_单个采购价: sku.cost ?? data.custom_单个采购价,
            custom_实际售价: sku.price ?? data.custom_实际售价,
            custom_单个净重g: sku.weight ?? data.custom_单个净重g,
          },
          s,
        );
        items.push({ code: sku.code, pricing });
      }
      res.json({ items });
    }),
  );
  const identify = async (title, s, recognizeName = true) => {
    const response = await fetch(costUrl + "/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        snapshot: s,
        title: String(title || "").slice(0, 2000),
      }),
      signal: AbortSignal.timeout(5000),
    });
    const result = await response.json();
    if (!response.ok) fail(result.error || "ERP识别不可用", 422);
    const category = s.categories.find((c) => c.name === result.category);
    result.category = category?.name || null;
    result.brand = category?.custom_miwa_default_brand || null;
    return recognizeName ? completeShortName(result,title) : result;
  };
  router.post(
    "/identify",
    run(async (req, res) =>
      res.json(await identify(req.body.title, await snapshot())),
    ),
  );

  router.post(
    "/confirmation-check",
    run(async (req, res) => {
      const s = await snapshot();
      res.json({ issues: confirmationIssues(validateData(req.body, s), s) });
    }),
  );
  router.post(
    "/sku-file",
    run(async (req, res) => {
      const bytes = Buffer.from(String(req.body.base64 || ""), "base64");
      const s=await snapshot();
      res.json(await completeSkuAttributes(parseSupplierFile(bytes,req.body.sourceUrl,req.body.filename,s),s));
    }),
  );
  const list = async (req, unlimited = false) => {
    const q = req.query,
      values = [
        admin(req.aioneIdentity) || !!req.selectionManager,
        person(req) || "",
        String(q.q || ""),
        String(q.status || ""),
        q.archived === "true",
      ];
    let where =
      "selection_workspace IS NOT NULL AND ($1::boolean OR owner_person_id=$2) AND ($3='' OR selection_no ILIKE '%'||$3||'%' OR title ILIKE '%'||$3||'%' OR selection_workspace->'data'->>'item_code' ILIKE '%'||$3||'%') AND ($4='' OR selection_workspace->>'status'=$4) AND (archived_at IS NOT NULL)=$5";
    if (q.owner && (admin(req.aioneIdentity) || req.selectionManager)) {
      values.push(q.owner);
      where += " AND owner_person_id=$" + values.length;
    }
    if (q.selector) {
      values.push(q.selector);
      where += " AND created_by_person_id=$" + values.length;
    }
    if (q.category) {
      values.push(q.category);
      where +=
        " AND selection_workspace->'data'->>'item_group'=$" + values.length;
    }
    for (const [key, op] of [
      ["from", ">="],
      ["to", "<="],
    ])
      if (q[key]) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(q[key])) fail("日期格式无效");
        values.push(q[key]);
        where += ` AND created_at::date ${op} $${values.length}::date`;
      }
    const numeric = (key, calculated = false) => {
      const path = calculated ? "'pricing'->'results'" : "'data'";
      const value = `selection_workspace->${path}->>'${key}'`;
      const ready = calculated
        ? "selection_workspace->'pricing'->>'status'='estimated' AND COALESCE(NULLIF(selection_workspace->'data'->>'custom_实际售价',''),'0')::numeric>0 AND "
        : "";
      return `CASE WHEN ${ready}(${value}) ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (${value})::numeric END`;
    };
    const sorts = {
      selectionNo: "(selection_date,length(selection_no),selection_no)",
      sourcePlatform: "source_platform",
      createdAt: "created_at",
      updatedAt: "updated_at",
      item_code: "selection_workspace->'data'->>'item_code'",
      item_name: "selection_workspace->'data'->>'item_name'",
      ...Object.fromEntries(
        [
          "item_group",
          "brand",
          "custom_库存类型",
          "sourceUrl",
          "selectionRationale",
          "operatingStrategy",
        ].map((k) => [
          k,
          "NULLIF(selection_workspace->'data'->>'" + k + "','')",
        ]),
      ),
      owner:
        `(SELECT display_name FROM ${employeeTable} WHERE id=product_opportunities.owner_person_id)`,
      selector:
        `(SELECT display_name FROM ${employeeTable} WHERE id=product_opportunities.created_by_person_id)`,
      status: "selection_workspace->>'status'",
      erpStatus:
        "(SELECT status FROM selection_erp_jobs WHERE selection_id=product_opportunities.id ORDER BY created_at DESC LIMIT 1)",
      operationRate: [
        "custom_aione_coupon",
        "custom_aione_points",
        "custom_aione_ads",
        "custom_aione_other",
      ]
        .map((k) => "COALESCE(" + numeric(k) + ",0)")
        .join("+"),
      totalCost: [
        "custom_到日本仓成本",
        "custom_日本配送日本",
        "custom_平台交易成本",
        "custom_销售运营成本",
      ]
        .map((k) => numeric(k, true))
        .join("+"),
      cost: numeric("custom_单个采购价"),
      price: numeric("custom_实际售价"),
      suggestion: numeric("custom_目标毛利率达标售价", true),
      profit: numeric("custom_运营后毛利润", true),
      margin: numeric("custom_运营后毛利率", true),
    };
    if (q.minMargin !== undefined) {
      if (!Number.isFinite(Number(q.minMargin))) fail("利润率无效");
      values.push(Number(q.minMargin));
      where += ` AND ${sorts.margin}>=$${values.length}`;
    }
    const total = Number(
      (
        await pool.query(
          "SELECT count(*) FROM product_opportunities WHERE " + where,
          values,
        )
      ).rows[0].count,
    );
    const limit = unlimited
        ? 1001
        : Math.min(100, Math.max(1, Math.trunc(Number(q.limit) || 25))),
      offset = unlimited ? 0 : Math.max(0, Math.trunc(Number(q.offset) || 0));
    values.push(limit, offset);
    const rows = (
      await pool.query(
        `SELECT *, (SELECT display_name FROM ${employeeTable} WHERE id=product_opportunities.created_by_person_id) AS selector_name, (SELECT display_name FROM ${employeeTable} WHERE id=product_opportunities.owner_person_id) AS owner_name, (SELECT status FROM selection_erp_jobs WHERE selection_id=product_opportunities.id ORDER BY created_at DESC LIMIT 1) AS erp_job_status FROM product_opportunities WHERE ${where} ORDER BY ${sorts[q.sort] || sorts.createdAt} ${q.direction === "asc" ? "ASC" : "DESC"} NULLS LAST,id LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      )
    ).rows;
    return { items: rows.map(view), total, limit, offset };
  };
  router.get(
    "/records",
    run(async (req, res) => res.json(await list(req))),
  );
  router.get(
    "/records/:id/package",
    run(async (req, res) => {
      const r = await row(req, req.params.id),
        data = r.selection_workspace.data;
      if (!data.item_code) fail("请先填写货号，再下载ERP资料包");
      const zip = new JSZip(),
        folder = zip.folder(data.item_code);
      folder.file(data.item_code + ".xlsx", await quickWorkbook(data));
      folder.file("SKU.xlsx", await skuWorkbook(data));
      const assets = (
        await pool.query(
          "SELECT * FROM selection_workspace_assets WHERE selection_id=$1 ORDER BY position,created_at",
          [r.id],
        )
      ).rows;
      productAssets(r, assets).forEach((a, i) =>
        folder.file(
          String(i + 1).padStart(3, "0") +
            "-" +
            a.id +
            "." +
            (a.content_type === "image/png"
              ? "png"
              : a.content_type === "image/webp"
                ? "webp"
                : "jpg"),
          a.bytes,
        ),
      );
      folder.file(
        "aione-manifest.json",
        JSON.stringify(
          {
            selectionId: r.id,
            version: r.record_version,
            parameterVersion: r.selection_workspace.pricing?.parameterVersion,
            allowPublish: false,
            allowPaidAI: false,
            testOnly: allowTestIdentities,
            assets: productAssets(r, assets).map((a) => ({
              id: a.id,
              sha256: a.sha256,
              position: a.position,
            })),
          },
          null,
          2,
        ),
      );
      res
        .type("application/zip")
        .attachment(data.item_code + ".zip")
        .send(await zip.generateAsync({ type: "nodebuffer" }));
    }),
  );
  const save = async (req, c, input, id, version, s) => {
    await c.query(
      "SELECT pg_advisory_xact_lock(hashtext('selection-number-flow'))",
    );
    let previous = id ? await row(req, id, c, true) : null;
    const data = validateData(input, s, {existingData: previous?.selection_workspace.data});
    if (previous?.selection_workspace.status === "number_pending") {
      if (
        (
          await c.query(
            "SELECT id FROM selection_erp_commands WHERE selection_id=$1 AND status='processing'",
            [id],
          )
        ).rowCount
      )
        fail("正式货号正在申请，请完成后再编辑", 409);
      await c.query(
        "UPDATE selection_erp_commands SET status='failed',result='{\"message\":\"资料已修改，请重新确认\"}' WHERE selection_id=$1 AND status='queued'",
        [id],
      );
    }
    if (previous?.selection_workspace.formalNumber?.code || ["confirmed", "submitted"].includes(previous?.selection_workspace.status))
      data.item_code = previous.selection_workspace.data.item_code;
    const sourceReview = await checkPurchaseSource(c, data, id, s);
    if (previous && previous.record_version !== Number(version))
      fail("记录已被修改，请重新加载", 409);
    if (
      previous &&
      (previous.archived_at ||
        ["submitted", "submitting"].includes(previous.selection_workspace.status))
    )
      fail("已归档或已提交ERP的记录不能直接覆盖；请复制为新草稿", 409);
    if (data.custom_商品长标题中文) {
      try {
        const recognized = await identify(data.custom_商品长标题中文, s, !data.shortNameManual);
        if (!data.shortNameManual)
          data.item_name = recognized.shortName?.name ||
            (previous?.selection_workspace.data.custom_商品长标题中文 === data.custom_商品长标题中文
              ? previous.selection_workspace.data.item_name || "" : "");
        data.item_group = recognized.category || "";
        // ERP preserves an existing brand, otherwise inherits the category default.
        data.brand =
          previous?.selection_workspace.data.brand || recognized.brand || "";
      } catch {
        // Missing ERP recognition never prevents a draft or a cost simulation.
        for (const key of ["item_name", "item_group", "brand"])
          if (key === "item_name") {
            if (!data.shortNameManual)
              data[key] =
                previous?.selection_workspace.data.custom_商品长标题中文 ===
                data.custom_商品长标题中文
                  ? previous.selection_workspace.data.item_name || ""
                  : "";
          } else data[key] = previous?.selection_workspace.data[key] || "";
      }
    }
    const decisionKeys = [
      ...Object.keys(BINDINGS).filter(
        (k) => !["brand", "custom_主要材质1"].includes(k),
      ),
      "sourceUrl",
      "referenceLinks",
      "referencePrices",
      "salesPlatform",
      "marketReferencePrice",
      "selectionRationale",
      "operatingStrategy",
    ];
    const decisionFacts = (value) =>
      Object.fromEntries(decisionKeys.map((k) => [k, value?.[k]]));
    const keepConfirmation =
      previous?.selection_workspace.status === "confirmed" &&
      previous.selection_workspace.pricing?.parameterVersion === s.version &&
      isDeepStrictEqual(
        decisionFacts(data),
        decisionFacts(previous.selection_workspace.data),
      );
    let pricing;
    try {
      pricing = await calculate(data, s);
    } catch (e) {
      pricing = {
        status: "incomplete",
        message: "试算服务暂不可用：" + e.message,
        results: {},
        parameterVersion: s.version,
        verified: false,
      };
    }
    const workspace = {
      ...previous?.selection_workspace,
      sourceReview: {
        erpReview: sourceReview.erpReview,
        existingERPCode: sourceReview.existingERPCode,
      },
      data,
      pricing,
      status: keepConfirmation ? "confirmed" : "draft",
    };
    let r;
    if (previous)
      r = (
        await c.query(
          "UPDATE product_opportunities SET title=$2,source_url=$3,selection_workspace=$4,record_version=record_version+1,updated_at=now() WHERE id=$1 RETURNING *",
          [id, data.item_name || "", data.sourceUrl, JSON.stringify(workspace)],
        )
      ).rows[0];
    else
      r = (
        await c.query(
          "INSERT INTO product_opportunities(id,source_platform,title,owner_person_id,selection_workspace,created_by_person_id,source_url) VALUES($1,'aione-selection',$2,$3,$4,$3,$5) RETURNING *",
          [
            "selection:" + randomUUID(),
            data.item_name || "",
            person(req) || actor(req),
            JSON.stringify(workspace),
            data.sourceUrl,
          ],
        )
      ).rows[0];
    r = await ensureSelectionNo(c, r);
    await registerKeys(c, sourceReview.keys || [], r.id);
    if (r.selection_workspace.pool) await syncResearchTask(c, r, actor(req));
    await event(c, req, r, previous ? "update" : "create");
    return view(await row(req, r.id, c));
  };
  router.post(
    "/records",
    run(async (req, res) => {
      const s = await snapshot();
      res
        .status(201)
        .json(
          await tx((c) =>
            intakeOnce(c, actor(req), req.body.requestKey, req.body.data, () =>
              save(req, c, req.body.data, null, null, s),
            ),
          ),
        );
    }),
  );
  router.get(
    "/records/:id",
    run(async (req, res) => {
      const r = await row(req, req.params.id);
      const allAssets = (
        await pool.query(
          "SELECT id,filename,content_type,position FROM selection_workspace_assets WHERE selection_id=$1 ORDER BY position,created_at",
          [r.id],
        )
      ).rows;
      res.json({
        ...view(r),
        marketAssets: allAssets.filter((a) => researchIds(r).includes(a.id)),
        assets: productAssets(
          r,
          (
            await pool.query(
              "SELECT id,filename,content_type,position FROM selection_workspace_assets WHERE selection_id=$1 ORDER BY position,created_at",
              [r.id],
            )
          ).rows,
        ),
        events: (
          await pool.query(
            "SELECT actor_id,action,version,created_at FROM selection_workspace_events WHERE selection_id=$1 ORDER BY id DESC LIMIT 50",
            [r.id],
          )
        ).rows,
        numberRequests: (
          await pool.query(
            "SELECT status,result,updated_at FROM selection_erp_commands WHERE selection_id=$1 AND kind='formal_number' ORDER BY created_at DESC",
            [r.id],
          )
        ).rows,
        jobs: (
          await pool.query(
            "SELECT id,status,result,updated_at FROM selection_erp_jobs WHERE selection_id=$1 ORDER BY created_at DESC",
            [r.id],
          )
        ).rows,
      });
    }),
  );
  router.patch(
    "/records/:id",
    run(async (req, res) => {
      const s = await snapshot();
      res.json(
        await tx((c) =>
          save(req, c, req.body.data, req.params.id, req.body.version, s),
        ),
      );
    }),
  );
  router.post(
    "/batch",
    run(async (req, res) => {
      const { action, items, patch } = req.body;
      if (
        !Array.isArray(items) ||
        !items.length ||
        items.length > 100 ||
        new Set(items.map((x) => x.id)).size !== items.length
      )
        fail("请选择1至100条不同记录");
      const s = await snapshot();
      const result = await tx(async (c) => {
        await c.query(
          "SELECT pg_advisory_xact_lock(hashtext('selection-number-flow'))",
        );
        const out = [];
        for (const item of [...items].sort((a, b) =>
          a.id.localeCompare(b.id),
        )) {
          const r = await row(req, item.id, c, true);
          if (
            action === "confirm" &&
            ["confirmed", "number_pending"].includes(
              r.selection_workspace.status,
            )
          ) {
            if (r.selection_workspace.status === "number_pending")
              await requestFormalNumber(c, r, actor(req));
            else await requestProductFiles(c, r, actor(req));
            out.push(view(r));
            continue;
          }
          if (r.record_version !== Number(item.version))
            fail("批量操作存在版本冲突，未保存任何修改", 409);
          if (["submitting", "submitted"].includes(r.selection_workspace.status)) {
            if (action === "submit") {
              out.push((await c.query("SELECT id,status,result FROM selection_erp_jobs WHERE selection_id=$1 ORDER BY created_at DESC LIMIT 1", [r.id])).rows[0]);
              continue;
            }
            if (!["copy", "archive"].includes(action)) fail("ERP正在建档或已经建档，请勿覆盖已提交数据",409);
          }
          if (action === "edit") {
            out.push(
              await save(
                req,
                c,
                { ...r.selection_workspace.data, ...patch },
                r.id,
                r.record_version,
                s,
              ),
            );
            continue;
          }
          if (action === "copy") {
            const copy = { ...r.selection_workspace.data, item_code: "" };
            const saved = await save(req, c, copy, null, null, s);
            const assets = (
              await c.query(
                "SELECT * FROM selection_workspace_assets WHERE selection_id=$1 ORDER BY position",
                [r.id],
              )
            ).rows;
            if (productAssets(r, assets).length)
              fail(
                "相同商品图片已存在，请直接编辑原记录；新商品请从新草稿开始",
                409,
              );
            const copiedResearch = [];
            for (const a of assets) {
              const assetId = randomUUID();
              if (researchIds(r).includes(a.id)) copiedResearch.push(assetId);
              await c.query(
                "INSERT INTO selection_workspace_assets(id,selection_id,filename,content_type,bytes,sha256,position) VALUES($1,$2,$3,$4,$5,$6,$7)",
                [
                  assetId,
                  saved.id,
                  a.filename,
                  a.content_type,
                  a.bytes,
                  a.sha256,
                  a.position,
                ],
              );
            }
            await c.query(
              "UPDATE product_opportunities SET selection_workspace=jsonb_set(selection_workspace,'{researchAssetIds}',$2::jsonb) WHERE id=$1",
              [saved.id, JSON.stringify(copiedResearch)],
            );
            out.push(saved);
            continue;
          }
          if (action === "confirm") {
            if (r.archived_at || r.selection_workspace.status === "submitted")
              fail("此状态不能确认选品", 409);
            const data = validateData(r.selection_workspace.data, s, {existingData: r.selection_workspace.data});
            if (data.specificationAttributes) Object.assign(data, confirmSpecifications(data, s));
            const issues = confirmationIssues(data, s);
            if (issues.length) fail(issues.map((i) => i.message).join("；"));
            const pricing = await calculate(data, s);
            if (
              pricing.status !== "estimated" ||
              !(Number(data.custom_实际售价) > 0)
            )
              fail("确认选品前请完成成本试算并填写实际售价");
            await checkPurchaseSource(c, data, r.id, s);
            const numbering = await requestFormalNumber(c, r, actor(req));
            const updated = (
              await c.query(
                "UPDATE product_opportunities SET selection_workspace=selection_workspace || $2::jsonb,record_version=record_version+1,updated_at=now() WHERE id=$1 RETURNING *",
                [
                  r.id,
                  JSON.stringify({
                    data,
                    status: numbering.status,
                    pricing,
                    confirmedAt: new Date().toISOString(),
                    confirmedBy: actor(req),
                  }),
                ],
              )
            ).rows[0];
            await syncResearchTask(c, updated, actor(req));
            await requestProductFiles(c, updated, actor(req));
            await event(c, req, updated, "confirm-selection");
            out.push(view(updated));
            continue;
          }
          if (action === "submit") {
            if (r.archived_at) fail("已归档记录不能提交");
            if (!["confirmed", "submitted"].includes(r.selection_workspace.status))
              fail("请先确认选品并完成ERP货号校验，再提交建档", 409);
            if (!r.selection_workspace.data.item_code)
              fail("正式货号待生成，不能正式建档", 409);
            await checkPurchaseSource(c, r.selection_workspace.data, r.id, s);
            const connection = await config("connection");
            if (
              !s.catalog ||
              !connection ||
              Date.now() - Date.parse(connection.lastSeen) > 180000
            )
              fail("ERP正式商品查重待复核，请恢复连接后提交", 409);
            const data = validateData(r.selection_workspace.data, s, {
              submit: true,
              existingData: r.selection_workspace.data,
            });
            const allAssets = (
              await c.query(
                "SELECT id,filename,sha256,position FROM selection_workspace_assets WHERE selection_id=$1 ORDER BY position",
                [r.id],
              )
            ).rows;
            const assets = productAssets(r, allAssets);
            if (!assets.length) fail("提交前请上传商品主图");
            const pricing = await calculate(data, s);
            if (pricing.status === "incomplete") fail(pricing.message);
            assertReconciled(pricing);
            if (r.selection_workspace.pricing?.parameterVersion !== s.version)
              fail("ERP参数已更新，请重新保存并确认利润后提交", 409);
            const job = (
              await c.query(
                "INSERT INTO selection_erp_jobs(id,selection_id,selection_version,payload) VALUES($1,$2,$3,$4) ON CONFLICT(selection_id,selection_version) DO UPDATE SET selection_id=EXCLUDED.selection_id RETURNING id,status",
                [
                  randomUUID(),
                  r.id,
                  r.record_version,
                  JSON.stringify({
                    selectionId: r.id,
                    version: r.record_version,
                    owner: r.owner_person_id,
                    data,
                    pricing,
                    assets,
                    researchMaterials: allAssets.filter((a) =>
                      researchIds(r).includes(a.id),
                    ),
                    parameterVersion: s.version,
                    selectionNo: r.selection_no,
                    selector: r.created_by_person_id,
                    selectorEmployeeId: r.selector_employee_id,
                    ownerEmployeeId: r.owner_employee_id,
                    selectionDate: r.selection_date,
                    testOnly: process.env.AIONE_FORMAL_ITEM_INTAKE !== "1",
                    allowPublish: false,
                    allowPaidAI: false,
                    allowEmail: false,
                  }),
                ],
              )
            ).rows[0];
            await c.query(
              "UPDATE product_opportunities SET selection_workspace=jsonb_set(selection_workspace,'{status}',to_jsonb($2::text)) WHERE id=$1",
              [r.id, process.env.AIONE_FORMAL_ITEM_INTAKE === "1" ? "submitting" : "submitted"],
            );
            await event(c, req, r, "submit", { jobId: job.id });
            out.push(job);
            continue;
          }
          if (action === "archive" || action === "restore") {
            await c.query(
              `UPDATE product_opportunities SET archived_at=${action === "archive" ? "now()" : "NULL"},record_version=record_version+1 WHERE id=$1`,
              [r.id],
            );
            await syncResearchTask(
              c,
              { ...r, archived_at: action === "archive" ? new Date() : null },
              actor(req),
            );
            await event(
              c,
              req,
              { ...r, record_version: r.record_version + 1 },
              action,
            );
            continue;
          }
          if (action === "delete") {
            requireAdmin(req);
            if (r.selection_no)
              fail("选品编号及审计记录永久保留，请使用归档", 409);
            if (!r.archived_at || r.selection_workspace.status === "submitted")
              fail("仅可删除已归档且未提交ERP的草稿");
            await c.query(
              "DELETE FROM selection_workspace_assets WHERE selection_id=$1",
              [r.id],
            );
            await event(c, req, r, "delete");
            await c.query("DELETE FROM product_opportunities WHERE id=$1", [
              r.id,
            ]);
            continue;
          }
          fail("不支持的批量操作");
        }
        return out;
      });
      res.json({ ok: true, items: result });
    }),
  );
  router.post(
    "/records/:id/assets",
    run(async (req, res) => {
      if ((await config("pool-grants"))?.[person(req)]?.collect) {
        const pending = await pool.query(
          "SELECT id FROM product_opportunities WHERE id=$1 AND created_by_person_id=$2 AND selection_workspace->'pool'->>'state'='pending' AND archived_at IS NULL",
          [req.params.id, person(req)],
        );
        if (pending.rowCount) req.poolAssetWrite = req.params.id;
      }
      // Check business access before making any outbound image request. The
      // existing transaction below checks again before storing the attachment.
      const accessible = await row(req, req.params.id);
      if (accessible.selection_workspace.status === 'submitted' || accessible.archived_at)
        fail('此记录不能修改附件', 409);
      let b = req.body;
      if (b.sourceUrl) {
        if (b.kind === 'market' || b.base64) fail('图片网址导入请求无效');
        try { b = await fetchSelectionImage(String(b.sourceUrl), uploadPolicy.maxBytes); }
        catch (error) { fail(error.message, 422); }
      }
      const
        bytes = Buffer.from(String(b.base64 || ""), "base64");
      const png = bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
        webp =
          bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP";
      const market = b.kind === "market";
      const extension = String(b.filename || "")
        .split(".")
        .pop()
        .toLowerCase();
      const documentType =
        market &&
        extension === "pdf" &&
        bytes.toString("ascii", 0, 5) === "%PDF-"
          ? "application/pdf"
          : market &&
              ["xlsx", "docx"].includes(extension) &&
              bytes[0] === 80 &&
              bytes[1] === 75
            ? "application/octet-stream"
            : market && ["txt", "csv"].includes(extension) && !bytes.includes(0)
              ? "text/plain"
              : null;
      if (
        !bytes.length ||
        bytes.length > uploadPolicy.maxBytes ||
        (!png && !jpg && !webp && !documentType)
      )
        fail(`附件不能超过${uploadPolicy.maxMB}MB；商品素材支持JPG、PNG、WebP`);
      if (png || jpg || webp) {
        try {
          const original = { bytes, sha256: digest(bytes) };
          await imageDerivative(original, "preview");
          await imageDerivative(original, "thumbnail");
        } catch {
          fail("图片无法解码或像素过大，请选择有效图片");
        }
      }
      const r = await tx(async (c) => {
        const record = await row(req, req.params.id, c, true);
        if (!market) {
          const keys = ["image:" + digest(bytes)];
          if (await findDuplicate(c, keys, record.id))
            fail("已有选品使用相同商品图片，请检查选品池", 409);
          await registerKeys(c, keys, record.id);
        }
        if (
          record.selection_workspace.status === "submitted" ||
          record.archived_at
        )
          fail("此记录不能修改附件", 409);
        const existing = (
          await c.query(
            "SELECT id FROM selection_workspace_assets WHERE selection_id=$1 AND sha256=$2",
            [record.id, digest(bytes)],
          )
        ).rows[0];
        if (existing && researchIds(record).includes(existing.id) !== market)
          fail("同一文件不能同时作为市场附件和商品原始素材", 409);
        const asset = (
          await c.query(
            "INSERT INTO selection_workspace_assets(id,selection_id,filename,content_type,bytes,sha256,position) VALUES($1,$2,$3,$4,$5,$6,(SELECT count(*) FROM selection_workspace_assets WHERE selection_id=$2)) ON CONFLICT(selection_id,sha256) DO UPDATE SET sha256=EXCLUDED.sha256 RETURNING id",
            [
              randomUUID(),
              record.id,
              String(b.filename || "image")
                .replace(/[\\/]/g, "_")
                .slice(0, 200),
              png
                ? "image/png"
                : jpg
                  ? "image/jpeg"
                  : webp
                    ? "image/webp"
                    : documentType,
              bytes,
              digest(bytes),
            ],
          )
        ).rows[0];
        if (market)
          await c.query(
            "UPDATE product_opportunities SET selection_workspace=jsonb_set(selection_workspace,'{researchAssetIds}',$2::jsonb) WHERE id=$1",
            [
              record.id,
              JSON.stringify([...new Set([...researchIds(record), asset.id])]),
            ],
          );
        await event(c, req, record, "upload", {
          assetId: asset.id,
          kind: market ? "market" : "product",
        });
        return asset;
      });
      res.json(r);
    }),
  );
  router.get(
    "/records/:id/assets/:asset",
    run(async (req, res) => {
      await row(req, req.params.id);
      const a = (
        await pool.query(
          "SELECT * FROM selection_workspace_assets WHERE selection_id=$1 AND id=$2",
          [req.params.id, req.params.asset],
        )
      ).rows[0];
      if (!a) fail("附件不存在", 404);
      if (req.query.transport === 'manifest') {
        return res.set('Cache-Control', 'private,no-store').json({ assetTransfer: { size: a.bytes.length, chunkBytes: CHUNK_BYTES, type: a.content_type, sha256: a.sha256 } });
      }
      if (req.query.transport === 'chunk') {
        const index = String(req.query.part || '0');
        if (!/^\d+$/.test(index) || Number(index) * CHUNK_BYTES >= a.bytes.length) fail('附件分片不存在', 416);
        const offset = Number(index) * CHUNK_BYTES;
        return res.set('Cache-Control', 'private,no-store').json({ base64: a.bytes.subarray(offset, offset + CHUNK_BYTES).toString('base64') });
      }
      if (
        a.content_type.startsWith("image/") &&
        ["preview", "thumbnail"].includes(req.query.size)
      ) {
        return res
          .set("Cache-Control", "private,no-store")
          .type("image/webp")
          .send(await imageDerivative(a, req.query.size));
      }
      if (!a.content_type.startsWith("image/")) res.attachment(a.filename);
      res
        .set("Cache-Control", "private,no-store")
        .set("X-Content-Type-Options", "nosniff")
        .type(a.content_type)
        .send(a.bytes);
    }),
  );
  router.put(
    "/records/:id/assets",
    run(async (req, res) => {
      await tx(async (c) => {
        const r = await row(req, req.params.id, c, true);
        if (r.selection_workspace.status === "submitted" || r.archived_at)
          fail("此记录不能修改附件", 409);
        const ids = req.body.ids;
        if (!Array.isArray(ids) || new Set(ids).size !== ids.length)
          fail("图片排序无效");
        const current = (
          await c.query(
            "SELECT id FROM selection_workspace_assets WHERE selection_id=$1",
            [r.id],
          )
        ).rows
          .map((a) => a.id)
          .filter(
            (id) =>
              researchIds(r).includes(id) === (req.body.kind === "market"),
          );
        if (ids.some((id) => !current.includes(id)))
          fail("图片不属于当前记录", 403);
        await c.query(
          "DELETE FROM selection_workspace_assets WHERE selection_id=$1 AND id=ANY($2::uuid[]) AND NOT(id=ANY($3::uuid[]))",
          [r.id, current, ids],
        );
        for (let i = 0; i < ids.length; i++)
          await c.query(
            "UPDATE selection_workspace_assets SET position=$3 WHERE selection_id=$1 AND id=$2",
            [r.id, ids[i], i],
          );
        if (req.body.kind === "market")
          await c.query(
            "UPDATE product_opportunities SET selection_workspace=jsonb_set(selection_workspace,'{researchAssetIds}',$2::jsonb) WHERE id=$1",
            [r.id, JSON.stringify(ids)],
          );
        await event(c, req, r, "reorder-images", {
          kind: req.body.kind || "product",
        });
      });
      res.json({ ok: true });
    }),
  );
  router.post(
    "/jobs/:id/retry",
    run(async (req, res) => {
      const j = (
        await pool.query("SELECT * FROM selection_erp_jobs WHERE id=$1", [
          req.params.id,
        ])
      ).rows[0];
      if (!j) fail("任务不存在", 404);
      const record = await row(req, j.selection_id);
      if (j.status !== "failed") fail("只可重试已明确失败的任务", 409);
      if (record.record_version !== j.selection_version) fail("资料已更新，请提交当前版本，不能重试旧资料",409);
      await pool.query(
        "UPDATE selection_erp_jobs SET status='queued',lease_token=NULL WHERE id=$1 AND status='failed'",
        [j.id],
      );
      res.json({ ok: true });
    }),
  );
  const spreadsheet = async (rows) => {
    const w = new ExcelJS.Workbook(),
      s = w.addWorksheet("选品资料");
    s.addRow([
      "选品ID",
      "版本",
      ...Object.keys(BINDINGS),
      "sourceUrl",
      "selectionRationale",
      "operatingStrategy",
      "referenceLinks_JSON",
      "referencePrices_JSON",
      "supplier",
      "SKU_JSON",
      "salesPlatform",
      "marketReferencePrice",
    ]);
    for (const r of rows)
      s.addRow([
        r.id,
        r.version,
        ...Object.keys(BINDINGS).map((k) => r.data[k] ?? ""),
        r.data.sourceUrl,
        r.data.selectionRationale || "",
        r.data.operatingStrategy || "",
        JSON.stringify(r.data.referenceLinks || []),
        JSON.stringify(r.data.referencePrices || []),
        r.data.supplier,
        JSON.stringify(r.data.skus || []),
        r.data.salesPlatform || "",
        r.data.marketReferencePrice ?? "",
      ]);
    s.views = [{ state: "frozen", ySplit: 1 }];
    s.columns.forEach((c) => (c.width = 24));
    return w;
  };
  router.get(
    "/export",
    run(async (req, res) => {
      const result = await list(req, true);
      if (result.total > 1000) fail("请缩小筛选范围至1000条以内");
      const w = await spreadsheet(result.items);
      res.set("Cache-Control", "private,no-store");
      if (req.query.format === "csv") {
        res
          .type("text/csv")
          .attachment("selections.csv")
          .send(await w.csv.writeBuffer());
      } else
        res
          .type(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          )
          .attachment("selections.xlsx")
          .send(await w.xlsx.writeBuffer());
    }),
  );
  router.post(
    "/import",
    run(async (req, res) => {
      const bytes = Buffer.from(String(req.body.base64 || ""), "base64");
      if (bytes.length > 2000000) fail("导入文件超过2MB");

      const w = new ExcelJS.Workbook();
      if (String(req.body.filename).endsWith(".csv")) {
        const { Readable } = await import("node:stream");
        await w.csv.read(Readable.from([bytes]));
      } else await w.xlsx.load(bytes);
      const quick = readQuickWorkbook(w, req.body.filename);
      if (quick) {
        const s = await snapshot();
        const data = validateData(quick, s);
        if (!req.body.commit)
          return res.json({
            preview: true,
            items: [{ line: 1, data }],
            errors: [],
          });
        return res.json({
          ok: true,
          items: [await tx((c) => save(req, c, data, null, null, s))],
          errors: [],
        });
      }
      const sheet = w.worksheets[0];
      if (!sheet || sheet.rowCount > 501) fail("每次最多导入500条");
      const headers = sheet.getRow(1).values;
      const s = await snapshot(),
        items = [],
        errors = [];
      for (let n = 2; n <= sheet.rowCount; n++) {
        try {
          const data = {};
          sheet.getRow(n).eachCell((cell, col) => {
            if (typeof cell.value === "object" && cell.value !== null)
              fail("不允许公式或复杂单元格");
            data[headers[col]] = cell.value;
          });
          if (Object.keys(data).length === 0) continue;
          if (data["选品ID"]) fail("已有记录请使用批量编辑，不通过导入覆盖");
          data.skus = JSON.parse(data.SKU_JSON || "[]");
          data.referenceLinks = JSON.parse(data.referenceLinks_JSON || "[]");
          data.referencePrices = JSON.parse(data.referencePrices_JSON || "[]");
          items.push({ line: n, data: validateData(data, s) });
        } catch (e) {
          errors.push({ line: n, error: e.message });
        }
      }
      if (!req.body.commit || errors.length)
        return res.json({ preview: true, items, errors });
      const saved = await tx(async (c) => {
        const result = [];
        for (const item of items)
          result.push(await save(req, c, item.data, null, null, s));
        return result;
      });
      res.json({ ok: true, items: saved, errors: [] });
    }),
  );
  router.use(
    "/pool",
    createSelectionPoolRouter({
      pool,
      tx,
      actor,
      person,
      admin,
      config,
      putConfig,
      event,
      snapshot,
      employees,
      employeeTable,
    }),
  );
  return router;
}
