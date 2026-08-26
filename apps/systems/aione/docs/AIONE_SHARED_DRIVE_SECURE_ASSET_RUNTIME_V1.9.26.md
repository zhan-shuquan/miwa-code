# AIONE V1.9.26 | Shared Drive Secure Asset Runtime

## Goal

Run the corporate-file loop through AIONE instead of direct browser Google Drive download URLs:

`AIONE employee identity -> AIONE Backend -> Cloud Run runtime service account -> MIWA Shared Drive -> streamed file -> employee browser`

## Why

Direct `drive.google.com/uc?export=download...` links depend on the browser's active Google account and can return 403 when the wrong account is active or the user lacks direct Drive access. V1.9.26 makes AIONE the permission and delivery boundary for downloads.

## One-time Shared Drive setup

The production backend runs as the Cloud Run runtime service account configured by `AIONE_RUNTIME_SERVICE_ACCOUNT_NAME` (default: `aione-runtime`).

1. In Google Cloud Shell, run the existing AIONE cloud script context or `gcloud run services describe` to identify the runtime service-account email.
2. In Shared Drive `美和集团（全球）`, add that service account as **Viewer**.
3. Do not grant anonymous/public link access to internal group assets.

Viewer is sufficient for V1.9.26 read/download. Later automated file management should use a separate, explicitly approved write-capable service identity instead of silently expanding this read identity.

## API

- `GET /api/v1/drive-assets` - internal asset metadata (no raw Drive secrets required by UI)
- `GET /api/v1/drive-assets/:assetId/download` - authenticated AIONE download

Production API remains protected by employee Google ID-token verification and private Cloud Run IAM.

## Security boundaries

- Browser sends stable AIONE `assetId`, not arbitrary Google Drive file IDs.
- Backend owns the allow-listed asset -> Drive file mapping.
- Internal files remain non-public in Google Drive.
- Downloads are `Cache-Control: private, no-store`.
- Download events are written to `business_events` best-effort for audit.
- If the runtime service account lacks Drive access, API returns `drive_runtime_access_missing` instead of falling back to a public URL.

## V1 scope

This version fixes individual file download. Multi-file packaging, public customer-share links, fine-grained RBAC, and AI-driven file moves remain later capabilities.
