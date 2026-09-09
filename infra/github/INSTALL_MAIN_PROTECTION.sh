#!/usr/bin/env bash
set -euo pipefail

OWNER="zhan-shuquan"
REPO="miwa-code"
BRANCH="main"

command -v gh >/dev/null 2>&1 || {
  echo "[AIONE][FATAL] GitHub CLI (gh) is required." >&2
  exit 2
}

gh auth status >/dev/null 2>&1 || {
  echo "[AIONE][FATAL] GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 3
}

printf '%s\n' "[AIONE] Install main stable-baseline protection"
printf 'Repository : %s/%s\nBranch     : %s\n' "$OWNER" "$REPO" "$BRANCH"

# Require PRs and the three deterministic GitHub Actions checks that run on every PR to main.
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "repos/${OWNER}/${REPO}/branches/${BRANCH}/protection" \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "guard-current-baseline",
      "backend-check",
      "controlled-db-preflight"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false
}
JSON

printf '%s\n' "[AIONE] Verify main protection"
gh api \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "repos/${OWNER}/${REPO}/branches/${BRANCH}/protection" \
  --jq '{required_status_checks: .required_status_checks.contexts, enforce_admins: .enforce_admins.enabled, required_pull_request_reviews: (.required_pull_request_reviews != null), required_conversation_resolution: .required_conversation_resolution.enabled, allow_force_pushes: .allow_force_pushes.enabled, allow_deletions: .allow_deletions.enabled}'

printf '\n[AIONE] MAIN PROTECTION INSTALLED\n'
printf '%s\n' 'Normal path: branch -> PR -> required checks -> merge main -> automated deployment'
