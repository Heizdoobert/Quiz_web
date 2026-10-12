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
         20-drop-web3-schema.sql 21-rbac.sql; do
  apply "$f"
done
echo -n "re-run "; apply 21-rbac.sql
echo "--- functions the app calls"
$P -At -c "select proname from pg_proc where proname in ('rate_limit_hit','get_global_leaderboard','get_topics','get_group_leaderboard','get_question_analytics') group by 1 order by 1"
echo "--- get_global_leaderboard overloads (exactly one expected)"
$P -At -c "select oid::regprocedure from pg_proc where proname = 'get_global_leaderboard'"

# 21-rbac.sql: each check prints ok or FAIL, and any FAIL makes the script exit 1.
echo "--- rbac checks (21-rbac.sql)"
FAILED=0
check() { # name, expected output, sql
  got=$($P -At -c "$3" 2>&1 | head -1)
  if [ "$got" = "$2" ]; then echo "ok: $1"; else echo "FAIL: $1 (expected '$2', got '$got')"; FAILED=1; fi
}
check "users.role is NOT NULL with default 'user'" "NO|'user'::text" \
  "select is_nullable || '|' || column_default from information_schema.columns where table_name = 'users' and column_name = 'role'"
check "users.role rejects an unknown role" "" \
  "do \$\$ begin insert into users (display_name, role) values ('rbac-check', 'owner'); raise exception 'accepted'; exception when check_violation then null; end \$\$"
check "public keys cannot read users.role" "f" \
  "select has_column_privilege('anon', 'users', 'role', 'select') or has_column_privilege('authenticated', 'users', 'role', 'select')"
check "public keys still read users.display_name" "t" \
  "select has_column_privilege('anon', 'users', 'display_name', 'select')"
check "question_disputes has the four resolution columns" "4" \
  "select count(*) from information_schema.columns where table_name = 'question_disputes' and column_name in ('resolved_at', 'resolved_by', 'resolution', 'resolution_note')"
check "question_disputes has both resolution constraints" "2" \
  "select count(*) from pg_constraint where conname in ('question_disputes_resolution_check', 'question_disputes_resolved_together')"
check "question_disputes has no public read policy" "0" \
  "select count(*) from pg_policies where tablename = 'question_disputes'"
exit $FAILED
