# AIONE Platform Foundation V1.0 RC — Index

Status: Release Candidate / Pending Freeze

This index groups the eight pre-freeze foundation documents reviewed for `AIONE 12之家总架构 Product Freeze V1.0`.

1. AIONE_HOME_COMMONALITY_MATRIX_V1.0_DRAFT.md — content status: RC
2. AIONE_PAGE_TYPE_CATALOG_V1.0_DRAFT.md — content status: RC
3. AIONE_SHARED_COMPONENT_CATALOG_V1.0_DRAFT.md — content status: RC
4. AIONE_BUSINESS_COMPONENT_CATALOG_V1.0_DRAFT.md — content status: RC
5. AIONE_PLATFORM_CAPABILITY_CATALOG_V1.0_DRAFT.md — content status: RC
6. AIONE_DEVELOPER_TOOLBOX_V1.0_DRAFT.md — content status: RC
7. AIONE_DESIGN_TOKEN_CATALOG_V1.0_DRAFT.md — content status: RC
8. AIONE_EXTERNAL_CAPABILITY_CATALOG_V1.0_DRAFT.md — content status: RC

## Cross-cutting CURRENT standard
- `AIONE_PROGRESSIVE_DISCLOSURE_AND_I18N_V1.0.md`

The CURRENT progressive-disclosure/i18n standard is a mandatory cross-cutting dependency of the Foundation even though it is not counted as one of the eight pre-freeze catalogs.

## Review results incorporated into RC
- 12-home boundaries remain consistent.
- Eight Page Types remain sufficient; no ninth Page Type is added.
- Shared-component naming conflicts were resolved: BulkSelectState/BulkActionBar, MoreActionMenu, ObjectOwner/OwnerSelector have separate locked responsibilities.
- Business Component coverage now explicitly addresses all 12 homes, including why Miwa/Business/Analytics homes should avoid unnecessary specialized UI.
- Platform capability priority now moves basic Observability to P0 and Publication/Version to P1.
- Reuse / Adopt / Integrate / Build is the single external-capability decision sequence.
- Progressive Disclosure and i18n are explicitly linked into the Foundation.
- Security / Data Governance / Resilience guardrails now include backup, restore, disaster recovery, retention, classification, sensitive-data handling, privacy and recovery tests.

## Product/Architecture Truth vs Implementation Truth
These documents define intended Product/Architecture/Governance Truth. They do not prove implementation in `main`.

Before any capability is declared implemented, verify the corresponding code, contract, schema, test and deployment state in `main`.

## Governance status
The Foundation is now suitable to serve as the architecture basis for `AIONE 12之家总架构 Product Freeze V1.0`.

Do not merge this documentation branch into `main` merely because the RC review passed. First complete Product Freeze review and verify any references to current implementation facts.
