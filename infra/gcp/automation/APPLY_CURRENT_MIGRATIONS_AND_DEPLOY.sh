#!/usr/bin/env bash
set -euo pipefail

echo '[AIONE][STOP] Manual CURRENT migration/deploy is retired.' >&2
echo '[AIONE] Normal release path is now:' >&2
echo '  Branch -> PR checks -> merge main -> aione-current-deploy Cloud Build trigger' >&2
echo '[AIONE] The automatic pipeline owns DB migration, migration verification, read-only preflight, candidate health, and 100% cutover.' >&2
echo '[AIONE] Do not run a second deployment path from Cloud Shell.' >&2
exit 64
