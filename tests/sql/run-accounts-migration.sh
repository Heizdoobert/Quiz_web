#!/usr/bin/env bash
# Runs supabase/migrations/accounts.sql then stats-functions.sql, twice, against a throwaway
# Postgres (Docker) loaded with production's shape and sample data, and fails if counts,
# stats or leaderboards change or any check in 30-checks.sql fails. Usage: bash tests/sql/run-accounts-migration.sh
set -u
REPO=$(cd "$(dirname "$0")/../.." && pwd)
T="$REPO/tests/sql"
OUT=$(mktemp -d)
N="quiz-accounts-migration-$$"
trap 'docker rm -f "$N" >/dev/null 2>&1; rm -rf "$OUT"' EXIT

docker run -d --rm --name "$N" -e POSTGRES_PASSWORD=x -v "$REPO/supabase/migrations":/repo-lib:ro -v "$T":/t:ro postgres:16-alpine >/dev/null
until [ "$(docker logs "$N" 2>&1 | grep -c 'ready to accept connections')" -ge 2 ]; do sleep 0.5; done
P="docker exec -i $N psql -U postgres -q"

$P -f /t/00-setup.sql
# schema.sql twice: reward_claims references question_lists before that table is created.
for f in schema.sql schema.sql lock-down-public-writes.sql question-lists.sql \
         secure-rewards-and-answers.sql restrict-quiz-results-insert.sql contest-escrow.sql \
         widen-reward-claims-amount.sql; do
  $P -f "/repo-lib/$f" >/dev/null 2>>"$OUT/existing-errors.log"
done
$P -v ON_ERROR_STOP=1 -f /t/05-wallet-stats-functions.sql >/dev/null || exit 1

fail=0
$P -f /t/10-seed.sql || exit 1
$P -f /t/20-snapshot.sql > "$OUT/before.txt"
$P -v ON_ERROR_STOP=1 -f /repo-lib/accounts.sql >/dev/null 2>"$OUT/run1.log" || { echo "FAIL: accounts.sql run 1"; cat "$OUT/run1.log"; exit 1; }
$P -v ON_ERROR_STOP=1 -f /repo-lib/stats-functions.sql >/dev/null 2>>"$OUT/run1.log" || { echo "FAIL: stats-functions.sql run 1"; cat "$OUT/run1.log"; exit 1; }
$P -f /t/20-snapshot.sql > "$OUT/after1.txt"
$P -v ON_ERROR_STOP=1 -f /repo-lib/accounts.sql >/dev/null 2>"$OUT/run2.log" || { echo "FAIL: accounts.sql run 2"; grep ERROR "$OUT/run2.log"; exit 1; }
$P -v ON_ERROR_STOP=1 -f /repo-lib/stats-functions.sql >/dev/null 2>>"$OUT/run2.log" || { echo "FAIL: stats-functions.sql run 2"; grep ERROR "$OUT/run2.log"; exit 1; }
$P -f /t/20-snapshot.sql > "$OUT/after2.txt"
diff "$OUT/before.txt" "$OUT/after1.txt" || { echo "FAIL: data changed by migration"; fail=1; }
diff "$OUT/after1.txt" "$OUT/after2.txt" || { echo "FAIL: re-run changed data"; fail=1; }
$P -v ON_ERROR_STOP=1 -f /t/30-checks.sql >/dev/null 2>"$OUT/checks.log" || { echo "FAIL: checks"; grep -E "ERROR|ASSERT" "$OUT/checks.log"; fail=1; }
[ "$fail" = 0 ] && echo "PASS: accounts.sql ($(wc -l < "$OUT/before.txt") snapshot lines unchanged, re-run clean, checks passed)"
exit "$fail"
