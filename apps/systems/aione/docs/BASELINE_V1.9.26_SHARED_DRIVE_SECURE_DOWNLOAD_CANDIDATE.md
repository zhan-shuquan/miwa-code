# AIONE V1.9.26 CANDIDATE | Shared Drive Secure Download

## Locked objective

Run the internal corporate asset loop as:

`Employee -> AIONE -> authenticated backend -> MIWA Shared Drive -> file -> employee`

without publishing internal Drive assets and without depending on the browser's active Google Drive account for downloads.

## Scope

1. Stable AIONE asset ids map to Drive file ids only on the backend download boundary.
2. Cloud Run runtime service account uses Application Default Credentials with Drive read-only scope.
3. Runtime identity must be added once as Viewer to Shared Drive `美和集团（全球）`.
4. `download original` uses AIONE API; `view original` keeps Google Drive web view for now.
5. Download events are recorded best-effort in `business_events`.
6. Vercel bridge streams binary upstream responses instead of buffering the full response.

## Not in V1.9.26

- public anonymous customer links;
- multi-file ZIP/PDF packaging;
- AI automatic file move/rename/write;
- fine-grained asset RBAC beyond current AIONE authenticated internal user boundary;
- Office-file web preview through AIONE.

## Acceptance

- User with valid AIONE identity clicks `下载原件` and receives the file through AIONE.
- Browser Google account does not control download authorization.
- Shared Drive file remains non-public.
- Missing runtime Shared Drive permission returns a clear `drive_runtime_access_missing` error.
