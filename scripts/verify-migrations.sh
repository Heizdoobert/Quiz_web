#!/usr/bin/env bash
# Applies the migration order from README.md to an empty throwaway Postgres (Docker) with Supabase's
# roles stubbed, and prints the errors each script raised. Usage: bash scripts/verify-migrations.sh
# Expected noise on a fresh database: schema.sql errors on its first pass (it references tables it
# creates later, hence it runs twice) and retire-sample-questions.sql (it asserts the old seed
# questions exist). Anything else is a real problem.
set -u
REPO=$(cd "$(dirname "$0")/.." && pwd)
N="verify-migrations-$$"
trap 'docker rm -f "$N" >/dev/null 2>&1' EXIT

docker run -d --rm --name "$N" -e POSTGRES_PASSWORD=x -v "$REPO/supabase/migrations":/m:ro -v "$REPO/supabase/tests":/t:ro postgres:16-alpine >/dev/null
until [ "$(docker logs "$N" 2>&1 | grep -c 'ready to accept connections')" -ge 2 ]; do sleep 0.5; done
P="docker exec -i $N psql -U postgres -q"
$P -f /t/00-setup.sql >/dev/null 2>&1

apply() { echo "$1: $($P -f "/m/$1" 2>&1 >/dev/null | grep ERROR | sort -u | head -2 | tr '\n' ' ')"; }
for f in schema.sql schema.sql lock-down-public-writes.sql question-lists.sql secure-rewards-and-answers.sql \
         restrict-quiz-results-insert.sql contest-escrow.sql widen-reward-claims-amount.sql accounts.sql \
         stats-functions.sql topics.sql search.sql community.sql reward-payee.sql 15-sponsors.sql \
         16-leaderboard-pagination.sql 17-analytics.sql 17-auth-rate-limit.sql 18-ai-usage.sql 19-secure-ai-usage.sql \
         20-drop-web3-schema.sql; do
  apply "$f"
done
echo "--- functions the app calls"
$P -At -c "select proname from pg_proc where proname in ('rate_limit_hit','get_global_leaderboard','get_topics','get_group_leaderboard','get_question_analytics') group by 1 order by 1"
echo "--- get_global_leaderboard overloads (exactly one expected)"
$P -At -c "select oid::regprocedure from pg_proc where proname = 'get_global_leaderboard'"
