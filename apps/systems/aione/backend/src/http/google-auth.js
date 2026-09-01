import { OAuth2Client } from "google-auth-library";
import { resolveCanonicalGoogleIdentity } from "../auth/canonical-google-identity.js";
import { findGooglePreviewIdentityByEmail } from "../auth/google-preview-identity-registry.js";

const googleClient = new OAuth2Client();
const OAUTH_CALLBACK_PATH = "/api/v1/integrations/1688/oauth/callback";

function enabled(value) {
  return String(value || "false").toLowerCase() === "true";
}

function bearerToken(req) {
  const authorization = String(req.header("authorization") || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function reject(res, status, error, message) {
  return res.status(status).json({ error, message });
}

export async function resolveAioneGoogleIdentity(req, res, next) {
  if (!enabled(process.env.AIONE_REQUIRE_GOOGLE_AUTH)) return next();
  if (req.method === "OPTIONS") return next();
  if (!req.path.startsWith("/api/")) return next();

  // 1688 owns this redirect callback and cannot present an AIONE employee token.
  if (req.path === OAUTH_CALLBACK_PATH) return next();

  const clientId = String(process.env.AIONE_GOOGLE_CLIENT_ID || "").trim();
  if (!clientId) {
    return reject(res, 503, "google_auth_not_configured", "AIONE Google authentication is not configured on the backend.");
  }

  const token = bearerToken(req);
  if (!token) {
    return reject(res, 401, "google_identity_required", "A valid Google sign-in session is required.");
  }

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: token, audience: clientId });
    const payload = ticket.getPayload() || {};
    if (!payload.email || payload.email_verified === false || !payload.sub) {
      return reject(res, 401, "google_identity_invalid", "Google identity verification failed.");
    }

    // Human users must resolve through canonical people + external_identities.
    const canonicalIdentity = await resolveCanonicalGoogleIdentity({
      subject: payload.sub,
      email: payload.email
    });
    if (canonicalIdentity) {
      req.aioneIdentity = canonicalIdentity;
      return next();
    }

    // Transitional exception: the non-human corporate admin principal has not
    // yet moved to the future principal/service-account model. Do not insert it
    // into people merely to make authentication convenient.
    const legacyIdentity = findGooglePreviewIdentityByEmail(payload.email);
    if (legacyIdentity?.subjectType === "admin") {
      req.aioneIdentity = Object.freeze({
        subjectType: "admin",
        subjectId: legacyIdentity.subjectId,
        personId: null,
        authenticatedEmail: payload.email,
        googleSub: payload.sub,
        authSource: "google",
        identitySource: "legacy_admin_bridge"
      });
      return next();
    }

    return reject(res, 403, "aione_identity_not_allowed", "This Google account is not registered as an active AIONE person.");
  } catch (error) {
    console.warn("AIONE Google identity verification rejected", { name: error?.name || "Error" });
    return reject(res, 401, "google_identity_invalid", "Google identity verification failed or the sign-in session expired.");
  }
}
