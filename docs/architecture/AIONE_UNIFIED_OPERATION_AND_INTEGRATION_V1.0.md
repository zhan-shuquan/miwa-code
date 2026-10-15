# AIONE Unified Operation & Integration Architecture V1.0

Status: CURRENT
Effective date: 2026-09-01
Applies to: 美和AIONE一体化工作平台（AIONE）

## 1. Purpose

This standard defines how AIONE acts as the unified business workbench and how external systems are integrated without becoming a second source of truth.

AIONE is the primary operating surface for Miwa business work. Whenever a business capability can be managed, configured, decided, operated, synchronized, or audited inside AIONE, the default is to keep that work inside AIONE.

External systems should primarily act as:

- data sources
- execution endpoints
- result endpoints
- platform-specific capability providers

They should not become parallel business-control planes when AIONE can own the same business truth.

## 2. Core Principle

The default architecture is:

```text
AIONE Domain / Application Layer
        ↓
External Adapter
        ↓
API / Webhook / CSV / File / Manual Import
        ↓
External Platform
```

AIONE remains the source of truth for the business object, rule, workflow, mapping, ownership, and internal status unless a specific external system must legally or technically own that fact.

## 3. Integration Decision Order

Use the simplest reliable deterministic mechanism that satisfies the business requirement.

Default priority:

1. Stable supported API
2. Webhook or event interface when appropriate
3. Structured bulk file / CSV import-export
4. File-based exchange
5. Manual import or confirmation workflow
6. Computer-use automation only when no stable interface exists and the business value justifies it

API is preferred when it is mature, authorized, sufficiently complete, and operationally reliable.

CSV or bulk file exchange is not considered a temporary hack. It is a valid adapter transport when:

- write APIs are unavailable
- required permissions are not available
- platform APIs are incomplete
- bulk initialization or mass updates are more efficient through files
- business rules are still being validated and human review before submission is useful
- API integration cost is disproportionate to current business value

## 4. Adapter Rule

Each external platform should be isolated behind an adapter boundary.

Examples:

- Rakuten Adapter
- Amazon Adapter
- 1688 Adapter
- Google Workspace Adapter
- Logistics Adapter
- ERP / Accounting Adapter

AIONE domain logic must not be hard-coded directly to one external platform's field names, identifiers, API quirks, or import format.

The adapter is responsible for translating between:

- AIONE canonical objects and fields
- external IDs and codes
- external request / response schemas
- external category structures
- platform-specific status values
- API payloads
- CSV / file formats

## 5. Source-of-Truth Rule

When AIONE owns a business fact, external changes must not silently overwrite AIONE.

Preferred synchronization behavior:

```text
AIONE change
→ mark as pending sync
→ adapter exports / sends change
→ external platform executes
→ result/status returns to AIONE
```

If an external platform is changed manually:

```text
external difference detected
→ AIONE records the difference
→ review / accept / restore according to rule
```

Do not allow uncontrolled bidirectional synchronization to create two competing CURRENT definitions.

## 6. Category Example

Product classification is a representative use case.

AIONE system classification is the internal canonical classification.

Store and platform classifications are external or presentation classifications and are linked through mapping data.

Example:

```text
AIONE category (Chinese canonical data)
+ Japanese display label
+ product attributes
+ store/platform scope
        ↓
Category Mapping Rule
        ↓
Rakuten / Amazon / store category
```

For store categories:

- one primary store classification should match the AIONE classification as closely as practical, usually as the Japanese presentation of the same business concept
- additional store classifications may be attached for operations, campaigns, seasons, recommendations, or merchandising
- additional store classifications must not change the AIONE primary classification

When a platform supports reliable write APIs, synchronize through the API.
When it does not, generate the platform's supported bulk file or CSV through the same adapter.

## 7. User Experience Rule

The long-term goal is that employees primarily work in AIONE rather than repeatedly switching among external administration consoles.

External consoles should be entered only when necessary for:

- platform-exclusive capabilities
- unavailable API or import capabilities
- mandatory legal or platform confirmation
- exceptional troubleshooting
- explicit manual review

AIONE should surface synchronization status, errors, and required human action whenever possible.

## 8. Engineering Guardrails

New integrations should answer these questions before implementation:

1. What business truth is owned by AIONE?
2. What facts are owned by the external system?
3. Is there a stable official API?
4. Does the API support both required read and write operations?
5. Is bulk file exchange simpler or safer for this operation?
6. What is the adapter contract?
7. How are external IDs stored and mapped?
8. How are synchronization states represented?
9. How are retries, idempotency, errors, and audit handled?
10. What is the manual fallback path?

Do not couple page components directly to external platform APIs.
Do not duplicate AIONE domain objects solely because another platform models them differently.
Do not treat external display labels as internal machine identity.

## 9. Evolution Rule

An adapter transport may evolve without changing the AIONE domain model.

Example:

```text
V1: AIONE → Rakuten Adapter → generated CSV
V2: AIONE → Rakuten Adapter → write API
```

The business workflow and canonical data should remain stable while the transport implementation improves.

## 10. CURRENT Decision

AIONE is the unified primary workbench.

Default rule:

> Manage in AIONE whenever AIONE can reliably own the work. Integrate external systems through adapters. Prefer stable APIs; use structured bulk files, CSV, webhooks, or controlled manual flows when they are more reliable or practical. External platforms must not become an uncontrolled second source of truth.
