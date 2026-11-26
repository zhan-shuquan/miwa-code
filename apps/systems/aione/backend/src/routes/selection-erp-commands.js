import { Router } from "express";
import { randomUUID } from "node:crypto";
import { fail } from "../services/selection-workspace-contract.js";
import { syncResearchTask } from "../services/selection-pool-service.js";
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
  router.post(
    "/claim",
    run(async (req, res) => {
      const jobs = await tx(async (c) => {
        await c.query(
          "SELECT pg_advisory_xact_lock(hashtext('selection-number-flow'))",
        );
        await c.query("UPDATE selection_erp_commands SET status='failed',result='{\"message\":\"人员资料维护已移至ERP员工档案\"}',lease_until=NULL,updated_at=now() WHERE kind='person_prefix' AND status IN ('queued','processing')");
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
              selection?.owner_person_id !== r.payload.memberId ||
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
            r.owner_person_id !== job.payload.memberId
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
          await c.query(
            "UPDATE product_opportunities SET selection_workspace=$2,record_version=record_version+1,updated_at=now() WHERE id=$1",
            [r.id, JSON.stringify(r.selection_workspace)],
          );
          await syncResearchTask(c, r, job.payload.actor);
          await c.query(
            "INSERT INTO selection_workspace_events(selection_id,actor_id,action,version,detail) VALUES($1,$2,'erp-formal-number',$3,$4)",
            [
              r.id,
              job.payload.actor,
              r.record_version + 1,
              JSON.stringify(result),
            ],
          );
        }
        await c.query(
          "UPDATE selection_erp_commands SET status=$2,result=$3,lease_until=NULL,updated_at=now() WHERE id=$1",
          [
            job.id,
            req.body.status === "failed" && result.retryable && job.attempts < 5
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
