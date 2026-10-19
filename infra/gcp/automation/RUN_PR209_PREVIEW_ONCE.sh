#!/usr/bin/env bash
# Deploy only a reviewed PR #209 commit as a private CURRENT traffic tag.
# Candidate shares the existing database; this command does not migrate or write app data.
set -euo pipefail
: "${1:?Usage: bash RUN_PR209_PREVIEW_ONCE.sh <reviewed-40-character-sha>}"
reviewed_sha="$1"
[[ "$reviewed_sha" =~ ^[a-f0-9]{40}$ ]] || { echo '[STOP] Full reviewed SHA required' >&2; exit 64; }
preview_dir="$(mktemp -d -t aione-pr209-preview.XXXXXX)"
git -C "$preview_dir" init -q
git -C "$preview_dir" fetch -q --depth=1 https://github.com/zhan-shuquan/miwa-code.git refs/heads/feat/product-center-erp-unified-20261017
actual_sha="$(git -C "$preview_dir" rev-parse FETCH_HEAD)"
[[ "$actual_sha" == "$reviewed_sha" ]] || { echo "[STOP] PR advanced: reviewed=$reviewed_sha actual=$actual_sha" >&2; exit 65; }
git -C "$preview_dir" checkout -q --detach "$reviewed_sha"
cd "$preview_dir"
echo "[AIONE] PR #209 reviewed candidate: $reviewed_sha"
AIONE_PREVIEW_COMMIT="$reviewed_sha" bash infra/gcp/automation/PREVIEW_CURRENT_SETTINGS_BACKEND.sh
AIONE_PREVIEW_COMMIT="$reviewed_sha" bash infra/gcp/automation/VERIFY_CURRENT_SETTINGS_PREVIEW_READ_ONLY.sh
echo '[AIONE] Candidate deploy/health complete. No live traffic cutover or DB migration.'
echo '[AIONE] Next: bind only the PR #209 Vercel preview to the printed PREVIEW_BACKEND_URL.'
