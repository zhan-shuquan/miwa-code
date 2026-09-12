#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

BRANCH="feat/design-center-tag-card-hero-v1"
SESSION="aione-design-center-preview-run"
LOG="$HOME/aione_design_center_preview.log"

[[ "$(git branch --show-current)" == "$BRANCH" ]] || { echo "[AIONE][STOP] Starter must run from $BRANCH" >&2; exit 20; }
[[ -z "$(git status --porcelain)" ]] || { echo '[AIONE][STOP] Repo must be clean before preview start.' >&2; exit 21; }
git pull --ff-only origin "$BRANCH" >/dev/null

: > "$LOG"
if command -v tmux >/dev/null 2>&1; then
  tmux kill-session -t "$SESSION" 2>/dev/null || true
  tmux new-session -d -s "$SESSION" "cd '$REPO_ROOT' && bash infra/gcp/automation/RUN_DESIGN_CENTER_MH0000002_PREVIEW_V1.sh > '$LOG' 2>&1"
  echo "[AIONE] Preview orchestration started in tmux: $SESSION"
else
  nohup bash infra/gcp/automation/RUN_DESIGN_CENTER_MH0000002_PREVIEW_V1.sh > "$LOG" 2>&1 &
  echo "[AIONE] Preview orchestration started in background PID=$!"
fi

echo "[AIONE] Log: $LOG"
echo "[AIONE] Follow: tail -f $LOG"
