export function getRequestContext(req) {
  const allowPreview = String(process.env.AIONE_ALLOW_PREVIEW_ACTOR || "false").toLowerCase() === "true";
  const authenticatedIdentity = req.aioneIdentity || {};
  const personId = authenticatedIdentity.personId || (allowPreview ? (req.header("x-aione-person-id") || null) : null);
  const assignmentId = authenticatedIdentity.assignmentId || (allowPreview ? (req.header("x-aione-assignment-id") || null) : null);

  return {
    personId,
    assignmentId,
    actorKind: personId ? "human" : "system",
    sourceSystem: req.header("x-aione-source-system") || "aione",
    correlationId: req.header("x-correlation-id") || null
  };
}

export function requireWriteActor(req, res, next) {
  const context = getRequestContext(req);
  const allowSystemWrites = String(process.env.AIONE_ALLOW_SYSTEM_WRITES || "false").toLowerCase() === "true";
  if (!context.personId && !allowSystemWrites) {
    return res.status(401).json({
      error: "authenticated_actor_required",
      message: "AIONE writes require an authenticated person context unless system writes are explicitly enabled."
    });
  }
  req.aioneContext = context;
  return next();
}
