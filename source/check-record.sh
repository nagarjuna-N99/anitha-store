#!/usr/bin/env bash
# Run after EVERY change. Fails if PROJECT_RECORD.md / HOW-IT-WORKS are behind the code.  Add --run to also run the server tests.
cd "$(dirname "$0")" && node record-check.cjs "$@"
