# ADR-001: AIONE External Adapter Strategy

Status: Accepted
Date: 2026-09-01
Decision owner: AIONE System Architecture
Applies to: 美和AIONE一体化工作平台（AIONE）

## Context

AIONE integrates with multiple external platforms and ecosystems, including e-commerce platforms, sourcing systems, Google Workspace, logistics, ERP/accounting systems, and future third-party services.

If each feature directly implements platform-specific integration logic, AIONE will accumulate duplicated schemas, inconsistent identifiers, page-level API calls, temporary CSV handling, and multiple competing sources of truth.

The platform needs one repeatable integration pattern that supports current-stage development while remaining upgradeable as official APIs become available or mature.

## Decision

AIONE will use an External Adapter architecture.

Canonical pattern:

```text
AIONE Domain / Application Layer
        ↓
External Adapter
        ↓
API / Webhook / CSV / File / Manual Import
        ↓
External System
```

AIONE is the primary workbench and default source of truth for internal business objects, rules, workflows, mappings, and statuses.

The preferred transport order is:

1. Stable official API when sufficiently complete and authorized
2. Webhook/event interface when appropriate
3. Structured CSV or bulk file import/export
4. File exchange
5. Controlled manual import/confirmation
6. Computer-use automation only when no stable interface exists and the business value justifies it

Bulk files and CSV are accepted first-class adapter transports, not architectural exceptions.

## Rationale

This decision provides:

- one stable AIONE domain model independent of external platform changes
- lower current implementation cost
- faster business validation
- a safe fallback when write APIs do not exist
- straightforward migration from CSV to API without redesigning the business layer
- centralized external ID and code mapping
- clearer audit and synchronization state
- reduced need for employees to switch among external administration consoles

## Example: Rakuten Classification

Initial implementation may use:

```text
AIONE classification
→ Rakuten Adapter
→ generated category / item-category CSV
→ RMS bulk import
```

When a reliable write API is confirmed and authorized:

```text
AIONE classification
→ same Rakuten Adapter contract
→ Rakuten write API
```

The AIONE classification, mapping rules, Japanese labels, and workflow remain unchanged.

## Source-of-Truth Boundary

An external platform must not silently become a second CURRENT source for a fact owned by AIONE.

Manual changes detected externally should produce a difference state that can be reviewed, accepted, or restored according to explicit rules.

Some facts may legitimately be externally owned, such as provider-assigned transaction IDs or platform execution timestamps. Those must be explicitly modeled as externally owned fields rather than treated as AIONE-managed facts.

## Consequences

Positive:

- platform integrations become replaceable and testable
- business logic stays out of React pages and route handlers
- API availability does not block business automation
- bulk operations remain practical during early-stage validation
- future channels can reuse the same integration model

Costs:

- adapters and mapping contracts must be explicitly maintained
- synchronization state and error handling must be modeled
- platform-specific IDs still require master data and mapping tables

## Guardrails

- Do not call external platform APIs directly from page components.
- Do not duplicate canonical AIONE objects because an external platform uses a different schema.
- Keep external IDs, codes, and mapping data separate from AIONE machine identity.
- Every write integration must define retry, idempotency, error, audit, and fallback behavior appropriate to the transport.
- Prefer deterministic rules over AI for synchronization and code mapping.

## Exceptions

An exception is allowed when:

- a legally authoritative external system must own the fact
- the provider requires execution in its own console
- no practical interface exists
- implementing an adapter would add disproportionate complexity for a one-off non-recurring operation

Exceptions should be documented when they become recurring or strategically important.
