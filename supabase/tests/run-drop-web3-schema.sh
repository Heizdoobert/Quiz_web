#!/usr/bin/env bash
# Runs supabase/migrations/20-drop-web3-schema.sql, twice, against a throwaway Postgres (Docker)
# taken through production's migration history with wallet-era and email-only sample data, and
# fails if account-keyed data, stats, leaderboards, policies, indexes or grants change, or any
# check in 60-drop-web3-checks.sql fails. Usage: bash supabase/tests/run-drop-web3-schema.sh
set -u
REPO=$(cd "$(dirname "$0")/../.." && pwd)
T="$REPO/supabase/tests"
DROP=20-drop-web3-schema.sql
OUT=$(mktemp -d)
N="quiz-drop-web3-$$"
trap 'docker rm -f "$N" >/dev/null 2>&1; rm -rf "$OUT"' EXIT

docker run -d --rm --name "$N" -e POSTGRES_PASSWORD=x -v "$REPO/supabase/migrations":/m:ro -v "$T":/t:ro postgres:16-alpine >/dev/null
until [ "$(docker logs "$N" 2>&1 | grep -c 'ready to accept connections')" -ge 2 ]; do sleep 0.5; done
P="docker exec -i $N psql -U postgres -q"

# Production's history: the wallet-era scripts and data (as in run-accounts-migration.sh),
# then accounts.sql and the rest of the README order.
$P -f /t/00-setup.sql >/dev/null
for f in schema.sql schema.sql lock-down-public-writes.sql question-lists.sql secure-rewards-and-answers.sql \
         restrict-quiz-results-insert.sql contest-escrow.sql widen-reward-claims-amount.sql; do
  $P -f "/m/$f" >/dev/null 2>&1
done
$P -v ON_ERROR_STOP=1 -f /t/05-wallet-stats-functions.sql >/dev/null || exit 1
$P -f /t/10-seed.sql >/dev/null || exit 1
for f in accounts.sql stats-functions.sql topics.sql search.sql community.sql reward-payee.sql 15-sponsors.sql \
         16-leaderboard-pagination.sql 17-analytics.sql 17-auth-rate-limit.sql 18-ai-usage.sql 19-secure-ai-usage.sql; do
  $P -v ON_ERROR_STOP=1 -f "/m/$f" >/dev/null 2>"$OUT/setup.log" || { echo "FAIL: setup $f"; cat "$OUT/setup.log"; exit 1; }
done
$P -f /t/40-drop-web3-seed.sql >/dev/null || exit 1

fail=0
$P -f /t/50-drop-web3-snapshot.sql > "$OUT/before.txt" || exit 1
if [ -f "$REPO/supabase/migrations/$DROP" ]; then
  # A question owned only through its wallet column must stop the drop and leave everything in place.
  $P -v ON_ERROR_STOP=1 >/dev/null <<'SQL' || exit 1
ALTER TABLE questions DISABLE TRIGGER questions_bridge_account;
INSERT INTO questions (category, prompt, options, correct_index, created_by)
VALUES ('Test', 'Wallet only', '["a","b"]', 0, '0x' || repeat('a', 40));
SQL
  if $P -v ON_ERROR_STOP=1 -f "/m/$DROP" >/dev/null 2>"$OUT/guard.log"; then
    echo "FAIL: $DROP ran over a row owned only by a wallet"; fail=1
  else
    grep -q 'rows in questions have created_by but no created_by_user' "$OUT/guard.log" || { echo "FAIL: guard"; cat "$OUT/guard.log"; fail=1; }
  fi
  $P -v ON_ERROR_STOP=1 -c "DELETE FROM questions WHERE prompt = 'Wallet only'" \
     -c "ALTER TABLE questions ENABLE TRIGGER questions_bridge_account" >/dev/null || exit 1
  $P -f /t/50-drop-web3-snapshot.sql | diff "$OUT/before.txt" - >/dev/null || { echo "FAIL: refused drop changed data"; fail=1; }
  for run in 1 2; do
    $P -v ON_ERROR_STOP=1 -f "/m/$DROP" >/dev/null 2>"$OUT/run$run.log" || { echo "FAIL: $DROP run $run"; grep -E 'ERROR|DETAIL|HINT' "$OUT/run$run.log"; exit 1; }
    $P -f /t/50-drop-web3-snapshot.sql > "$OUT/after$run.txt" || exit 1
  done
  diff "$OUT/before.txt" "$OUT/after1.txt" || { echo "FAIL: account data changed by the drop"; fail=1; }
  diff "$OUT/after1.txt" "$OUT/after2.txt" || { echo "FAIL: re-run changed data"; fail=1; }
else
  echo "FAIL: supabase/migrations/$DROP is missing"; fail=1
fi
$P -v ON_ERROR_STOP=1 -f /t/60-drop-web3-checks.sql >/dev/null 2>"$OUT/checks.log" || { echo "FAIL: checks"; grep -E "ERROR|ASSERT" "$OUT/checks.log"; fail=1; }
[ "$fail" = 0 ] && echo "PASS: $DROP ($(wc -l < "$OUT/before.txt") snapshot lines unchanged, re-run clean, checks passed)"
exit "$fail"
