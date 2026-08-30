# AIONE Developer Toolbox V1.0 RC

Status: Release Candidate / Pending Freeze

## Purpose
Reduce repeated manual work, expose reusable platform assets, improve development speed, and prevent page-by-page divergence.

## 1. UI development tools
- Component Gallery: inspect all CURRENT shared/business components, variants, states and usage.
- Page Template Gallery: preview PT-01 to PT-08 page types with representative data.
- Icon Browser: Material Symbols first; AIONE custom icons only when necessary.
- Design Token Viewer: inspect color, typography, spacing, radius, shadow, breakpoint and semantic tokens.
- Responsive Preview: desktop/tablet/mobile and main AIONE breakpoints.
- State Preview: loading, empty, error, no-permission, archived, deleted and offline states.

## 2. Data and contract tools
- Object Model Viewer
- Schema Viewer
- Field Dictionary
- API Explorer
- Request/Response Contract Viewer
- Mock Data Generator
- Relationship Viewer
- Enum/Status Registry

Goal: prevent frontend, API, database and mock fields from evolving independently.

## 3. Page generation tools
AIONE should gradually support:

Page Type -> Object -> Fields -> Actions -> Views -> Permissions -> Generate base page

The generator must compose existing templates/components instead of creating copied implementations.

## 4. Permission debugging tools
- Current User / Role viewer
- Scope viewer
- Object permission inspector
- Field permission inspector
- Action permission inspector
- Permission simulation
- Denial reason viewer

## 5. Workflow debugging tools
- Workflow definition viewer
- State-machine viewer
- Transition simulator
- Owner/SLA inspector
- Trigger/condition viewer
- Execution history
- Error/retry viewer

## 6. AI development tools
- Prompt registry
- Skill registry
- Tool registry
- Context inspector
- Trace viewer
- Model/cost/token viewer
- Proposal viewer
- Human-confirmation simulator
- AI result/error viewer

All business pages must use AIONE AI Gateway rather than direct model calls.

## 7. Integration development tools
- Connection registry
- Credential reference viewer (never expose secrets)
- API test console
- Webhook tester
- Field Mapping editor
- Sync log
- Error queue
- Retry queue
- Rate-limit/status viewer

## 8. Import/export tools
- Template generator
- Upload parser
- Column mapper
- Validation preview
- Import dry-run
- Error report
- Export field selector
- Selected / Filtered / All scope selector

## 9. Test tools
- Component test
- Page template test
- Unit test
- API contract test
- Integration test
- Permission test
- Workflow test
- Migration test
- Regression test
- Accessibility check
- Backup/restore recovery test

## 10. Repo and CI guardrails
Required progressive guardrails:
- Type Check
- Lint
- Build Check
- Unit Test
- Integration Test
- API Contract Test
- Database Migration Check
- Duplicate Component Check
- Deprecated Name Check
- Route Check
- Design Token Check
- i18n / terminology check
- Dead Code Check
- Dependency Check
- Branch Protection
- CI/CD

## 11. Reuse-first development gate
Before adding new code, answer:
1. Is there an existing Page Type?
2. Is there an existing Shared Component?
3. Is there an existing Business Component?
4. Is there an existing Platform Capability?
5. Does an approved external provider already solve it?

Only the remaining gap should be newly implemented.

## 12. Suggested implementation priority
P0: Component Gallery, Page Template Gallery, Token Viewer, Object/Schema Viewer, API Explorer, permission inspector.
P1: workflow debugger, import/export test tools, AI Trace, integration test console, observability/recovery test visibility.
P2: page generator, automated duplicate/deprecated/token/i18n guards, full developer portal.

## Governance
Tooling is part of the platform architecture, not optional developer convenience. Any tool that prevents repeated manual work or recurring defects should be preferred over relying on human memory.
