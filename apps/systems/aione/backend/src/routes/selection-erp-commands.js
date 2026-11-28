import { Router } from "express";
import { numberingMember } from '../services/selection-numbering-person.js';
import { recordSelectionWork } from '../services/selection-workflow.js';
import { randomUUID } from "node:crypto";
import { fail } from "../services/selection-workspace-contract.js";
import { syncResearchTask } from "../services/selection-pool-service.js";
import { requestProductFiles } from '../services/selection-product-files.js';
import { fetchSelectionImage } from '../services/selection-remote-image.js';
import { uploadPolicy } from '../services/selection-upload-policy.js';
import { imageDerivative } from '../services/selection-image-preview.js';
import { createHash } from 'node:crypto';
export function createSelectionERPCommands({ pool, tx, integration }) {
  const router = Router(),
    run = (fn) => async (req, res, next) => {
      try {
        await fn(req, res);
      } catch (e) {
        next(e);
      }
    };
  router.use(integration);
  router.post('/:id/heartbeat',run(async(req,res)=>{
    const updated=await pool.query("UPDATE selection_erp_commands SET lease_until=now()+interval '2 minutes' WHERE id=$1 AND lease_token=$2 AND status='processing' RETURNING id",[req.params.id,req.body.leaseToken]);
    if(!updated.rowCount)fail('商品文件任务租约已失效',409);
    res.json({ok:true});
  }));
  router.get('/:id/sku-images/:index',run(async(req,res)=>{
    const job=(await pool.query("SELECT payload FROM selection_erp_commands WHERE id=$1 AND kind='product_files' AND status='processing'",[req.params.id])).rows[0];
    const index=Number(req.params.index);
    const sku=Number.isInteger(index)&&index>=0 ? job?.payload?.data?.skus?.[index] : null;
    if(!sku || sku.selected===false || !sku.supplierImageUrl)fail('任务未包含此SKU参考图片',404);
    const image=await fetchSelectionImage(sku.supplierImageUrl,uploadPolicy.maxBytes);
    const bytes=Buffer.from(image.base64,'base64');
    await imageDerivative({bytes,sha256:createHash('sha256').update(bytes).digest('hex')},'thumbnail');
    res.json(image);
  }));
  router.get('/:id/assets/:asset', run(async (req, res) => {
    const row = (await pool.query(
      `SELECT a.* FROM selection_workspace_assets a JOIN selection_erp_commands j ON j.selection_id=a.selection_id
       WHERE j.id=$1 AND j.kind='product_files' AND j.status='processing' AND a.id=$2
       AND j.payload->'assets' @> jsonb_build_array(jsonb_build_object('id',a.id::text,'sha256',a.sha256))`,
      [req.params.id, req.params.asset],
    )).rows[0];
    if (!row) fail('商品文件任务附件不存在或已经变化', 404);
    res.type(row.content_type).send(row.bytes);
  }));
  router.post(
    "/claim",
    run(async (req, res) => {
      const jobs = await tx(async (c) => {
        await c.query(
          "SELECT pg_advisory_xact_lock(hashtext('selection-number-flow'))",
        );
        await c.query("UPDATE selection_erp_commands SET status='failed',result='{\"message\":\"人员资料维护已移至ERP员工档案\"}',lease_until=NULL,updated_at=now() WHERE kind='person_prefix' AND status IN ('queued','processing')");
        // Repair only the known legacy null-owner failure, once. ERP still validates
        // the real employee, requested code and reservation; never assign a worker.
        await c.query(`UPDATE selection_erp_commands j SET
          payload=jsonb_set(j.payload,'{memberId}',to_jsonb(p.created_by_person_id)),
          status='queued',lease_until=NULL,updated_at=now()
          FROM product_opportunities p WHERE j.selection_id=p.id AND j.kind='formal_number'
          AND j.status='failed' AND j.payload->>'memberId' IS NULL
          AND j.result->>'message'='负责人未关联有效ERP员工档案'
          AND p.owner_person_id IS NULL AND p.created_by_person_id IS NOT NULL
          AND p.selection_workspace->>'status'='number_pending'`);
        const rows = (
          await c.query(
            "SELECT * FROM selection_erp_commands WHERE status='queued' OR (status='processing' AND lease_until<now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 10",
          )
        ).rows;
        const existingCodes = (
          await c.query(
            "SELECT selection_workspace->'data'->>'item_code' AS code FROM product_opportunities WHERE selection_workspace->'data'->>'item_code'<>''",
          )
        ).rows.map((r) => r.code);
        for (const r of rows) {
          r.lease_token = randomUUID();
          await c.query(
            "UPDATE selection_erp_commands SET status='processing',attempts=attempts+1,lease_token=$2,lease_until=now()+interval '2 minutes' WHERE id=$1",
            [r.id, r.lease_token],
          );
          if (r.kind === "formal_number") {
            const selection = (
              await c.query("SELECT * FROM product_opportunities WHERE id=$1", [
                r.selection_id,
              ])
            ).rows[0];
            if (
              numberingMember(selection || {}) !== r.payload.memberId ||
              selection?.selection_workspace.status !== "number_pending"
            ) {
              await c.query(
                "UPDATE selection_erp_commands SET status='failed',result='{\"message\":\"选品状态或负责人已变更\"}' WHERE id=$1",
                [r.id],
              );
              r.skip = true;
            }
            r.payload.existingCodes = existingCodes;
          }
        }
        return rows.filter((r) => !r.skip);
      });
      res.json({ jobs });
    }),
  );
  router.post(
    "/:id/result",
    run(async (req, res) => {
      if (!["succeeded", "failed"].includes(req.body.status))
        fail("结果状态无效");
      await tx(async (c) => {
        const job = (
          await c.query(
            "SELECT * FROM selection_erp_commands WHERE id=$1 AND lease_token=$2 AND status='processing' FOR UPDATE",
            [req.params.id, req.body.leaseToken],
          )
        ).rows[0];
        if (!job) fail("任务租约已失效", 409);
        const result = req.body.result || {};
        if (job.kind === "formal_number" && req.body.status === "succeeded") {
          if (!/^[A-Za-z0-9_-]{1,12}$/.test(result.code || ""))
            fail("ERP返回货号无效");
          const r = (
            await c.query(
              "SELECT * FROM product_opportunities WHERE id=$1 FOR UPDATE",
              [job.selection_id],
            )
          ).rows[0];
          if (
            r.selection_workspace.status !== "number_pending" ||
            numberingMember(r) !== job.payload.memberId
          )
            fail("负责人已改变，需管理员核对ERP预留", 409);
          if (
            r.selection_workspace.data.item_code &&
            r.selection_workspace.data.item_code !== result.code
          )
            fail("已存在正式货号，不允许重新编号", 409);
          r.selection_workspace.data.item_code = result.code;
          r.selection_workspace.status = "confirmed";
          r.selection_workspace.formalNumber = {
            code: result.code,
            allocatedAt: new Date().toISOString(),
            memberId: job.payload.memberId,
            existingItem: !!result.existingItem,
          };
          const saved = await c.query(
            "UPDATE product_opportunities SET selection_workspace=$2,record_version=record_version+1,updated_at=now() WHERE id=$1 RETURNING *",
            [r.id, JSON.stringify(r.selection_workspace)],
          );
          // Use persisted JSONB ordering and the actual saved version for file-task
          // identity; repeated confirmation must not enqueue the same data twice.
          Object.assign(r, saved.rows[0]);
          await syncResearchTask(c, r, job.payload.actor);
          await recordSelectionWork(c, r, 'confirm-selection', { personId: job.payload.actor,
            detail: { itemCode: result.code, completionBy: 'system', status: 'completed' } });
          await requestProductFiles(c, r, job.payload.actor);
          await c.query(
            "INSERT INTO selection_workspace_events(selection_id,actor_id,action,version,detail) VALUES($1,$2,'erp-formal-number',$3,$4)",
            [
              r.id,
              job.payload.actor,
              r.record_version,
              JSON.stringify(result),
            ],
          );
        }
        if (job.kind === 'product_files') {
          if (req.body.status === 'succeeded' && (result.state !== 'saved' || result.code !== job.payload.data.item_code || result.selectionId !== job.selection_id))
            fail('本地商品文件保存回执不匹配', 409);
          await c.query("UPDATE product_opportunities SET selection_workspace=jsonb_set(selection_workspace,'{fileSync}',$2::jsonb) WHERE id=$1",
            [job.selection_id, JSON.stringify({...result, status:req.body.status, updatedAt:new Date().toISOString()})]);
          await c.query("INSERT INTO selection_workspace_events(selection_id,actor_id,action,version,detail) SELECT id,$2,'product-files',record_version,$3 FROM product_opportunities WHERE id=$1",
            [job.selection_id, job.payload.actor || 'system:erp-connector', JSON.stringify(result)]);
        }
        await c.query(
          "UPDATE selection_erp_commands SET status=$2,result=$3,lease_until=NULL,updated_at=now() WHERE id=$1",
          [
            job.id,
            req.body.status === "failed" && result.retryable && (job.kind === 'product_files' || job.attempts < 5)
              ? "queued"
              : req.body.status,
            JSON.stringify(result),
          ],
        );
      });
      res.json({ ok: true });
    }),
  );
  return router;
}
