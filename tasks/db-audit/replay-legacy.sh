#!/usr/bin/env bash
# Applies the old scripts in the documented order to a throwaway Postgres and dumps the result
# WITH privileges. Usage: bash tasks/db-audit/replay-legacy.sh tasks/db-audit/replay-schema.sql
set -eu
OUT=$1
REPO=$(cd "$(dirname "$0")/../.." && pwd)
N="replay-legacy-$$"
trap 'docker rm -f "$N" >/dev/null 2>&1' EXIT
docker run -d --rm --name "$N" -e POSTGRES_PASSWORD=x \
  -v "$REPO/supabase/legacy/migrations":/m:ro -v "$REPO/supabase/legacy/tests":/t:ro postgres:16-alpine >/dev/null
until [ "$(docker logs "$N" 2>&1 | grep -c 'ready to accept connections')" -ge 2 ]; do sleep 0.5; done
P="docker exec -i $N psql -U postgres -q"
$P -f /t/00-setup.sql >/dev/null 2>&1
for f in schema.sql schema.sql lock-down-public-writes.sql question-lists.sql secure-rewards-and-answers.sql \
         restrict-quiz-results-insert.sql contest-escrow.sql widen-reward-claims-amount.sql accounts.sql \
         stats-functions.sql topics.sql search.sql community.sql reward-payee.sql 15-sponsors.sql \
         16-leaderboard-pagination.sql 17-analytics.sql 17-auth-rate-limit.sql 18-ai-usage.sql 19-secure-ai-usage.sql \
         20-drop-web3-schema.sql remote-config.sql 21-rbac.sql; do
  $P -f "/m/$f" >/dev/null 2>&1 || true
done
docker exec "$N" pg_dump -U postgres --schema-only --no-owner -n public > "$OUT"
echo "wrote $OUT"
