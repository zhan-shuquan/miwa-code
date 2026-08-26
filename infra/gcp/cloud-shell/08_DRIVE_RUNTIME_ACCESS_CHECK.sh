#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib.sh"

say "AIONE Shared Drive runtime identity"
printf '[AIONE] Runtime service account : %s\n' "$RUNTIME_SA_EMAIL"
printf '[AIONE] Shared Drive             : %s\n' '美和集团（全球）'
printf '[AIONE] Required role            : Viewer (V1.9.26 read/download only)\n'
printf '\n[AIONE] One-time action: add the runtime service account above as a member of the Shared Drive.\n'
printf '[AIONE] After that, deploy the backend and test /api/v1/drive-assets/army-architecture/download through AIONE.\n'
