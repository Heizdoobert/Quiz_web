#!/usr/bin/env bash
# Prints the differences between two schema dumps, ignoring what varies from run to run:
# comments, blank lines, SET lines, set_config calls and pg_dump's \restrict tokens.
# Usage: bash scripts/db-schema-diff.sh before.sql after.sql   (exit 0 means identical)
set -euo pipefail
norm() { grep -vE '^(--|$|\\(un)?restrict |SET |SELECT pg_catalog\.set_config)' "$1" | sed -E 's/[[:space:]]+$//'; }
diff <(norm "$1") <(norm "$2")
