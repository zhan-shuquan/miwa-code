# CURRENT Curated Material Rule

Status: CURRENT engineering rule
Date: 2026-09-12

For AI design, the raw SOURCE ProductAsset pool is historical provenance and is not itself the CURRENT curated material set.

CURRENT curated material is the explicit Human Material Confirmation snapshot (`product_material_confirmations.asset_ids`) reconciled against the files currently present in the Product's three curated Google Drive folders:

- `01_SKU图`
- `02_产品图`
- `03_实拍图`

Files removed by the human operator from the curated Drive folders must leave the CURRENT confirmation on the next reconciliation. Historical raw SOURCE ProductAsset records may remain for provenance; they must not be treated as current AI design inputs merely because they still exist and are unarchived.

Before Gate C generation, Drive CURRENT files and the Human Material Confirmation snapshot must reconcile one-to-one. Design input assets must be a subset of that CURRENT confirmation.
