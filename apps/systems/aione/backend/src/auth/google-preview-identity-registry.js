/*
 * AIONE Google Preview Identity Registry
 *
 * Temporary V1.9.21 bridge: server-side ownership mapping for the current
 * internal preview users. The browser-provided person id is never trusted in
 * production. Replace this registry with public.external_identities once that
 * table is wired into the authentication service.
 */

const IDENTITIES = Object.freeze([
  { subjectType: "person", subjectId: "86000", email: "mcpu2014@gmail.com" },
  { subjectType: "person", subjectId: "86001", email: "15105034553l@gmail.com" },
  { subjectType: "person", subjectId: "86002", email: "ccemilla0829@gmail.com" },
  { subjectType: "person", subjectId: "86003", email: "foreverfish26@gmail.com" },
  { subjectType: "person", subjectId: "86004", email: "lby13606017336@gmail.com" },
  { subjectType: "person", subjectId: "86005", email: "yamadakiyohara@gmail.com" },
  { subjectType: "person", subjectId: "86018", email: "sly1252@gmail.com" },
  { subjectType: "admin", subjectId: "ADM-CORP-001", email: "info@miwa-happyhouse.com" }
].map((item) => Object.freeze(item)));

export function findGooglePreviewIdentityByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;
  return IDENTITIES.find((item) => item.email.toLowerCase() === normalizedEmail) || null;
}

export function listGooglePreviewIdentityKeys() {
  return IDENTITIES.map(({ subjectType, subjectId, email }) => ({ subjectType, subjectId, email }));
}
