import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  const identity = req.aioneIdentity || null;
  if (!identity) {
    return res.status(401).json({
      error: "google_identity_required",
      message: "A valid AIONE identity is required."
    });
  }

  return res.json({
    subjectType: identity.subjectType,
    subjectId: identity.subjectId,
    personId: identity.personId || null,
    displayName: identity.displayName || null,
    primaryEmail: identity.primaryEmail || identity.authenticatedEmail || null,
    authenticatedEmail: identity.authenticatedEmail || null,
    googleSub: identity.googleSub || null,
    authSource: identity.authSource || "google",
    identitySource: identity.identitySource || "unknown"
  });
});

export default router;
