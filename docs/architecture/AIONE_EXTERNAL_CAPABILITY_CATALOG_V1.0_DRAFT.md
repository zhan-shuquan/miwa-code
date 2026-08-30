# AIONE External Capability / Google Ecosystem Catalog V1.0 RC

Status: Release Candidate / Pending Freeze

## Purpose
Reduce custom development by reusing mature external capabilities when they can meet AIONE requirements with acceptable security, governance, maintainability and cost.

## Decision order
1. Reuse: use an existing AIONE capability if it already solves the need.
2. Adopt / Buy: use an approved mature external capability directly when suitable.
3. Integrate: use a thin AIONE adapter when direct adoption is insufficient.
4. Build: custom-build only when the above are insufficient.

## Google ecosystem — preferred baseline

### Identity and workspace
- Google Identity / Google Workspace sign-in: preferred for employee identity entry where appropriate.
- Gmail: email communication and notification integration.
- Google Calendar: schedules and calendar integration.
- Google Drive: collaborative documents, shared-drive knowledge/files and human-readable enterprise assets.
- Google Docs: formal documents and collaborative text.
- Google Sheets: spreadsheet workflows, imports/exports and lightweight operational analysis.
- Google Slides: presentation publishing where appropriate.

### UI and interaction
- Material Design: primary interaction/design reference.
- Material Symbols: default icon source before creating AIONE custom icons.

### Application runtime and data
- Cloud Run: preferred managed application runtime for services where suitable.
- Cloud SQL for PostgreSQL: preferred managed relational database baseline for AIONE transactional data.
- Cloud Storage: binary/object storage where Drive is not the correct system of record.
- Secret Manager: credentials and secrets; secrets must not be embedded in source code or documents.

### Async, automation and integration
- Cloud Tasks: managed asynchronous work queues.
- Cloud Scheduler: deterministic scheduled triggers.
- Pub/Sub: event and message distribution when decoupling is required.

### Observability and resilience
- Cloud Logging: application, integration and platform logs.
- Cloud Monitoring: metrics, uptime, alerts and operational visibility.
- Managed backup/restore capabilities should be used where available for Cloud SQL and storage layers; recovery procedures and tests remain an AIONE governance responsibility.

### Analytics and BI
- BigQuery: managed analytical warehouse for larger-scale cross-domain analytics and metric computation.
- Looker: governed BI, semantic modeling, dashboards and embedded analytics when AIONE requires a stronger analytics layer.
- Looker Studio: lighter-weight reporting may be considered where governance and embedding requirements are simpler.

### AI
- Vertex AI: approved Google AI platform candidate.
- OpenAI models/services: approved external model provider candidate.
- All business use should go through AIONE AI Gateway/Service rather than page-level direct calls.

## GitHub
- Repository: source code and technical truth.
- Branches: feature/documentation work isolation.
- Pull Requests: review and merge governance.
- Actions: CI/CD and automated guardrails.
- Branch Protection / Rulesets: protect main stable baseline.
- Issues/Projects may be used for engineering work tracking where useful.

## AIONE integration rule
External services must not become uncontrolled second sources of truth.

Examples:
- GitHub = source code truth.
- AIONE transactional DB = business object truth.
- Google Drive = collaborative file/knowledge storage where defined.
- BigQuery = analytical copy/warehouse, not transactional master.
- Looker = semantic/BI layer, not source transaction system.

## Capability record fields
For every external capability record:
- capability name
- provider
- category
- current status
- source-of-truth role
- AIONE adapter required?
- authentication method
- permission model
- data residency/security notes
- backup/recovery implications
- cost model
- lock-in risk
- fallback plan
- owner
- CURRENT / validating / deprecated

## Capabilities AIONE should normally not rebuild
- common identity protocols
- email delivery UI
- calendar UI and calendaring engine
- office document editors
- generic file preview where provider/native browser support is sufficient
- generic icon system
- managed relational database operations
- secrets storage
- common scheduling and queue infrastructure
- generic logging/monitoring
- mature BI infrastructure
- standard Git repository/version control workflow

## Capabilities AIONE should own
- business object model
- business permissions
- Page Types and AIONE interaction composition
- Object Foundation
- Work/Task truth
- domain workflows and rules
- integration adapters and mapping contracts
- AI Gateway governance
- audit semantics
- cross-home reference rules
- publication/business document semantics
- data classification/retention policy
- recovery objectives and recovery-test governance

## Governance
- Any new external dependency requires an explicit reason and owner.
- Prefer one approved provider per stable need unless redundancy is justified.
- Avoid page-level direct SDK/API coupling; use shared adapters/services.
- Credentials belong in approved secret management.
- External service outages/errors must be observable and retryable where appropriate.
- Deprecated providers/integrations must be removed from CURRENT architecture.
- External capabilities must comply with AIONE Progressive Disclosure and i18n architecture where they surface in the UI.

## Initial implementation priority
P0: Google Identity, Drive/Workspace interfaces, Cloud Run, Cloud SQL PostgreSQL, Secret Manager, GitHub, Material Symbols, Logging/Monitoring, backup/recovery baseline.
P1: Cloud Tasks/Scheduler/Pub/Sub, structured integration adapters, OpenAI/Vertex through AI Gateway.
P2: BigQuery + Looker/embedded analytics once operational data and metrics are stable.
