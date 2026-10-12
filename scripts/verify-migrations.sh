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
# resolve_quarantined_question: behaviour on real rows, all rolled back at the end.
RESOLVE_SQL=$(cat <<'SQL'
DO $$
DECLARE m UUID; r1 UUID; r2 UUID; r3 UUID; q1 UUID; q2 UUID; n INT;
BEGIN
  BEGIN
    INSERT INTO users (display_name) VALUES ('rbac-mod') RETURNING id INTO m;
    INSERT INTO users (display_name) VALUES ('rbac-r1') RETURNING id INTO r1;
    INSERT INTO users (display_name) VALUES ('rbac-r2') RETURNING id INTO r2;
    INSERT INTO users (display_name) VALUES ('rbac-r3') RETURNING id INTO r3;
    INSERT INTO questions (prompt, options, correct_index, status, dispute_count)
      VALUES ('rbac q1', '["a","b"]', 0, 'quarantined', 2) RETURNING id INTO q1;
    INSERT INTO question_disputes (question_id, reporter_user, reason) VALUES (q1, r1, 'x'), (q1, r2, 'y');

    -- restore: question live again with a clean count, both disputes stamped
    IF NOT resolve_quarantined_question(q1, 'restored', m, 'looks fine') THEN RAISE EXCEPTION 'restore returned false'; END IF;
    IF (SELECT status || dispute_count FROM questions WHERE id = q1) <> 'verified0' THEN RAISE EXCEPTION 'restore left the question wrong'; END IF;
    SELECT count(*) INTO n FROM question_disputes
      WHERE question_id = q1 AND resolution = 'restored' AND resolved_by = m AND resolution_note = 'looks fine' AND resolved_at IS NOT NULL;
    IF n <> 2 THEN RAISE EXCEPTION 'restore stamped % disputes, expected 2', n; END IF;

    -- a second resolve finds nothing quarantined and changes nothing
    IF resolve_quarantined_question(q1, 'retired', m, NULL) THEN RAISE EXCEPTION 'resolved a question that was not quarantined'; END IF;
    IF (SELECT status FROM questions WHERE id = q1) <> 'verified' THEN RAISE EXCEPTION 'second resolve changed the question'; END IF;

    -- quarantined again by a new report: retire stamps only the new dispute
    UPDATE questions SET status = 'quarantined', dispute_count = 1 WHERE id = q1;
    INSERT INTO question_disputes (question_id, reporter_user, reason) VALUES (q1, r3, 'z');
    IF NOT resolve_quarantined_question(q1, 'retired', m, NULL) THEN RAISE EXCEPTION 'retire returned false'; END IF;
    IF (SELECT status FROM questions WHERE id = q1) <> 'rejected' THEN RAISE EXCEPTION 'retire left the question wrong'; END IF;
    SELECT count(*) INTO n FROM question_disputes WHERE question_id = q1 AND resolution = 'restored';
    IF n <> 2 THEN RAISE EXCEPTION 'retire re-stamped the old disputes'; END IF;
    SELECT count(*) INTO n FROM question_disputes WHERE question_id = q1 AND resolution = 'retired' AND resolution_note IS NULL;
    IF n <> 1 THEN RAISE EXCEPTION 'retire did not stamp the new dispute'; END IF;

    -- a live question is not resolvable, and a bad outcome is refused
    INSERT INTO questions (prompt, options, correct_index) VALUES ('rbac q2', '["a","b"]', 0) RETURNING id INTO q2;
    IF resolve_quarantined_question(q2, 'restored', m, NULL) THEN RAISE EXCEPTION 'resolved a verified question'; END IF;
    BEGIN
      PERFORM resolve_quarantined_question(q2, 'deleted', m, NULL);
      RAISE EXCEPTION 'accepted a bad outcome';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'accepted a bad outcome' THEN RAISE; END IF;
    END;

    RAISE EXCEPTION 'rbac-checks-done';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'rbac-checks-done' THEN RAISE; END IF;
  END;
END $$
SQL
)
check "resolve_quarantined_question restores, retires and refuses as designed" "" "$RESOLVE_SQL"
check "public keys cannot execute resolve_quarantined_question" "f" \
  "select has_function_privilege('anon', 'resolve_quarantined_question(uuid,text,uuid,text)', 'execute') or has_function_privilege('authenticated', 'resolve_quarantined_question(uuid,text,uuid,text)', 'execute')"
check "service_role can execute resolve_quarantined_question" "t" \
  "select has_function_privilege('service_role', 'resolve_quarantined_question(uuid,text,uuid,text)', 'execute')"
# A database that never ran accounts.sql (users keyed by wallet_address) must get a clear
# message from 21-rbac.sql, not 42703 from the resolved_by foreign key.
echo "--- prerequisites (21-rbac.sql)"
prereq() { # name, expected first error message, setup sql for an otherwise empty database
  $P -c "drop database if exists prereq" >/dev/null 2>&1
  $P -c "create database prereq" >/dev/null 2>&1
  $P -d prereq -c "$3" >/dev/null 2>&1
  got=$($P -d prereq -f /m/21-rbac.sql 2>&1 | grep -m1 -o 'ERROR:  .*' | sed 's/^ERROR:  //')
  if [ "$got" = "$2" ]; then echo "ok: $1"; else echo "FAIL: $1 (expected '$2', got '$got')"; FAILED=1; fi
}
prereq "stops when users has no id column (accounts.sql not applied)" \
  "21-rbac.sql: public.users has no id column; apply accounts.sql first (docs/migrations.md)" \
  "create table users (wallet_address text primary key); create table question_disputes (question_id uuid)"
prereq "stops when question_disputes is missing (schema.sql not applied)" \
  "21-rbac.sql: public.question_disputes does not exist; apply schema.sql and accounts.sql first (docs/migrations.md)" \
  "create table users (id uuid primary key)"
exit $FAILED
