#!/usr/bin/env bash
set -euo pipefail

OWNER="zhan-shuquan"
REPO="miwa-code"
FULL_REPO="${OWNER}/${REPO}"
BRANCH="main"
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

command -v gh >/dev/null 2>&1 || { echo "[AIONE][FATAL] gh is required" >&2; exit 2; }
gh auth status >/dev/null 2>&1 || { echo "[AIONE][FATAL] gh is not authenticated" >&2; exit 3; }

printf '\n[AIONE] Safe publish + main protection\nRepository: %s\n\n' "$FULL_REPO"

echo '[AIONE] 1/5 Full Git-history secret scan'
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if command -v gitleaks >/dev/null 2>&1; then
  gitleaks git . --redact --report-format=json --report-path="$TMP_DIR/gitleaks.json"
else
  VERSION="8.24.3"
  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64) GL_ARCH="x64" ;;
    aarch64|arm64) GL_ARCH="arm64" ;;
    *) echo "[AIONE][FATAL] unsupported arch: $ARCH" >&2; exit 4 ;;
  esac
  curl -fsSL "https://github.com/gitleaks/gitleaks/releases/download/v${VERSION}/gitleaks_${VERSION}_linux_${GL_ARCH}.tar.gz" -o "$TMP_DIR/gitleaks.tgz"
  tar -xzf "$TMP_DIR/gitleaks.tgz" -C "$TMP_DIR" gitleaks
  "$TMP_DIR/gitleaks" git . --redact --report-format=json --report-path="$TMP_DIR/gitleaks.json"
fi

echo '[AIONE] Secret scan PASS: no detected secrets in Git history.'

echo '[AIONE] 2/5 Make repository public'
gh repo edit "$FULL_REPO" --visibility public --accept-visibility-change-consequences

echo '[AIONE] 3/5 Enable GitHub secret scanning and push protection where supported'
gh api --method PATCH "repos/${FULL_REPO}" \
  -H 'Accept: application/vnd.github+json' \
  -f security_and_analysis='{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}' >/dev/null 2>&1 || true

echo '[AIONE] 4/5 Install native main protection'
bash infra/github/INSTALL_MAIN_PROTECTION.sh

echo '[AIONE] 5/5 Verify final state'
VISIBILITY="$(gh repo view "$FULL_REPO" --json visibility -q .visibility)"
[[ "$VISIBILITY" == "PUBLIC" ]] || { echo "[AIONE][FATAL] visibility is $VISIBILITY" >&2; exit 5; }

gh api "repos/${FULL_REPO}/branches/${BRANCH}" --jq '{name, protected}'
PROTECTED="$(gh api "repos/${FULL_REPO}/branches/${BRANCH}" --jq .protected)"
[[ "$PROTECTED" == "true" ]] || { echo '[AIONE][FATAL] main is not protected' >&2; exit 6; }

printf '\n[AIONE] PUBLIC + MAIN PROTECTION COMPLETE\n'
printf '%s\n' 'Normal path: branch -> PR -> required checks -> merge main -> automated deployment'
