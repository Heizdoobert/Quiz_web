#!/usr/bin/env bash
# Wipes the public schema of ONE Supabase database and rebuilds it from supabase/migrations, in the
# README "Database Setup" order. Dev-only helper: it lives in tasks/, not in the app.
#
#   cd <checkout with supabase/migrations>      # a checkout that has 21-rbac.sql and remote-config.sql
#   DATABASE_URL='postgresql://...' PSQL='docker run --rm -i postgres:16-alpine psql' \
#     bash /mnt/second_drive/web_quiz/tasks/rbac/rebuild-database.sh
#
# DATABASE_URL: Supabase dashboard > Connect > "Session pooler" string (IPv4, port 5432), with your
# database password filled in. It stays on this machine; nothing here prints it.
#
# Safety: it refuses to touch a database where any data table has a row, shows which database it is
# talking to, and waits for you to type RESET.
set -u
MIG=${MIG:-$PWD/supabase/migrations}
PSQL=${PSQL:-psql}
: "${DATABASE_URL:?set DATABASE_URL to the Supabase session-pooler connection string}"
for f in schema.sql accounts.sql remote-config.sql 21-rbac.sql; do
  [ -f "$MIG/$f" ] || { echo "no $MIG/$f: run this from a checkout that has the migrations (or set MIG)"; exit 2; }
done

# psql must not read stdin: with docker -i it would swallow the RESET typed below.
sql() { $PSQL "$DATABASE_URL" -q -At -v ON_ERROR_STOP=1 -c "$1" < /dev/null; }
file() { $PSQL "$DATABASE_URL" -q < "$MIG/$1" 2>&1 >/dev/null | grep -o 'ERROR:.*' | sort -u; }

echo "== target"
sql "select 'database: ' || current_database() || ', server: ' || coalesce(inet_server_addr()::text, 'local')" || exit 1

echo "== refusing to continue if any data table has rows"
sql "
DO \$\$
DECLARE t text; n bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','quiz_results','groups','group_members','question_disputes',
                           'question_lists','question_list_confirmations','list_entries','reward_claims'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      IF n > 0 THEN RAISE EXCEPTION 'public.% has % rows: not resetting', t, n; END IF;
    END IF;
  END LOOP;
END \$\$" || { echo "stopped: this database has data"; exit 1; }
echo "none"

printf 'Type RESET to drop every table and function in the public schema of this database: '
read -r answer
[ "$answer" = "RESET" ] || { echo "not confirmed, nothing changed"; exit 1; }

echo "== reset"
sql "
DO \$\$
DECLARE r record;
BEGIN
  FOR r IN SELECT format('%I.%I', schemaname, viewname) AS o FROM pg_views WHERE schemaname = 'public' LOOP
    EXECUTE 'DROP VIEW IF EXISTS ' || r.o || ' CASCADE';
  END LOOP;
  FOR r IN SELECT format('%I.%I', schemaname, tablename) AS o FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || r.o || ' CASCADE';
  END LOOP;
  -- Functions of extensions (pg_trgm, ...) and event-trigger functions (Supabase's ensure_rls
  -- keeps RLS on for new tables) are left alone.
  FOR r IN SELECT p.oid::regprocedure::text AS o FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.prorettype <> 'event_trigger'::regtype
              AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e') LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.o || ' CASCADE';
  END LOOP;
END \$\$" || { echo "reset failed"; exit 1; }
echo "public schema is empty"

echo "== rebuild"
FAILED=0
# schema.sql runs twice because it references tables it creates later; its errors are expected.
for f in schema.sql schema.sql; do echo "$f: $(file $f | tr '\n' ' ')"; done
for f in lock-down-public-writes.sql question-lists.sql secure-rewards-and-answers.sql \
         restrict-quiz-results-insert.sql contest-escrow.sql widen-reward-claims-amount.sql accounts.sql \
         stats-functions.sql topics.sql search.sql community.sql reward-payee.sql 15-sponsors.sql \
         16-leaderboard-pagination.sql 17-analytics.sql 17-auth-rate-limit.sql 18-ai-usage.sql \
         19-secure-ai-usage.sql 20-drop-web3-schema.sql remote-config.sql 21-rbac.sql; do
  errs=$(file "$f" | tr '\n' ' ')
  if [ -n "$errs" ]; then echo "FAIL $f: $errs"; FAILED=1; else echo "ok   $f"; fi
done

echo "== result"
sql "select 'users columns: ' || string_agg(column_name, ', ' order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = 'users'"
sql "select 'resolve_quarantined_question: ' || coalesce(to_regprocedure('public.resolve_quarantined_question(uuid,text,uuid,text)')::text, 'MISSING')"
sql "select 'remote_config rows: ' || count(*) from public.remote_config"
[ "$FAILED" = 0 ] && echo "DONE: sign in once by email code, then run the first-admin statement from docs/migrations.md" \
                  || echo "STOPPED WITH ERRORS above: send them to Claude before going on"
exit $FAILED
