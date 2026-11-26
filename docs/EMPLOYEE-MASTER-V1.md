# ERP Employee master integration V1 — development acceptance

Status: implemented on development branches; **real-member Google browser acceptance is pending**.
Scope: ERP Employee projection, authenticated member association, own profile, selection/owner/task relations and ERP numbering. No payroll, attendance, recruitment or independent employee CRUD.

## Authoritative data and identity

- ERP Employee is the sole employee master. Reused fields: `custom_miwa_member_id`, `custom_miwa_item_prefix`, both unique. ERP employee IDs retain native naming.
- AIONE `people`, `external_identities` and `person_login_emails` remain login identity registries, not employee master records. No new employee table.
- ERP returns an allowlist: employee/member IDs, name, local portrait thumbnail, company, branch, department, designation, employment type, grade, status, prefix, modified time and version. No payroll, bank, ID document, birthday or private contact fields.
- `selection_workspace_config['erp-employees']` is a replaceable authorized cache. Migration `0202_employee_master_cache.sql` provides a read-only SQL view for current names and sorting. Removed employees disappear from the current projection; historical member references are retained.
- Source Employee changes sync through the existing local connector every 60 seconds. Personnel synchronization precedes and is independent of cost-rule approval, so unreviewed cost changes cannot prevent employee revocation sync.
- Invalid/duplicate/out-of-order snapshots are rejected. ERP downtime retains the last valid projection and marks it cached after three minutes. An offline system cannot observe a newly disabled ERP employee until reconnection; no claim of immediate offline revocation is made.
- Selection grants are explicit and independent of department, designation or grade. Assignment choices require active linked employees with research/collect/manage grants. Grant administration can see active linked employees before granting business access.

## Contracts

ERP (versioned in `miwa_ai`):

- `miwa_ai.employee_master.directory`: authenticated System Manager with Employee read permission; connector-only full projection.
- `miwa_ai.employee_master.profile(member_id)`: ordinary ERP user can resolve only their own `Employee.user_id`; admin can request an explicit member. AIONE employees do not need an ERP account.
- `miwa_ai.selection_numbering.execute(kind, payload)`: privileged integration API; only `formal_number`. Prefix maintenance belongs to native Employee.
- `after_install` and `after_migrate`: additive idempotent schema installation, uniqueness, reserved permission level and native Item reservation protection. Employee validation prevents duplicate or casual identity replacement.

AIONE (authenticated routing):

- `GET /api/v1/selection-workspace/employees/me`: own allowlisted profile; query member IDs cannot change the authenticated subject.
- `GET /api/v1/selection-workspace/employees`: authorized selection managers only.
- `POST /api/v1/selection-workspace/connector/employees`: constant-time connector-token authentication, validation, authorized identity filtering, transactional cache replacement.
- `/pool/people` remains a read-only compatibility projection. `/pool/people/prefix` returns 410; historical queued prefix writes are retired, not executed.
- Inactive/unlinked employees cannot perform selection business actions. My profile remains accessible to explain missing configuration.

## Numbering and historical links

- Creator member ID is immutable through claim/assignment; owner ID is separate. Work tasks reuse that owner ID.
- AIONE queues a number request using the persisted owner, never a browser-supplied prefix.
- ERP checks historical Item codes, reservations and native series under a database lock and unique constraints. Stable selection ID makes retries idempotent; existing numbers survive owner changes.
- Native Item reservations adopted by an existing-source match are bound once to the selection, preventing a second selection from reusing the same reservation.
- Missing prefix permits drafts/claims. ERP restoration processes queued requests; a newly configured prefix requeues only still-valid pending selections that previously failed for that specific reason.
- No item publication, paid AI or new ERP Item creation occurred in this acceptance run.

## Local development and rollback

- ERP: existing 8081 `miwa-dev.localhost`; 8080 and production unchanged.
- Test fixtures remain at `http://127.0.0.1:8765/preview`, database `aione_selection`.
- Real authenticated development: `http://127.0.0.1:8766/login`, separate database `aione_employee_dev`, same existing isolated PostgreSQL container. Start with `backend/scripts/start-employee-development.ps1`.
- 8766 has no test-login route. Google ID tokens are verified server-side, then resolved using existing canonical identity logic. The public OAuth client comes from existing auth configuration. Local connector secrets are in ignored `.local`, never committed.
- Initial real-member identity bootstrap uses existing migrations 0005/0006/0007 once; it does not invent employee assignments or Google subjects.
- Rollback: stop the named local development processes and restore the prior AIONE commit. Preserve databases and reservation records. Do not recycle formal numbers. ERP scoped runtime/hook backups are under `D:\MIWA-ERP\dev-secrets\miwa-erp-dev\deployments\employee-master-v1-20261126`; restore affected code/hooks only after checking hashes. Leave additive schema/data intact. Do not restore an entire database over newer business activity.

## Evidence — 2026-11-26

- User explicitly approved saving HR-EMP-00001 as member 86000 / prefix zsq. Native ERP browser and privileged readback confirmed the saved values; no code mapping was added.
- Employee cache/authorization tests: 25 checks, including stale/invalid snapshot rejection, disabled employee denial, no-business-permission denial, privacy allowlist and rejection of fake login/header/token paths.
- ERP native integration: 15 checks, including ordinary-user own-only access, denied directory/number allocation, uniqueness, version update, and anonymous rejection. Transaction-local permission test account was rolled back.
- Actual ERP edit → connector → AIONE own-profile update: 4 assertions, then original test employee name restored and resynchronized. Querying another member did not expose that person.
- Numbering concurrency/idempotency: 9 checks using only existing test member 86991 and qat prefix. `qat003`, `qat004` retained as audited test reservations. No zsq numbers consumed.
- Existing selection pool: 49 checks; workbench/cost/sort regression: 74 checks; ownership policy: 6 checks.
- Existing ERP intake/listing regression: 196 tests passed inside the current image with network disabled, read-only source, no database volume. Host Python lacked bs4; no host dependencies were changed.
- Browser: own profile rendered from ERP for isolated test member 86991; new draft recorded 86991; save succeeded; cost/profit computed with matching detailed/summary totals. Native Employee page showed real 86000/zsq fields. Screenshots are actual browser captures, not design mockups.

## Outstanding acceptance

Google rejects origin `http://127.0.0.1:8766` for the existing OAuth client (`The given origin is not allowed for the given client ID`). An authorized OAuth administrator must add this exact development JavaScript origin, then the real member must sign in. Do not replace this step with a fabricated session or member 86990.

Until then, real 86000 end-to-end login, browser profile, live claim/confirmation and zsq allocation remain unverified. Cache-offline and disabled-employee rules have automated coverage; full real-member offline/recovery browser acceptance remains pending. Paid AI and actual publication were deliberately not executed; their existing offline regression passed.
