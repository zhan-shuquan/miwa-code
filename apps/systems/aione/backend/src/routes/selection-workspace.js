import { Router } from "express";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import {
  readQuickWorkbook,
  quickWorkbook,
  skuWorkbook,
} from "../services/selection-file-contract.js";
import {
  BINDINGS,
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
        `SELECT * FROM product_opportunities WHERE id=$1 AND selection_workspace IS NOT NULL AND ($2::boolean OR owner_person_id=$3) ${lock ? "FOR UPDATE" : ""}`,
        [id, admin(req.aioneIdentity), person(req) || ""],
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
  const view = (r) => ({
    id: r.id,
    owner: r.owner_person_id,
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
    return result;
  };
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
      s.verified = false;
      s.version = digest(parameterFacts(s));
      s.receivedAt = new Date().toISOString();
      await putConfig("erp", s);
      await putConfig("connection", { lastSeen: s.receivedAt });
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
            "SELECT * FROM selection_erp_jobs WHERE status='queued' OR (status='processing' AND lease_until<now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 5",
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
      const r = await pool.query(
        "UPDATE selection_erp_jobs SET status=$2,result=$3,lease_until=NULL,updated_at=now() WHERE id=$1 AND lease_token=$4 AND status='processing' RETURNING id",
        [req.params.id, b.status, JSON.stringify(b.result || {}), b.leaseToken],
      );
      if (!r.rowCount) fail("租约已失效或任务已经完成", 409);
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
  router.use(auth);
  router.get(
    "/bootstrap",
    run(async (req, res) => {
      const s = await snapshot(),
        fields = fieldsFor(s),
        connection = await config("connection");
      const defaults = defaultLayout(fields),
        layout = (await config("layout")) || defaults;
      layout.fields = layout.fields.filter((f) =>
        fields.some((x) => x.id === f.id),
      );
      for (const f of defaults.fields)
        if (!layout.fields.some((x) => x.id === f.id)) layout.fields.push(f);
      res.json({
        identity: {
          id: actor(req),
          name: req.aioneIdentity.displayName || actor(req),
          admin: admin(req.aioneIdentity),
        },
        fields,
        layout,
        defaults,
        parameters: {
          version: s.version,
          verified: false,
          source: s.source,
          capturedAt: s.capturedAt,
        },
        connection: {
          ...connection,
          online:
            !!connection &&
            Date.now() - Date.parse(connection.lastSeen) < 180000,
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
      const allowed = new Set(['image','item_code','item_name','item_group','custom_库存类型','cost','suggestion','price','profit','margin','owner','createdAt','status']);
      const {columns, widths = {}} = req.body;
      if (columns !== undefined && (!Array.isArray(columns) || !columns.length || new Set(columns).size !== columns.length || columns.some(key => !allowed.has(key)))) fail('显示列配置无效');
      if (!widths || typeof widths !== 'object' || Array.isArray(widths) || Object.entries(widths).some(([key,value]) => !allowed.has(key) || !Number.isFinite(value) || value < 50 || value > 2000)) fail('列宽配置无效');
      await putConfig("preferences:" + actor(req), { ...(columns ? {columns} : {}), widths });
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
  router.post(
    "/identify",
    run(async (req, res) => {
      const s = await snapshot();
      const response = await fetch(costUrl + "/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshot: s,
          title: String(req.body.title || "").slice(0, 2000),
        }),
        signal: AbortSignal.timeout(5000),
      });
      const result = await response.json();
      if (!response.ok) fail(result.error || "ERP识别不可用", 422);
      if (!s.categories.some((c) => c.name === result.category))
        result.category = null;
      res.json(result);
    }),
  );
  router.post(
    "/sku-file",
    run(async (req, res) => {
      const bytes = Buffer.from(String(req.body.base64 || ""), "base64");
      if (bytes.length > 2000000) fail("SKU文件超过2MB");
      const w = new ExcelJS.Workbook();
      await w.xlsx.load(bytes);
      const sheet = w.worksheets.find((s) =>
        s.getRow(1).values.includes("SKU ID"),
      );
      if (!sheet) fail("未找到ERP兼容SKU表头（SKU ID、SKU名称、原价（元））");
      if (sheet.rowCount > 501) fail("SKU最多500行");
      const header = sheet.getRow(1).values,
        skus = [];
      for (let n = 2; n <= sheet.rowCount; n++) {
        const row = {};
        sheet.getRow(n).eachCell((c, i) => {
          if (c.value !== null && typeof c.value === "object")
            fail("SKU表不允许公式");
          row[header[i]] = c.value;
        });
        if (!row["SKU ID"]) continue;
        skus.push({
          code: String(row["SKU ID"]),
          spec: String(row["SKU名称"] || ""),
          cost: row["原价（元）"],
          weight: row["重量(g)"],
          price: row["售价(JPY)"],
        });
      }
      res.json({ skus: validateData({ skus }, await snapshot()).skus });
    }),
  );
  const list = async (req, unlimited = false) => {
    const q = req.query,
      values = [
        admin(req.aioneIdentity),
        person(req) || "",
        String(q.q || ""),
        String(q.status || ""),
        q.archived === "true",
      ];
    let where =
      "selection_workspace IS NOT NULL AND ($1::boolean OR owner_person_id=$2) AND ($3='' OR title ILIKE '%'||$3||'%' OR selection_workspace->'data'->>'item_code' ILIKE '%'||$3||'%') AND ($4='' OR selection_workspace->>'status'=$4) AND (archived_at IS NOT NULL)=$5";
    if (q.owner && admin(req.aioneIdentity)) {
      values.push(q.owner);
      where += " AND owner_person_id=$" + values.length;
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
    const sorts = {
      createdAt: "created_at",
      updatedAt: "updated_at",
      profit:
        "(selection_workspace->'pricing'->'results'->>'custom_运营后毛利润')::numeric",
      margin:
        "(selection_workspace->'pricing'->'results'->>'custom_运营后毛利率')::numeric",
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
        `SELECT * FROM product_opportunities WHERE ${where} ORDER BY ${sorts[q.sort] || sorts.createdAt} ${q.direction === "asc" ? "ASC" : "DESC"} NULLS LAST,id LIMIT $${values.length - 1} OFFSET $${values.length}`,
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
      assets.forEach((a, i) =>
        folder.file(
          "images/" +
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
            testOnly: true,
            assets: assets.map((a) => ({
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
    const data = validateData(input, s);
    let previous = id ? await row(req, id, c, true) : null;
    if (previous && previous.record_version !== Number(version))
      fail("记录已被修改，请重新加载", 409);
    if (
      previous &&
      (previous.archived_at ||
        previous.selection_workspace.status === "submitted")
    )
      fail("已归档或已提交ERP的记录不能直接覆盖；请复制为新草稿", 409);
    const pricing = await calculate(data, s),
      workspace = { data, pricing, status: "draft" };
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
    await event(c, req, r, previous ? "update" : "create");
    return view(r);
  };
  router.post(
    "/records",
    run(async (req, res) => {
      const s = await snapshot();
      res
        .status(201)
        .json(await tx((c) => save(req, c, req.body.data, null, null, s)));
    }),
  );
  router.get(
    "/records/:id",
    run(async (req, res) => {
      const r = await row(req, req.params.id);
      res.json({
        ...view(r),
        assets: (
          await pool.query(
            "SELECT id,filename,content_type,position FROM selection_workspace_assets WHERE selection_id=$1 ORDER BY position,created_at",
            [r.id],
          )
        ).rows,
        events: (
          await pool.query(
            "SELECT actor_id,action,version,created_at FROM selection_workspace_events WHERE selection_id=$1 ORDER BY id DESC LIMIT 50",
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
        const out = [];
        for (const item of [...items].sort((a, b) =>
          a.id.localeCompare(b.id),
        )) {
          const r = await row(req, item.id, c, true);
          if (r.record_version !== Number(item.version))
            fail("批量操作存在版本冲突，未保存任何修改", 409);
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
            for (const a of assets)
              await c.query(
                "INSERT INTO selection_workspace_assets(id,selection_id,filename,content_type,bytes,sha256,position) VALUES($1,$2,$3,$4,$5,$6,$7)",
                [
                  randomUUID(),
                  saved.id,
                  a.filename,
                  a.content_type,
                  a.bytes,
                  a.sha256,
                  a.position,
                ],
              );
            out.push(saved);
            continue;
          }
          if (action === "submit") {
            if (r.archived_at) fail("已归档记录不能提交");
            const data = validateData(r.selection_workspace.data, s, {
              submit: true,
            });
            const assets = (
              await c.query(
                "SELECT id,filename,sha256,position FROM selection_workspace_assets WHERE selection_id=$1 ORDER BY position",
                [r.id],
              )
            ).rows;
            if (!assets.length) fail("提交前请上传商品主图");
            const pricing = await calculate(data, s);
            if (pricing.status === "incomplete") fail(pricing.message);
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
                    parameterVersion: s.version,
                    testOnly: true,
                    allowPublish: false,
                    allowPaidAI: false,
                  }),
                ],
              )
            ).rows[0];
            await c.query(
              "UPDATE product_opportunities SET selection_workspace=jsonb_set(selection_workspace,'{status}','\"submitted\"') WHERE id=$1",
              [r.id],
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
      const b = req.body,
        bytes = Buffer.from(String(b.base64 || ""), "base64");
      const png = bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
        webp =
          bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP";
      if (!bytes.length || bytes.length > 2000000 || (!png && !jpg && !webp))
        fail("请上传2MB以内的PNG、JPEG或WebP图片");
      const r = await tx(async (c) => {
        const record = await row(req, req.params.id, c, true);
        if (
          record.selection_workspace.status === "submitted" ||
          record.archived_at
        )
          fail("此记录不能修改附件", 409);
        const asset = (
          await c.query(
            "INSERT INTO selection_workspace_assets(id,selection_id,filename,content_type,bytes,sha256,position) VALUES($1,$2,$3,$4,$5,$6,(SELECT count(*) FROM selection_workspace_assets WHERE selection_id=$2)) ON CONFLICT(selection_id,sha256) DO UPDATE SET sha256=EXCLUDED.sha256 RETURNING id",
            [
              randomUUID(),
              record.id,
              String(b.filename || "image")
                .replace(/[\\/]/g, "_")
                .slice(0, 200),
              png ? "image/png" : jpg ? "image/jpeg" : "image/webp",
              bytes,
              digest(bytes),
            ],
          )
        ).rows[0];
        await event(c, req, record, "upload", { assetId: asset.id });
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
        ).rows.map((a) => a.id);
        if (ids.some((id) => !current.includes(id)))
          fail("图片不属于当前记录", 403);
        await c.query(
          "DELETE FROM selection_workspace_assets WHERE selection_id=$1 AND NOT(id=ANY($2::uuid[]))",
          [r.id, ids],
        );
        for (let i = 0; i < ids.length; i++)
          await c.query(
            "UPDATE selection_workspace_assets SET position=$3 WHERE selection_id=$1 AND id=$2",
            [r.id, ids[i], i],
          );
        await event(c, req, r, "reorder-images");
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
      await row(req, j.selection_id);
      if (j.status !== "failed") fail("只可重试已明确失败的任务", 409);
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
      "supplier",
      "SKU_JSON",
    ]);
    for (const r of rows)
      s.addRow([
        r.id,
        r.version,
        ...Object.keys(BINDINGS).map((k) => r.data[k] ?? ""),
        r.data.sourceUrl,
        r.data.supplier,
        JSON.stringify(r.data.skus || []),
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
  return router;
}
