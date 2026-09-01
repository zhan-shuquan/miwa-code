import pool, { withTransaction } from "../../db.js";

function clean(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function toIdentity(row) {
  if (!row) return null;
  return Object.freeze({
    subjectType: "person",
    subjectId: String(row.person_id || row.id),
    personId: String(row.person_id || row.id),
    displayName: row.display_name || null,
    primaryEmail: row.primary_email || null,
    authenticatedEmail: row.email_snapshot || row.primary_email || null,
    googleSub: row.provider_subject || null,
    authSource: "google",
    identitySource: "canonical_database"
  });
}

export async function resolveCanonicalGoogleIdentity({ subject, email }) {
  const googleSub = clean(subject);
  const normalizedEmail = normalizeEmail(email);
  if (!googleSub || !normalizedEmail) return null;

  const existing = await pool.query(
    `SELECT
       p.id AS person_id,
       p.display_name,
       p.primary_email,
       e.subject AS provider_subject,
       e.email_snapshot
     FROM public.external_identities e
     JOIN public.people p ON p.id = e.person_id
     WHERE e.provider = 'google'
       AND e.subject = $1
       AND e.status = 'active'
       AND p.status = 'active'
       AND p.archived_at IS NULL
     LIMIT 1`,
    [googleSub]
  );

  if (existing.rowCount) {
    const row = existing.rows[0];
    await pool.query(
      `UPDATE public.external_identities
          SET email_snapshot = $2,
              last_authenticated_at = NOW(),
              updated_at = NOW()
        WHERE provider = 'google' AND subject = $1`,
      [googleSub, normalizedEmail]
    );
    row.email_snapshot = normalizedEmail;
    return toIdentity(row);
  }

  // Controlled first-login binding: the Google token has already been verified
  // server-side. Only an active canonical person with the same registered email
  // may receive a new provider mapping.
  const personResult = await pool.query(
    `SELECT id AS person_id, display_name, primary_email
       FROM public.people
      WHERE LOWER(primary_email) = $1
        AND status = 'active'
        AND archived_at IS NULL
      LIMIT 1`,
    [normalizedEmail]
  );
  if (!personResult.rowCount) return null;

  const person = personResult.rows[0];
  const externalId = `google:${googleSub}`;

  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO public.external_identities
        (id, provider, subject, person_id, email_snapshot, status,
         last_authenticated_at, source_system)
       VALUES ($1, 'google', $2, $3, $4, 'active', NOW(), 'aione-auth')
       ON CONFLICT (provider, subject) DO UPDATE SET
         email_snapshot = EXCLUDED.email_snapshot,
         last_authenticated_at = NOW(),
         updated_at = NOW()`,
      [externalId, googleSub, person.person_id, normalizedEmail]
    );

    const bound = await client.query(
      `SELECT
         p.id AS person_id,
         p.display_name,
         p.primary_email,
         e.subject AS provider_subject,
         e.email_snapshot
       FROM public.external_identities e
       JOIN public.people p ON p.id = e.person_id
       WHERE e.provider = 'google' AND e.subject = $1
       LIMIT 1`,
      [googleSub]
    );
    return toIdentity(bound.rows[0] || null);
  });
}
