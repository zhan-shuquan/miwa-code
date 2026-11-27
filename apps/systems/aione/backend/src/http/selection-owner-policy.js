export function selectionReadScope(req) {
  const identity = req.aioneIdentity;
  const isAdmin =
    identity?.subjectType === "admin" &&
    identity.identitySource === "legacy_admin_bridge";
  if (!isAdmin && !identity?.personId) {
    const e = new Error("authenticated_actor_required");
    e.statusCode = 401;
    throw e;
  }
  if (!isAdmin) return { scope: "mine", ownerId: identity.personId };
  if (req.query.scope === "mine") {
    if (!identity.personId) {
      const e = new Error("管理员未关联人员身份，不能使用本人范围");
      e.statusCode = 400;
      throw e;
    }
    return { scope: "mine", ownerId: identity.personId };
  }
  return {
    scope: "all",
    ownerId: String(req.query.ownerPersonId || "").trim() || null,
  };
}
