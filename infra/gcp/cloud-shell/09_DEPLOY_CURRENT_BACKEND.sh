#!/usr/bin/env bash
set -euo pipefail

echo '[AIONE][STOP] This manual deployment entrypoint is retired.' >&2
echo '[AIONE] CURRENT releases are performed by the main-branch automated Cloud Build pipeline.' >&2
echo '[AIONE] Merge approved work to main and allow the canonical automation to run.' >&2
exit 64
