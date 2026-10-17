# PR #206 one-command private Preview

Status: proposed PR-branch helper, not yet deployed to GCP. This is **not** a second deployment pipeline.

After code review, green CI, and with gcloud privileges already configured, use a checked-out working copy of the PR branch:

    bash infra/gcp/automation/RUN_PR206_PREVIEW_ONCE.sh <reviewed-full-40-character-PR-head-SHA>

The wrapper fetches a fresh disposable copy of the exact PR branch and refuses a SHA mismatch. It then calls the existing \`PREVIEW_CURRENT_SETTINGS_BACKEND.sh\` (CURRENT Cloud Build preview mode), followed by \`VERIFY_CURRENT_SETTINGS_PREVIEW_READ_ONLY.sh\`. It requires no ChatGPT Work and does not need the operator to type multiple GCP commands. Cloud Build and Cloud Run usage may incur charges.

Safety: candidate is private, uses 0% traffic, and Preview mode bypasses schema migration and preflight. However candidate **still connects to the shared CURRENT database**. Restrict checks to read-only until migration approval. Cloud SQL structure is not changed by this preview flow.

Preconditions: the caller already has authenticated Git read access, Cloud Build submission access, deployment service account use permission, and candidate read/identity-token permissions. These permissions have **not** been verified through this conversation's tools. Never add a service-account JSON key to Repo or GitHub secrets.

This helper deliberately does NOT auto-merge, modify main, initialize stores, approve migrations, or deploy a production release. CI tests the script's syntax and routing only; only a genuine GCP run can establish Cloud Run acceptance.
