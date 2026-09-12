# CURRENT Curated Material Rule

Status: CURRENT engineering rule
Date: 2026-09-12

For AI design, the raw 1688 SOURCE ProductAsset pool is historical provenance and is not itself the CURRENT curated material set.

The operator-facing CURRENT material source is the Product's three curated Google Drive folders:

- `01_SKU图`
- `02_产品图`
- `03_实拍图`

Files that remain in these folders after human screening are the exact CURRENT material selection. AIONE formalizes each current Drive image as its own SOURCE ProductAsset with stable Drive provenance (`source_provider=google_drive_curated`, `driveFileId`, folder, filename, hash, and canonical GCS copy), then records those asset IDs in the CURRENT Human Material Confirmation snapshot.

The historical 1688 SOURCE records remain immutable provenance. They are not required to match the curated Drive filenames one-to-one and are not AI-design inputs unless they are explicitly represented in the CURRENT curated Drive selection.

If the human operator removes a file from the three curated Drive folders, that file leaves the CURRENT selection on the next reconciliation. Its historical ProductAsset/GCS provenance may remain for audit and traceability.

Before Gate C generation:

1. the current Drive folders must contain at least one `01_SKU图` image and at least one `02_产品图` image;
2. every current Drive image must be formalized as a `google_drive_curated` SOURCE ProductAsset;
3. the Human Material Confirmation must contain exactly the current curated asset IDs;
4. DesignTask input assets must be a subset of that CURRENT confirmation.

This rule intentionally separates historical source provenance from the human-curated CURRENT working set.
