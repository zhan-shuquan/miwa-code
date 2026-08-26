# VALIDATION V1.9.26 | Shared Drive Secure Download Candidate

## Static verification

- Backend Drive route mounted under `/api/v1/drive-assets`.
- Backend allow-list owns asset-id to Google Drive file-id mapping.
- Google Drive retrieval uses ADC + `drive.readonly`.
- Browser direct `uc?export=download` links removed from active registry.
- Frontend download uses authenticated AIONE API client.
- Vercel WIF bridge streams binary response.
- Shared Drive runtime identity helper included.

## Required real-environment verification

Static code validation cannot prove the Cloud Run runtime service account is already a member of Shared Drive `美和集团（全球）`.

Before declaring the runtime closed loop complete:

1. identify `aione-runtime@PROJECT_ID.iam.gserviceaccount.com` with `infra/gcp/cloud-shell/08_DRIVE_RUNTIME_ACCESS_CHECK.sh`;
2. add it once to Shared Drive `美和集团（全球）` as Viewer;
3. deploy V1.9.26 backend;
4. sign into AIONE as a normal employee;
5. click `美和之家 -> 企业资料 -> 集团核心资料 -> 下载原件`;
6. verify the file downloads even when the browser is not relying on a separately authorized Google Drive tab;
7. verify internal Drive file remains non-public.

## Result threshold

Only after step 5 succeeds should this be promoted from Candidate to stable runtime baseline.
