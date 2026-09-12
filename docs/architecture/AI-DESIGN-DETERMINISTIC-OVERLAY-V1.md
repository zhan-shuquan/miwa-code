# AIONE AI Design Deterministic Overlay V1

Status: DESIGN STARTED

## Purpose

After PR #86 proved the visual-only AI generation path, V1 adds the deterministic copy layer that renders only explicit, approved copy onto an already human-approved DERIVED visual asset.

## Locked V1 boundary

- AI image generation remains `visual_only`.
- Copy rendering is deterministic and never authored by the image model.
- The overlay input must reference an existing human-approved DERIVED ProductAsset.
- Text content must be explicitly supplied from approved product facts/copy; the overlay stage does not infer product claims.
- Unsupported or restricted claims remain blocked before rendering.
- Output is a new DERIVED ProductAsset with full provenance to the approved visual source and copy payload.
- Human review remains required on the final composited output.
- No batch/15-page generation in V1.

## V1 flow

`approved visual-only DERIVED asset -> explicit approved copy payload -> deterministic renderer -> final DERIVED asset -> human review`

## Governance

This branch must not change CURRENT traffic or bypass main. Product-specific copy for MH0000002 is intentionally not hardcoded because its product identity data still requires cleanup; V1 is a reusable platform capability.
