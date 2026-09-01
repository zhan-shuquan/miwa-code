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
  // server-side. Resolve the verified email through the canonical login-email
  // registry first, with people.primary_email retained as a backward-compatible
  // fallback during migration.
  const personResult = await pool.query(
    `SELECT DISTINCT
       p.id AS person_id,
       p.display_name,
       p.primary_email
     FROM public.people p
     LEFT JOIN public.person_login_emails le
       ON le.person_id = p.id
      AND le.status = 'active'
     WHERE p.status = 'active'
       AND p.archived_at IS NULL
       AND (
         LOWER(p.primary_email) = $1
         OR LOWER(le.email) = $1
       )
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
         person_id = EXCLUDED.person_id,
         email_snapshot = EXCLUDED.email_snapshot,
         status = 'active',
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
