# AIONE Rakuten Legacy Remote Publication Deprecation V1

Status: **CURRENT GOVERNANCE RULE**  
Effective: **2026-09-10**

## Decision

AIONE has one CURRENT Rakuten publication byte source:

`ProductAsset -> canonical GCS object -> Rakuten Adapter -> R-Cabinet`

Any Rakuten publication path that downloads bytes again from an arbitrary remote source URL at publish time is deprecated.

## Deprecated behavior

The following behavior is not allowed as a parallel runnable publication baseline:

- fetch a 1688 image URL during Rakuten publication;
- fetch any arbitrary remote image URL and publish it directly to R-Cabinet;
- bypass canonical ProductAsset / GCS identity;
- treat Drive or source-system URLs as the authoritative publication media store after canonical intake has completed.

Remote URLs may remain only as provenance/evidence metadata where needed.

## Required implementation direction

- Rakuten publication services and routes must not invoke a remote-image download helper.
- Rakuten publication must read canonical bytes through the GCS integration.
- CI must reject reintroduction of the removed `downloadRemoteImage` Rakuten publication helper.

## Reason

The real runtime acceptance for `MH0000002 -> global-dimensions/rkc001` proved the canonical GCS publication path. Keeping a second remote-download path would create two publication truths, duplicate failure modes and long-term drift.

AIONE therefore keeps one publication baseline and one canonical asset identity.
