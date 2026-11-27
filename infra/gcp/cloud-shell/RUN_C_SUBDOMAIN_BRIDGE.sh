#!/usr/bin/env bash
set -euo pipefail
echo '[AIONE][STOP] This legacy manual deployment entrypoint is retired.' >&2
echo '[AIONE] Use the reviewed CURRENT Cloud Build pipeline after release approval.' >&2
echo '[AIONE] See docs/RELEASE-READINESS-20261126.md for acceptance and rollback gates.' >&2
exit 64
