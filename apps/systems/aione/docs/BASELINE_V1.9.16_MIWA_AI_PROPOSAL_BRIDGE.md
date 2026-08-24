# V1.9.16 | MIWA AI Proposal Bridge

Status: candidate baseline.

Purpose: close the missing bridge between a model-generated business plan and a structured, auditable AIONE write proposal.

## Locked interaction contract

Intent -> Proposal -> Human Confirm -> Tool -> Result

- Read-only analysis can run directly.
- An explicit request to create a work item must materialize a structured `create_work_item` proposal in the same turn, even when the first model response only produced prose.
- Pending proposals receive a Backend-generated proposal id and `waiting_confirmation` state.
- The preferred confirmation UI is the structured proposal card button.
- Explicit natural-language confirmation can resolve the latest pending proposal for the same human actor and AI office.
- Confirmation resolves the stored proposal by id before execution; frontend payload is retained only for backward compatibility.
- Successful confirmation clears the pending proposal.
- Local test persistence remains truthful: local AIONE fallback is not reported as formal database persistence.

## Current persistence boundary

Pending proposal state is stored in Backend memory with a one-hour TTL. This is sufficient for local/internal validation. Production persistence should later move to the formal AIONE database/event model without changing the interaction contract.

## Presentation fix

Assistant messages use a safe Markdown-lite renderer for headings, bold text, ordered lists and bullet lists. Raw HTML is not interpreted.
