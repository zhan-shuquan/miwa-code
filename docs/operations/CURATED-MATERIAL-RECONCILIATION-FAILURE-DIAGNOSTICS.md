# Curated Material Reconciliation Failure Diagnostics

Status: CURRENT operations note
Date: 2026-09-12

The curated-material reconciliation is fail-closed. A failed Cloud Run Job must not be treated as a partial success, and the operator should not need to manually discover the execution name or run separate diagnostics.

The canonical runner must:

1. preserve the exit status from `gcloud run jobs execute`;
2. recover the latest execution name for the reconciliation Job when the execute command exits non-zero before emitting a machine-readable execution name;
3. print the execution status summary;
4. print authoritative execution logs when available;
5. stop without applying downstream Trial Gate C steps when reconciliation fails.

This is an operations/diagnostics correction only. It does not change Product Truth, reconciliation matching rules, Human Material Confirmation semantics, AI generation behavior, production traffic, or historical SOURCE provenance.
