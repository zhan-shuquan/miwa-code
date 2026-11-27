import { fetchSelectionImage } from "../services/selection-remote-image.js";
import {
  get1688RuntimeStatus,
  fetch1688ProductByUrl,
} from "../integrations/alibaba1688-client.js";
import { Router } from "express";
import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import {
  parseShareText,
  parseIntakeWorkbook,
  sourceIdentity,
  fingerprint,
} from "../services/selection-intake-contract.js";
import {
  candidateKeys,
  findDuplicate,
  registerKeys,
  intakeOnce,
  createOpportunity,
  syncResearchTask,
} from "../services/selection-pool-service.js";
import { uploadPolicy } from "../services/selection-upload-policy.js";
import { imageDerivative } from "../services/selection-image-preview.js";
import { fail, applyDefaults } from "../services/selection-workspace-contract.js";

export function createSelectionPoolRouter({
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
}) {
  const router = Router(),
    run = (fn) => async (req, res, next) => {
      try {
        await fn(req, res);
      } catch (e) {
        next(e);
      }
    };
  const grants = async (req) =>
    admin(req.aioneIdentity)
      ? { collect: true, assign: true, manage: true }
      : (await config("pool-grants"))?.[person(req)] || {};
  const requireGrant = async (req, key) => {
    if (!(await grants(req))[key]) fail("没有此选品池操作权限", 403);
  };
  const publicView = (r) => ({
    id: r.id,
    selectionNo: r.selection_no,
    title:
      r.title ||
      r.selection_workspace.data.custom_商品长标题中文 ||
      r.selection_workspace.pool?.rawShare?.slice(0, 120) ||
      "图片选品",
    source: r.selection_workspace.pool?.source,
    referencePrice: r.selection_workspace.pool?.referencePrice,
    selector: r.created_by_person_id,
    selectorEmployeeId: r.selector_employee_id,
    ownerEmployeeId: r.owner_employee_id,
    selectorName:r.selector_name || null,
    ownerName:r.owner_name || null,
    owner: r.owner_person_id,
    createdAt: r.created_at,
    version: r.record_version,
    claimState: r.selection_workspace.pool?.state,
    status: r.selection_workspace.status,
    assets: r.assets || [],
  });
  const canRead = (req, r, g) =>
    g.manage ||
    r.owner_person_id === person(req) ||
    (r.selection_workspace.pool?.origin === "public" &&
      r.selection_workspace.pool.state === "pending" &&
      !r.archived_at) ||
    (g.collect && r.created_by_person_id === person(req));
  const load = async (req, c, id, lock = false) => {
    const r = (
      await c.query(
        `SELECT *, (SELECT display_name FROM ${employeeTable} WHERE id=product_opportunities.created_by_person_id) AS selector_name, (SELECT display_name FROM ${employeeTable} WHERE id=product_opportunities.owner_person_id) AS owner_name FROM product_opportunities WHERE id=$1 AND selection_workspace IS NOT NULL ${lock ? "FOR UPDATE" : ""}`,
        [id],
      )
    ).rows[0];
    if (!r || !canRead(req, r, await grants(req)))
      fail("记录不存在或无权访问", 404);
    return r;
  };
  router.get(
    "/bootstrap",
    run(async (req, res) => {
      const g = await grants(req),
        s = await snapshot();
      const people =
        g.assign || g.manage
          ? await employees.eligible()
          : [];
      res.json({
        permissions: {
          ...g,
          configurePeople: admin(req.aioneIdentity),
          configureGrants: admin(req.aioneIdentity) || !!g.manageGrants,
        },
        people,
        grantPeople: (admin(req.aioneIdentity) || g.manageGrants) ? await employees.eligible({includeUnassigned:true}) : [],
        identity: { memberId: person(req) || null },
        uploadPolicy,
        importFields: [
          "title",
          "url",
          "platformId",
          "image",
          "referencePrice",
          "monthlySales",
          "platform",
          "supplier",
          "sourceAddedAt",
          "group",
          "tags",
          "note",
        ],
        erpReviewAvailable: Array.isArray(s.catalog),
        grants: (admin(req.aioneIdentity) || g.manageGrants) ? await config("pool-grants") : undefined,
      });
    }),
  );
  router.put(
    "/grants",
    run(async (req, res) => {
      if (!admin(req.aioneIdentity) && !(await grants(req)).manageGrants)
        fail("没有负责人授权管理权限", 403);
      const staffSnapshot=await config('erp-employees');
      if (staffSnapshot?.identitySchemaVersion === 1 || staffSnapshot?.permissionsSchemaVersion === 1)
        fail('员工业务权限由ERP员工档案统一维护，请在ERP修改后等待自动同步', 409);
      const people = new Set(
          (await employees.eligible({includeUnassigned:true})).map((p) => p.id),
        ),
        value = {};
      for (const [id, g] of Object.entries(req.body || {})) {
        if (!people.has(id)) fail("人员档案不存在");
        value[id] = Object.fromEntries(
          ["research", "collect", "assign", "manage", "manageGrants"].map((k) => [
            k,
            g[k] === true,
          ]),
        );
      }
      await putConfig("pool-grants", value);
      res.json({ ok: true });
    }),
  );
  async function candidates(req) {
    let rows;
    if (req.body.file) {
      const f = req.body.file,
        bytes = Buffer.from(f.base64 || "", "base64");
      if (bytes.length > uploadPolicy.maxBytes) fail("导入文件超过后台限制");
      const parsed = await parseIntakeWorkbook(
        bytes,
        f.filename,
        req.body.mapping || {},
      );
      rows = parsed.rows;
    } else if (req.body.text !== undefined)
      rows = parseShareText(req.body.text);
    else if (Array.isArray(req.body.candidates))
      rows = req.body.candidates.map((r) => ({
        ...r,
        source: r.source?.url ? sourceIdentity(r.source.url) : null,
      }));
    else fail("请提供分享内容、图片或导入文件");
    if (!rows.length || rows.length > 500) fail("每次收集1至500条机会");
    for (const row of rows) {
      if (row.source?.platform === "1688" && !row.source.platformId) {
        try {
          const resolved = await fetchSelectionImage(
            row.source.url.replace(/^http:/, "https:"),
            0,
            0,
            true,
          );
          const canonical = sourceIdentity(resolved.url);
          if (canonical.platformId) {
            row.sourceFacts = {
              ...row.sourceFacts,
              originalUrl: row.source.url,
            };
            row.source = canonical;
          }
        } catch {
          /* Unresolved short links remain collectable. */
        }
      }
    }
    return rows;
  }
  async function assess(c, row, s) {
    if (row.error) return { state: "invalid", reason: row.error };
    if (!row.source && !row.title && !row.rawShare && !row.images?.length)
      return { state: "invalid", reason: "此行没有可保存资料" };
    const keys = candidateKeys(row),
      duplicate = await findDuplicate(c, keys);
    if (duplicate)
      return { state: "duplicate", reason: "已存在相同来源或图片" };
    const erp = (s.catalog || []).find((r) => {
      try {
        return (
          row.source &&
          !row.source.sns &&
          r.url &&
          sourceIdentity(r.url).key === row.source.key
        );
      } catch {
        return false;
      }
    });
    if (erp) return { state: "duplicate", reason: "ERP已存在对应商品" };
    let suspected = false;
    if (row.source?.sns)
      suspected = !!(
        await c.query(
          "SELECT id FROM product_opportunities WHERE selection_workspace->'pool'->'source'->>'key'=$1 LIMIT 1",
          [row.source.key],
        )
      ).rowCount;
    return {
      state: suspected ? "suspected" : "valid",
      keys,
      reason: suspected
        ? "相同SNS内容可能包含多个商品，请核对后保留独立机会"
        : null,
    };
  }
  router.post(
    "/preflight",
    run(async (req, res) => {
      await requireGrant(req, "collect");
      const rows = await candidates(req),
        s = await snapshot(),
        seen = new Set(),
        out = [];
      await tx(async (c) => {
        for (const row of rows) {
          let a = await assess(c, row, s);
          if (a.keys?.some((k) => seen.has(k)))
            a = { state: "duplicate", reason: "本批次重复" };
          for (const k of a.keys || []) seen.add(k);
          out.push({
            line: row.line,
            title: row.title,
            source: row.source,
            state: a.state,
            reason: a.reason,
          });
        }
      });
      res.json({
        rows: out,
        valid: out.filter((r) => r.state === "valid").length,
        duplicate: out.filter((r) => r.state === "duplicate").length,
        invalid: out.filter((r) => r.state === "invalid").length,
        suspected: out.filter((r) => r.state === "suspected").length,
      });
    }),
  );
  router.post(
    "/collect",
    run(async (req, res) => {
      await requireGrant(req, "collect");
      if (!person(req)) fail("请先关联会员档案", 400);
      if (!req.body.requestKey) fail("缺少收集请求标识");
      const rows = await candidates(req),
        s = await snapshot();
      // Decode before opening a transaction, preserving the shared original/preview contract.
      for (const row of rows) {
        if (
          row.referencePrice != null &&
          (!Number.isFinite(Number(row.referencePrice)) ||
            Number(row.referencePrice) < 0)
        )
          row.error = "参考采购价格无效";
        if (row.source?.platform === "1688" && get1688RuntimeStatus().ready) {
          try {
            const { product } = await fetch1688ProductByUrl(row.source.url);
            row.title = product.title || row.title;
            row.referencePrice ??= product.purchasePrice;
            row.sourceFacts = {
              ...row.sourceFacts,
              recognizedAt: product.fetchedAt,
              image: product.mainImage,
              supplier: product.supplier?.name,
            };
          } catch (e) {
            row.sourceFacts = {
              ...row.sourceFacts,
              recognitionWarning: e.message,
            };
          }
        }
        if (!row.images?.length && row.sourceFacts?.image) {
          try {
            row.images = [
              await fetchSelectionImage(
                row.sourceFacts.image,
                uploadPolicy.maxBytes,
              ),
            ];
          } catch (e) {
            row.sourceFacts.imageWarning = e.message;
          }
        }
        try {
          row.prepared = [];
          for (const file of row.images || []) {
            const bytes = Buffer.from(file.base64 || "", "base64");
            if (bytes.length > uploadPolicy.maxBytes)
              throw Error("单张图片超过后台限制");
            const contentType = bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
              ? "image/png"
              : bytes[0] === 255 && bytes[1] === 216
                ? "image/jpeg"
                : bytes.toString("ascii", 0, 4) === "RIFF" &&
                    bytes.toString("ascii", 8, 12) === "WEBP"
                  ? "image/webp"
                  : null;
            if (!contentType) throw Error("请上传有效JPG、PNG或WebP图片");
            const sha256 = fingerprint(bytes);
            if (row.prepared.some((i) => i.sha256 === sha256)) continue;
            await imageDerivative({ bytes, sha256 }, "preview");
            await imageDerivative({ bytes, sha256 }, "thumbnail");
            row.prepared.push({
              bytes,
              sha256,
              contentType,
              filename: String(file.filename || "image").replace(/[\\/]/g, "_"),
            });
          }
        } catch (e) {
          row.error = e.message;
        }
      }
      const result = await tx((c) =>
        intakeOnce(c, actor(req), req.body.requestKey, req.body, async () => {
          const items = [];
          for (const row of rows) {
            const a = await assess(c, row, s);
            if (["invalid", "duplicate"].includes(a.state)) {
              items.push({ state: a.state, line: row.line, reason: a.reason });
              continue;
            }
            if (a.state === "suspected" && !req.body.keepSuspected) {
              items.push({
                state: "suspected",
                line: row.line,
                reason: a.reason,
              });
              continue;
            }
            const r = await createOpportunity(c, {
              actor: actor(req),
              candidate: row,
              snapshot: await snapshot(),
            });
            await registerKeys(c, a.keys, r.id);
            for (const [position, img] of row.prepared.entries())
              await c.query(
                "INSERT INTO selection_workspace_assets(id,selection_id,filename,content_type,bytes,sha256,position) VALUES($1,$2,$3,$4,$5,$6,$7)",
                [
                  randomUUID(),
                  r.id,
                  img.filename,
                  img.contentType,
                  img.bytes,
                  img.sha256,
                  position,
                ],
              );
            await event(c, req, r, "pool-collect", {
              source: row.source?.platform || "image",
            });
            items.push({
              state: "created",
              ...publicView(r),
              reason:
                [
                  row.sourceFacts?.imageWarning,
                  row.sourceFacts?.recognitionWarning,
                ]
                  .filter(Boolean)
                  .join("；") || undefined,
            });
          }
          return { items };
        }),
      );
      res.status(201).json(result);
    }),
  );
  async function list(req, exporting = false) {
    const g = await grants(req),
      q = req.query,
      scope = q.scope || "pending";
    if (scope === "all" && !g.manage) fail("没有全部选品查看权限", 403);
    const values = [person(req) || ""],
      conditions = [
        "$1::text IS NOT NULL",
        "selection_workspace->'pool'->>'origin'='public'",
      ];
    if (scope === "pending")
      conditions.push(
        "selection_workspace->'pool'->>'state'='pending' AND archived_at IS NULL",
      );
    else if (scope === "mine")
      conditions.push("owner_person_id=$1 AND archived_at IS NULL");
    else if (scope !== "all") fail("列表范围无效");
    const bind = (v) => {
      values.push(v);
      return "$" + values.length;
    };
    if (q.q) {
      const p = bind("%" + String(q.q).slice(0, 300) + "%");
      conditions.push(
        `(selection_no ILIKE ${p} OR title ILIKE ${p} OR selection_workspace->'data'->>'custom_商品长标题中文' ILIKE ${p} OR selection_workspace->'data'->>'item_name' ILIKE ${p} OR selection_workspace->'data'->>'item_code' ILIKE ${p})`,
      );
    }
    for (const [key, field] of Object.entries({
      selector: "created_by_person_id",
      owner: "owner_person_id",
      platform: "selection_workspace->'pool'->'source'->>'platform'",
      state: "selection_workspace->'pool'->>'state'",
    }))
      if (q[key]) conditions.push(field + "=" + bind(String(q[key])));
    for (const key of ["from", "to"])
      if (q[key]) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(q[key])) fail("日期无效");
        conditions.push(
          `(created_at AT TIME ZONE 'Asia/Tokyo')::date ${key === "from" ? ">=" : "<="} ${bind(q[key])}::date`,
        );
      }
    const sorts = {
      selectionNo: "(selection_date,length(selection_no),selection_no)",
      title: "title",
      platform: "selection_workspace->'pool'->'source'->>'platform'",
      referencePrice:
        "NULLIF(selection_workspace->'pool'->>'referencePrice','')::numeric",
      selector: `(SELECT display_name FROM ${employeeTable} WHERE id=product_opportunities.created_by_person_id)`,
      owner: `(SELECT display_name FROM ${employeeTable} WHERE id=product_opportunities.owner_person_id)`,
      createdAt: "created_at",
      claimState: "selection_workspace->'pool'->>'state'",
      status: "selection_workspace->>'status'",
    };
    const where = conditions.join(" AND "),
      total = Number(
        (
          await pool.query(
            "SELECT count(*) FROM product_opportunities WHERE " + where,
            values,
          )
        ).rows[0].count,
      );
    const limit = exporting
        ? 10000
        : Math.min(100, Math.max(1, Number(q.limit) || 24)),
      offset = exporting ? 0 : Math.max(0, Number(q.offset) || 0);
    const rows = (
      await pool.query(
        `SELECT *, (SELECT display_name FROM ${employeeTable} WHERE id=product_opportunities.created_by_person_id) AS selector_name, (SELECT display_name FROM ${employeeTable} WHERE id=product_opportunities.owner_person_id) AS owner_name FROM product_opportunities WHERE ${where} ORDER BY ${sorts[q.sort] || "created_at"} ${q.direction === "asc" ? "ASC" : "DESC"} NULLS LAST,selection_date DESC,length(selection_no) DESC,selection_no DESC,id LIMIT ${bind(limit)} OFFSET ${bind(offset)}`,
        values,
      )
    ).rows;
    for (const r of rows)
      r.assets = (
        await pool.query(
          "SELECT id,filename FROM selection_workspace_assets WHERE selection_id=$1 AND NOT (id::text IN (SELECT jsonb_array_elements_text(COALESCE($2::jsonb,'[]')))) ORDER BY position,created_at",
          [r.id, JSON.stringify(r.selection_workspace.researchAssetIds || [])],
        )
      ).rows;
    return { items: rows.map(publicView), total, limit, offset };
  }
  router.get(
    "/records",
    run(async (req, res) => res.json(await list(req))),
  );
  router.get(
    "/export",
    run(async (req, res) => {
      const result = await list(req, true),
        book = new ExcelJS.Workbook(),
        sheet = book.addWorksheet("选品池");
      sheet.addRow([
        "选品货号",
        "标题",
        "来源",
        "参考采购价",
        "原始选品人",
        "负责人",
        "入池时间",
        "认领状态",
        "研究状态",
        "来源链接",
      ]);
      for (const r of result.items)
        sheet.addRow([
          r.selectionNo,
          r.title,
          r.source?.platform,
          r.referencePrice,
          r.selector,
          r.owner,
          r.createdAt,
          r.claimState,
          r.status,
          r.source?.url,
        ]);
      res
        .attachment("selection-pool.xlsx")
        .send(Buffer.from(await book.xlsx.writeBuffer()));
    }),
  );
  router.get(
    "/records/:id",
    run(async (req, res) => {
      const r = await load(req, pool, req.params.id);
      res.json({
        ...publicView(r),
        rawShare: r.selection_workspace.pool?.rawShare || "",
        sourceFacts: r.selection_workspace.pool?.sourceFacts || {},
      });
    }),
  );
  router.get(
    "/records/:id/assets/:asset",
    run(async (req, res) => {
      const r = await load(req, pool, req.params.id);
      const a = (
        await pool.query(
          "SELECT * FROM selection_workspace_assets WHERE selection_id=$1 AND id=$2",
          [r.id, req.params.asset],
        )
      ).rows[0];
      if (!a || (r.selection_workspace.researchAssetIds || []).includes(a.id))
        fail("图片不存在", 404);
      res
        .set("Cache-Control", "private,no-store")
        .type("image/webp")
        .send(
          await imageDerivative(
            a,
            req.query.size === "thumbnail" ? "thumbnail" : "preview",
          ),
        );
    }),
  );
  router.post(
    "/action",
    run(async (req, res) => {
      const { action, ids, owner, reason } = req.body,
        g = await grants(req);
      if (
        !Array.isArray(ids) ||
        !ids.length ||
        ids.length > 200 ||
        new Set(ids).size !== ids.length
      )
        fail("请选择1至200条不同记录");
      if (!["claim", "assign", "return", "abandon", "archive"].includes(action))
        fail("操作无效");
      if (action === "assign" && !g.assign) fail("没有分配权限", 403);
      if (action === "archive" && !g.manage) fail("没有归档权限", 403);
      if (action === "claim" && !person(req)) fail("请先关联会员档案");
      if (action === "abandon" && !String(reason || "").trim())
        fail("请填写简短放弃原因");
      if (
        action === "assign" &&
        !(await employees.eligible()).some(e=>e.id===owner)
      )
        fail("负责人尚未关联在职ERP员工或未获选品业务权限");
      const result = await tx(async (c) => {
        await c.query(
          "SELECT pg_advisory_xact_lock(hashtext('selection-number-flow'))",
        );
        const out = [];
        for (const id of [...ids].sort()) {
          // Assignment managers may access claimed rows without receiving their private data.
          const r = (
            await c.query(
              `SELECT *, (SELECT display_name FROM ${employeeTable} WHERE id=product_opportunities.created_by_person_id) AS selector_name, (SELECT display_name FROM ${employeeTable} WHERE id=product_opportunities.owner_person_id) AS owner_name FROM product_opportunities WHERE id=$1 AND selection_workspace IS NOT NULL FOR UPDATE`,
              [id],
            )
          ).rows[0];
          if (!r || r.selection_workspace.pool?.origin !== "public")
            fail("记录不存在", 404);
          const ws = r.selection_workspace,
            p = ws.pool;
          if (
            r.archived_at ||
            ws.status === "submitted" ||
            (ws.data.item_code && action !== "assign")
          )
            fail("此状态不允许当前操作；正式货号保持不变", 409);
          if (action === "claim" && p.state !== "pending") {
            if (r.owner_person_id === person(req) && p.state === "claimed") {
              out.push(publicView(r));
              continue;
            }
            fail("该商品已经被认领", 409);
          }
          if (
            !["claim", "assign"].includes(action) &&
            !g.manage &&
            r.owner_person_id !== person(req)
          )
            fail("没有此记录操作权限", 403);
          const now = new Date().toISOString(),
            previousOwner = r.owner_person_id;
          if (["claim", "assign"].includes(action))
            ws.data = applyDefaults(ws.data || {}, await snapshot());
          if (action === "claim") {
            r.owner_person_id = person(req);
            Object.assign(p, {
              state: "claimed",
              claimedBy: person(req),
              claimedAt: now,
            });
          }
          if (action === "assign") {
            r.owner_person_id = owner;
            Object.assign(p, {
              state: "assigned",
              assignedBy: actor(req),
              assignedAt: now,
            });
          }
          if (action === "return") {
            r.owner_person_id = null;
            p.state = "pending";
          }
          if (action === "abandon") {
            p.state = "abandoned";
            p.abandonReason = String(reason).slice(0, 2000);
          }
          if (action === "archive") p.state = "archived";
          // A pending number request cannot remain queued for a former owner.
          if (["assign", "return", "abandon", "archive"].includes(action)) {
            const active = (
              await c.query(
                "SELECT id FROM selection_erp_commands WHERE selection_id=$1 AND kind='formal_number' AND status='processing' FOR UPDATE",
                [id],
              )
            ).rowCount;
            if (active) fail("正式货号正在申请，请待申请完成后处理", 409);
            await c.query(
              "UPDATE selection_erp_commands SET status='failed',result='{\"message\":\"负责人变更，需重新确认\"}' WHERE selection_id=$1 AND kind='formal_number' AND status='queued'",
              [id],
            );
            if (ws.status === "number_pending") ws.status = "draft";
          }
          const updated = (
            await c.query(
              "UPDATE product_opportunities SET owner_person_id=$2,selection_workspace=$3,archived_at=CASE WHEN $4 THEN now() ELSE archived_at END,record_version=record_version+1,updated_at=now() WHERE id=$1 RETURNING *",
              [id, r.owner_person_id, JSON.stringify(ws), action === "archive"],
            )
          ).rows[0];
          await syncResearchTask(c, updated, actor(req));
          await event(c, req, updated, "pool-" + action, {
            previousOwner,
            owner: updated.owner_person_id,
            reason: reason || null,
          });
          out.push(publicView(updated));
        }
        return { items: out };
      });
      res.json(result);
    }),
  );
  router.get(
    "/tasks",
    run(async (req, res) => {
      const exists = (
        await pool.query("SELECT to_regclass('public.work_items') AS t")
      ).rows[0].t;
      res.json({
        items: exists
          ? (
              await pool.query(
                `SELECT id,title,status,metadata,owner_person_id,(SELECT display_name FROM ${employeeTable} WHERE id=work_items.owner_person_id) AS owner_name FROM work_items WHERE owner_person_id=$1 AND work_type='selection_research' AND status NOT IN ('cancelled','archived') ORDER BY updated_at DESC`,
                [person(req)],
              )
            ).rows
          : [],
      });
    }),
  );
  router.get('/people',run(async(req,res)=> {
    const own=await employees.profile(person(req));
    res.json({...own, canEdit:false, people:own.employee ? [{id:own.employee.memberId,display_name:own.employee.name,erp:own.employee}] : []});
  }));
  router.post('/people/prefix',run(async()=>fail('正式人员资料请在ERP员工档案中维护',410)));
  return router;
}
