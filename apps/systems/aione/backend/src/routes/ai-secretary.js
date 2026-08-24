import express from "express";
import { getRequestContext } from "../http/context.js";
import { AI_OFFICES } from "../ai/office-registry.js";
import { getAISecretaryRuntimeStatus, getAISecretaryWriteRuntimeStatus, executeAISecretary, confirmAISecretaryProposal } from "../ai/ai-secretary-service.js";
import { AI_SECRETARY_TOOLS } from "../ai/tool-registry.js";

const router = express.Router();
router.get("/status", (req, res) => res.json({
  ...getAISecretaryRuntimeStatus(),
  ...getAISecretaryWriteRuntimeStatus(),
  offices:Object.values(AI_OFFICES),
  toolNames:AI_SECRETARY_TOOLS.map((item)=>item.name),
  writePolicy:"human_confirmation_required",
  secretPolicy:"backend_only"
}));
router.post("/execute", async (req, res, next) => {
  const objective = String(req.body?.objective || "").trim();
  if (!objective) return res.status(400).json({ error:"objective_required", message:"请先告诉AI秘书要完成什么。" });
  try {
    const result = await executeAISecretary({ objective, officeCode:req.body?.officeCode || "chairman", contextSnapshot:req.body?.contextSnapshot || {}, requestContext:getRequestContext(req) });
    res.json(result);
  } catch (error) { next(error); }
});
router.post("/confirm", async (req, res, next) => {
  try {
    const result = await confirmAISecretaryProposal({ proposal:req.body?.proposal, proposalId:req.body?.proposalId || null, officeCode:req.body?.officeCode || "chairman", contextSnapshot:req.body?.contextSnapshot || {}, requestContext:getRequestContext(req) });
    res.json(result);
  } catch (error) { next(error); }
});
export default router;
