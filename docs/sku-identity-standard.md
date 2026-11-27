# SKU identity — confirmed 2026-11-27

ERP is the sole allocator. Every new confirmed sales combination uses `<parent>_c01`, `_c02`, etc., independently of attribute dimensions. Persistent series and reservations prevent reuse after disable/delete. Native attribute matching makes retries and reordered attributes reuse the same SKU. Display names and platform-specific SKU mappings are separate identities.

Existing local image numbers require verified correspondence. Images may be shared. Chinese/Japanese display names derive from confirmed ERP attributes and existing translations; untranslated Japanese remains pending review. Manual display edits do not change IDs. No paid translation is invoked.

Scope of historical correction: zyl017 (black c01, dark grey c02), zsq109 (existing confirmed c01–c12 image sequence). Native ERP rename updates links; old reservations remain. Other historical products and published platform identifiers are not renamed.

ERP outbound snapshots carry current SKU facts only to their matching submitted selection. Historical job receipts remain audit records. SKU facts are removed from bootstrap/parameter configuration; existing record permissions apply.
