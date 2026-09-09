# AIONE Recurring Work 1688 Technical Design V1.0

Status: CURRENT implementation design for branch `feat/recurring-work-v1`
Date: 2026-09-09

## 1. Goal

Implement AIONE's first real recurring-work baseline using the weekly 1688 selection submission task. The implementation must validate a platform capability, not a one-off 1688 task system.

Target flow:

`RecurringRule -> WorkTemplate -> WorkItem -> My Work -> WorkEvidence -> Validation -> WorkRecord -> next cycle`

## 2. Main audit result

Current `main` already has a reusable Work Home front-end page with card/list browsing, search/filter, status/priority display, record views and object-style interaction in `pages/work-home/template.html`.

Current backend structure already separates routes, services, integrations and core model, and already contains Google Drive / 1688 integration routes. However, there is no dedicated recurring-work domain route/service/module visible in `main`; Work Home therefore cannot yet be treated as a real recurring WorkItem runtime.

Conclusion: do not rebuild Work Home UI. Add recurring-work domain and API capability underneath the existing Work Home, then bind the existing page to the new contract.

## 3. Product Freeze implemented by this design

### 3.1 Recurring task
- name: `提交本周1688选品`
- business scope: `美和跨境 / 商品之家 / 选品中心`
- cadence: weekly
- generation time: Sunday
- deadline: Saturday 20:00 Asia/Tokyo
- assignee: one independent WorkItem per eligible employee
- minimum valid selections:
  - non-operations: 1
  - operations/selection role: 5 (V1 validation parameter)

### 3.2 One-time prerequisite
- name: `建立个人1688选品分组`
- one-time WorkItem
- completion closes permanently
- no recurring generation

### 3.3 Evidence
- evidence type: spreadsheet submission in designated Google Drive location
- filename convention: `YYYYMMDD_姓名_1688选品.xlsx`
- evidence is not the WorkItem itself; it is linked through WorkEvidence

### 3.4 Completion
A cycle WorkItem completes only when valid evidence is detected and the minimum valid-selection count for the assignee's role is met.

## 4. Domain model

### RecurringRule
Minimum fields:
- id
- code
- name
- cadence
- timezone
- generate_day
- generate_time
- deadline_day
- deadline_time
- is_active
- effective_from
- effective_to
- rule_version

### WorkTemplate
Minimum fields:
- id
- code
- title
- description
- business_scope
- related_object_type
- related_object_id
- evidence_policy
- completion_policy

### WorkItem
Minimum fields:
- id
- template_id
- recurring_rule_id nullable
- cycle_key
- assignee_person_id
- title
- status
- priority
- generated_at
- due_at
- started_at
- completed_at
- overdue_at
- source
- related_object_type
- related_object_id

Uniqueness guardrail:
`(recurring_rule_id, cycle_key, assignee_person_id)` must be unique.

### WorkEvidence
Minimum fields:
- id
- work_item_id
- evidence_type
- provider
- provider_file_id
- provider_url
- file_name
- submitted_by_person_id
- submitted_at
- validation_status
- valid_item_count
- metadata_json

### WorkRecord
Do not duplicate WorkItem data into a second work table. WorkRecord should be a historical/read model generated from completed/closed WorkItems plus audit events.

## 5. Status model

V1 status flow:

`pending -> in_progress -> awaiting_system_validation -> completed`

Overdue is a derived/runtime condition when `now > due_at` and status is not completed. If the existing Work Home requires a persisted state for filtering, persist `overdue_at` but do not create a parallel business workflow.

Evidence failure uses validation status and a WorkItem exception flag/message; do not create a large approval workflow in V1.

## 6. API contract

### GET `/api/work-items`
Supports filters:
- assignee=me
- status
- due_from / due_to
- scope
- recurring_rule_id
- cycle_key

Default `我的工作` call should be `assignee=me` and include active non-completed items plus optionally recent completed items.

### GET `/api/work-items/:id`
Returns WorkItem, evidence summary, recurrence context, related object and audit summary.

### POST `/api/work-items/:id/start`
Idempotently moves pending -> in_progress.

