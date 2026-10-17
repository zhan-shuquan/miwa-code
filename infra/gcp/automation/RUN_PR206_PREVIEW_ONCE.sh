#!/usr/bin/env bash
# One-command candidate preview from a reviewed PR #206 SHA.
# Reuses CURRENT Cloud Build. DOES NOT run schema migrations or change live traffic.
set -euo pipefail
: "${1:?Usage: bash RUN_PR206_PREVIEW_ONCE.sh <reviewed-40-char-commit-sha>}"
reviewed_sha="$1"
[[ "$reviewed_sha" =~ ^[0-9a-f]{40}$ ]] || { echo '[STOP] Full 40-character SHA required' >&2; exit 64; }
repo='https://github.com/zhan-shuquan/miwa-code.git'
branch='feat/shared-settings-center-20261015'
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT

git -C "$scratch" init -q
git -C "$scratch" fetch -q --depth=1 "$repo" "refs/heads/$branch"
remote_sha="$(git -C "$scratch" rev-parse FETCH_HEAD)"
[[ "$remote_sha" == "$reviewed_sha" ]] || {
  echo "[STOP] PR branch advanced; reviewed=$reviewed_sha actual=$remote_sha" >&2
  exit 65
}
git -C "$scratch" checkout -q --detach "$reviewed_sha"
cd "$scratch"

echo "[AIONE] Reviewed PR #206 candidate: $reviewed_sha"
echo '[AIONE] Starting existing private 0%-traffic Cloud Build preview (not database-isolated).'
AIONE_PREVIEW_COMMIT="$reviewed_sha" bash infra/gcp/automation/PREVIEW_CURRENT_SETTINGS_BACKEND.sh

echo '[AIONE] Build successful. Checking tagged candidate and authenticated health (read only).'
AIONE_PREVIEW_COMMIT="$reviewed_sha" bash infra/gcp/automation/VERIFY_CURRENT_SETTINGS_PREVIEW_READ_ONLY.sh
echo '[AIONE] PASS: private candidate verified, no live traffic cutover requested.'
