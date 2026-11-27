# Employee member correction — implementation checkpoint

Scope: preserve ERP Employee and provider subjects; correct an administrator-reviewed member number through the existing outbound employee connector. No product/SKU/code/cost changes.

Observed 2026-11-27: HR-EMP-00009 has member 86007, prefix lb, personal_email lanbin8899@gmail.com, Active, no AIONE role profile. ERP member-reference column scan found only this Employee row; 86006 was unused. Formal AIONE people had neither member and no matching primary email. Full textual cloud scan found only one asset payload match, requiring exclusion of binary/image content before concluding reference checks.

Current code has a direct-edit protection error but no corresponding administrator correction implementation. Do not bypass it with SQL or an unchecked document flag.

Implementation contract: administrator requests a check from Employee; ERP records immutable old/new/reason/operator and checks local conflicts. Existing outbound connector obtains cloud conflict/reference report. Administrator approves the checked proposal. Cloud rechecks under transaction, records idempotent result and acknowledgement; ERP applies through its audited workflow only after matching acknowledgement. A crash must resume the same request, never create a second identity. Unsupported historical references must fail closed with an explicit report rather than be silently rewritten.

Rollback is a reviewed reverse correction against current references, not restoration of an old database over new business data. Existing Google login associations and permissions are preserved; correction is not an authorization grant.

Status: inspection in progress; no correction or production deployment performed at this checkpoint.