### POST `/api/work-items/:id/evidence`
Registers evidence reference. File bytes remain in Drive; AIONE stores provider identifiers and metadata.

### POST `/api/work-items/:id/validate`
Internal/system endpoint or service action. Validates filename, submitter, readable spreadsheet and valid candidate count. If policy passes, completes WorkItem.

### POST `/api/recurring-work/generate`
Internal scheduled action. Generates missing WorkItems idempotently for a cycle.

### POST `/api/recurring-work/mark-overdue`
Internal scheduled action or derived query process. Must be idempotent.

## 7. Google Drive boundary

V1 does not require employees to upload through an AIONE file widget if the shared Drive process is already operational. AIONE can detect/ingest submission metadata from the designated folder.

Drive integration responsibility:
- locate designated submission folder
- identify new/changed files
- map file to employee and cycle
- register WorkEvidence
- trigger deterministic validation

No AI is needed for filename parsing, cycle matching or duplicate detection.

## 8. 1688 spreadsheet validation

V1 deterministic validation:
1. file is readable spreadsheet
2. filename matches expected convention
3. submitter can be mapped to one employee
4. rows can be parsed from expected 1688 export
5. candidate product identity is extracted from 1688 product ID and/or canonical source URL
6. duplicates against AIONE Selection pool are removed for valid-new count
7. minimum count is evaluated by employee role

The spreadsheet import creates/updates Selection candidates in the selection pipeline; it must not create a second selection data model inside Work Home.

## 9. Front-end plan

Reuse `pages/work-home/template.html` and existing Work Browser patterns.

For `我的工作`, expose only the minimum employee-facing information:
- task title
- status
- deadline
- business scope
- completion standard
- submission location / evidence status
- primary action

Do not expose internal rule fields, raw recurrence configuration, profit/reward fields, Selection scoring fields or automation diagnostics in the employee card.

Add a small recurring badge/context only where useful, e.g. `每周`.

## 10. Scheduler

Use deterministic scheduling, not Agent/AI.

Recommended runtime on Google Cloud:
- Cloud Scheduler triggers a protected backend endpoint or Pub/Sub / Cloud Tasks path
- generator action runs idempotently
- timezone fixed to `Asia/Tokyo`

Initial V1:
- weekly generation job on Sunday
- deadline/overdue evaluation at or shortly after Saturday 20:00
- Drive evidence scan/event path separately triggers validation

## 11. Audit and idempotency

Required guardrails:
- recurring generation unique key
- evidence provider_file_id uniqueness per WorkItem where appropriate
- import idempotency by 1688 product ID / canonical URL
- all automatic completion transitions logged
- manual overrides require actor + reason

## 12. Implementation sequence

1. Add recurring-work schema/migration and repository/service layer.
2. Add WorkItem query/detail/start/evidence APIs.
3. Add recurring generator service and protected scheduler endpoint.
4. Add Drive evidence matching + deterministic spreadsheet validation adapter.
5. Bind existing Work Home `我的工作` to real WorkItem API.
6. Seed the prerequisite task and weekly 1688 recurring rule.
7. Add unit/integration tests for idempotency, role thresholds, due time and duplicate detection.
8. Preview with real test users before merge to `main`.

## 13. Acceptance criteria

- two eligible employees receive two distinct WorkItems for the same cycle
- re-running generation produces zero duplicates
- employee A cannot see employee B's `我的工作` item unless permission allows
- valid Drive file maps to the correct employee/cycle
- duplicate source products do not inflate valid-new count
- non-operations user completes at >=1 valid new candidate
- operations/selection user completes at >=5 valid new candidates
- incomplete item is shown overdue after Saturday 20:00 JST
- completed WorkItem remains historically queryable and next cycle creates a new WorkItem
- existing Work Home page type and shared components are reused, not copied

## 14. Explicit non-goals for V1

- no 1688-specific task engine
- no Agent-based scheduling
- no complex approval flow
- no selection reward calculation in Work Home
- no product scoring logic duplicated into WorkItem
- no new page type solely for this task

## 15. Governance

`main` remains stable baseline. All implementation proceeds on `feat/recurring-work-v1`, then preview, test, review and merge only after acceptance criteria pass.
