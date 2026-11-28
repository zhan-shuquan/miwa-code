# Employee authentication release acceptance

2026-11-28 JST. Technical release accepted with the following explicit pending operational checks. China network acceptance is not complete.

## Scope and evidence

ERP8081 remains the employee and role authority. Employee ID and verified email use one AIONE password credential linked to the same existing person. Google uses existing immutable subject bindings. No employee password was reset during deployment; no new ERP User or formal product was created.

- Eleven GitHub Actions checks passed at 0501c965ecdcc39b63eaad459eebc84a4fdba27b.
- Isolated service/HTTP/envelope tests passed for temporary activation, password changes/resets, revocation, inactive users, email identity, throttling, CSRF, cookies and encrypted idempotent management commands.
- Real selection routes against isolated fixtures rejected other-owner records and independent attachment URLs for ordinary users; administrators retained existing scope. Revoked sessions lost attachment access.
- Desktop employee-ID and mobile email login succeeded against isolated test identity. Production anonymous session/business requests returned401, cross-origin login403, invalid login401.
- Production Google login for administrator86000 returned the existing employee ID, name and selection-administrator role. Personal settings and selection pool loaded; refreshing retained the authenticated identity. No business save or ERP filing was used for this check.
- ERP Employee AIONE account menu and cloud management receipts were inspected. Original Google identities retained; only original active Google employees were enabled in the new login flag, with audit comments.
- Auth secret direct policy grants only the existing runtime service account secretAccessor on the new dedicated secret. No database/file/system privileges added.

## Release inventory

Application release source0501c96; backend imageemployee-auth-93b1bc6 (later commits change only connector startup, ERP status presentation and frontend flag). Production CloudRun revisionaione-backend-current-auth93b-ready; frontend deploymentdpl_DhNrmQJ3W8pvEz2AqrbC2nmpmm7m. Merge and documentation commits preserve the reviewed application tree.

CloudSQL backup1795862351068 succeeded before additive migration0206. ERP backup20261128_194038-miwa-dev_localhost-database.sql.gz. Local deployment and connector manifests are retained outside Git under the existing private deployments directory. Secrets and database backups are not committed.

## Pending / limitations

- Employee86001 manual email ownership confirmation, administrator-set unique temporary password and production first-password-change are pending. China real-network ID/email/business acceptance must be recorded separately; this employee currently has selection-administrator role, so this test does not replace ordinary-employee isolation tests.
- Original personal-avatar editing API was not found. Existing avatar display is retained; self-service avatar editing is not claimed delivered.
- Account disable/reset/revoke is effective after the outbound ERP management operation is acknowledged by cloud. An offline connector cannot provide instantaneous revocation; ERP shows pending instead of success.
- WPS shared-account and Windows folder permissions remain separate existing concerns. Web attachment authorization does not change those access boundaries.
- Product intake/cost/SKU/synchronization implementations were not changed. Existing automated contract checks passed; no new formal product or real listing/purchase was used as a regression test.

## Rollback

Preserve additive authentication tables, credentials, audit and business data. Do not restore an old database over newer business records. Preserve the dedicated secret for queued encrypted requests.

Previous application stable tag: aione-post-intake-operations-stable-20261128. Previous frontend deploymentdpl_3i9rJc78XyVHJfJvKdXL5tKoRUw3; previous backend revisionaione-backend-current-00329-mit.

Before switching to legacy authentication, check all disable/revoke actions performed since cutover. Legacy authentication does not enforce new revocation state; never use rollback to re-enable a deliberately disabled employee. Prefer a forward fix or restrict business access until safe.

After that check, paired rollback uses Vercel project rollback to the above frontend and:

```sh
gcloud run services update-traffic aione-backend-current --project=miwa-aione --region=asia-northeast1 --to-revisions=aione-backend-current-00329-mit=100
```

For connector/ERP code, verify deployed file hashes against the release manifest, then restore only the backed-up auth changes. Retain employee data and existing permissions. Do not touch8080, WPS or Drive configuration.
