#!/usr/bin/env bash
# Local Supabase stand-in for testing /admin: Postgres 16 + PostgREST in Docker, the repo's migrations,
# seed rows, and throwaway keys. Dev-only helper (lives in tasks/, not in the app). Nothing here touches
# the main checkout's .env or any real database; everything binds to 127.0.0.1.
#
#   cd <checkout with supabase/migrations>        # e.g. .worktrees/company/update-code
#   bash /mnt/second_drive/web_quiz/tasks/admin/local-supabase.sh up        # (re)build the stack, write .env.local
#   bash /mnt/second_drive/web_quiz/tasks/admin/local-supabase.sh cookies   # quiz_session values per role
#   bash /mnt/second_drive/web_quiz/tasks/admin/local-supabase.sh down      # remove containers and the proxy
#
# Then `npx next start -p 3000` (after `npm run build`) reads .env.local. Sign in as a role by setting the
# cookie in the browser: document.cookie = 'quiz_session=<value>; path=/'.
#
# Images needed: postgres:16-alpine and public.ecr.aws/supabase/postgrest:v14.1 (pulled on first use).
# Ports: 54322 Postgres, 54321 PostgREST, 54320 gateway stand-in (strips /rest/v1, which supabase-js adds).
set -euo pipefail

REPO=${REPO:-$PWD}
STATE=${STATE:-$HOME/.cache/quiz-local-supabase}
DB=quiz-local-db REST=quiz-local-rest NET=quiz-local
POSTGREST_IMAGE=public.ecr.aws/supabase/postgrest:v14.1
MARK='# quiz-local-supabase (throwaway, generated)'

# Fixed ids so cookies stay valid across rebuilds.
ADMIN=00000000-0000-4000-8000-0000000000a1
MODERATOR=00000000-0000-4000-8000-0000000000b2
PLAYER=00000000-0000-4000-8000-0000000000c3

# Same order as scripts/verify-migrations.sh (schema.sql twice: it references tables it creates later).
MIGRATIONS="schema.sql schema.sql lock-down-public-writes.sql question-lists.sql secure-rewards-and-answers.sql
 restrict-quiz-results-insert.sql contest-escrow.sql widen-reward-claims-amount.sql accounts.sql
 stats-functions.sql topics.sql search.sql community.sql reward-payee.sql 15-sponsors.sql
 16-leaderboard-pagination.sql 17-analytics.sql 17-auth-rate-limit.sql 18-ai-usage.sql 19-secure-ai-usage.sql
 20-drop-web3-schema.sql remote-config.sql 21-rbac.sql 21-rbac.sql"

stop_proxy() {
  [ -f "$STATE/proxy.pid" ] && kill "$(cat "$STATE/proxy.pid")" 2>/dev/null || true
  rm -f "$STATE/proxy.pid"
}

down() {
  docker rm -f "$DB" "$REST" >/dev/null 2>&1 || true
  stop_proxy
}

secrets() {
  mkdir -p "$STATE"; chmod 700 "$STATE"
  [ -f "$STATE/pgpw" ] || openssl rand -hex 12 > "$STATE/pgpw"
  [ -f "$STATE/jwt" ] || openssl rand -hex 32 > "$STATE/jwt"
  chmod 600 "$STATE/pgpw" "$STATE/jwt"
}

# HS256 JWT for a PostgREST role, signed with the local secret.
jwt_for() {
  node -e '
    const c = require("crypto"), b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const p = b({ alg: "HS256", typ: "JWT" }) + "." + b({ role: process.argv[1], iss: "supabase-local", exp: Math.floor(Date.now() / 1e3) + 30 * 86400 });
    process.stdout.write(p + "." + c.createHmac("sha256", process.argv[2]).update(p).digest("base64url"));
  ' "$1" "$(cat "$STATE/jwt")"
}

cookies() {
  [ -f "$REPO/.env.local" ] || { echo "no $REPO/.env.local: run 'up' first" >&2; exit 1; }
  # Mirrors lib/services/session.ts: HMAC key derived from SUPABASE_SECRET_KEY, payload "<id>.<expiry>".
  SECRET=$(grep '^SUPABASE_SECRET_KEY=' "$REPO/.env.local" | cut -d= -f2) node -e '
    const c = require("crypto");
    const key = c.createHmac("sha256", process.env.SECRET).update("quiz-session").digest();
    for (const [role, id] of [["admin", process.argv[1]], ["moderator", process.argv[2]], ["user", process.argv[3]]]) {
      const pl = id + "." + (Math.floor(Date.now() / 1e3) + 7 * 86400);
      console.log(role + "=" + pl + "." + c.createHmac("sha256", key).update(pl).digest("base64url"));
    }
  ' "$ADMIN" "$MODERATOR" "$PLAYER"
}

up() {
  for f in $MIGRATIONS; do
    [ -f "$REPO/supabase/migrations/$f" ] || { echo "no $REPO/supabase/migrations/$f: run from a checkout with the migrations (or set REPO)" >&2; exit 2; }
  done
  [ -f "$REPO/supabase/tests/00-setup.sql" ] || { echo "no supabase/tests/00-setup.sql under $REPO" >&2; exit 2; }
  if [ -f "$REPO/.env.local" ] && ! grep -qF "$MARK" "$REPO/.env.local"; then
    echo "$REPO/.env.local exists and was not written by this script; move it away first" >&2; exit 2
  fi
  secrets; down
  PGPW=$(cat "$STATE/pgpw")

  docker network create "$NET" >/dev/null 2>&1 || true
  docker run -d --name "$DB" --network "$NET" -p 127.0.0.1:54322:5432 -e POSTGRES_PASSWORD="$PGPW" \
    -v "$REPO/supabase/migrations":/m:ro -v "$REPO/supabase/tests":/t:ro postgres:16-alpine >/dev/null
  until [ "$(docker logs "$DB" 2>&1 | grep -c 'ready to accept connections')" -ge 2 ]; do sleep 0.5; done
  P="docker exec -i $DB psql -U postgres -q"

  # Supabase roles, then default grants BEFORE the migrations so their column revokes (users.role) still apply.
  $P -f /t/00-setup.sql >/dev/null 2>&1
  $P -v ON_ERROR_STOP=1 -c "CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD '$PGPW';
    GRANT anon, authenticated, service_role TO authenticator;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;"
  for f in $MIGRATIONS; do
    e=$($P -f "/m/$f" 2>&1 >/dev/null | grep ERROR | sort -u | head -2 | tr '\n' ' ') || true
    [ -n "$e" ] && echo "$f: $e"   # schema.sql's two first-pass errors are expected
  done

  $P -v ON_ERROR_STOP=1 <<SQL
INSERT INTO users (id, display_name, role) VALUES
  ('$ADMIN', 'Local Admin', 'admin'),
  ('$MODERATOR', 'Local Moderator', 'moderator'),
  ('$PLAYER', 'Local Player', 'user'),
  ('00000000-0000-4000-8000-0000000000d4', 'Reporter One', 'user'),
  ('00000000-0000-4000-8000-0000000000d5', 'Reporter Two', 'user');
INSERT INTO questions (id, prompt, options, correct_index, status, dispute_count) VALUES
  ('00000000-0000-4000-8000-0000000000e1', 'Which planet is closest to the sun?', '["Mercury","Venus","Mars","Earth"]', 0, 'quarantined', 2);
INSERT INTO question_disputes (question_id, reporter_user, reason) VALUES
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000d4', 'Looks wrong to me'),
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000d5', 'Duplicate of another question');
SQL

  docker run -d --name "$REST" --network "$NET" -p 127.0.0.1:54321:3000 \
    -e PGRST_DB_URI="postgres://authenticator:$PGPW@$DB:5432/postgres" -e PGRST_DB_SCHEMAS=public \
    -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET="$(cat "$STATE/jwt")" "$POSTGREST_IMAGE" >/dev/null

  # supabase-js calls <url>/rest/v1/...; Supabase's gateway serves that prefix, bare PostgREST does not.
  cat > "$STATE/rest-proxy.mjs" <<'JS'
import http from 'node:http';
http.createServer((req, res) => {
  const p = http.request({ host: '127.0.0.1', port: 54321, method: req.method, path: req.url.replace(/^\/rest\/v1/, ''), headers: req.headers },
    (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on('error', (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(p);
}).listen(54320, '127.0.0.1');
JS
  nohup node "$STATE/rest-proxy.mjs" > "$STATE/proxy.log" 2>&1 &
  echo $! > "$STATE/proxy.pid"

  umask 077
  cat > "$REPO/.env.local" <<EOF
$MARK
SUPABASE_URL=http://127.0.0.1:54320
SUPABASE_PUBLISHABLE_KEY=$(jwt_for anon)
SUPABASE_SECRET_KEY=$(jwt_for service_role)
EOF

  for _ in $(seq 1 30); do
    curl -sf -o /dev/null "http://127.0.0.1:54320/rest/v1/" -H "apikey: x" 2>/dev/null && break
    sleep 1
  done
  K=$(grep '^SUPABASE_SECRET_KEY=' "$REPO/.env.local" | cut -d= -f2)
  got=$(curl -s "http://127.0.0.1:54320/rest/v1/users?select=role&role=eq.admin" -H "apikey: $K" -H "Authorization: Bearer $K")
  [ "$got" = '[{"role":"admin"}]' ] || { echo "smoke check failed, got: $got" >&2; exit 1; }
  echo "up: admin row readable through the proxy; .env.local written in $REPO"
  echo "next: bash $0 cookies"
}

case "${1:-}" in
  up) up ;;
  down) down; echo "down" ;;
  cookies) cookies ;;
  *) echo "usage: $0 up|down|cookies" >&2; exit 2 ;;
esac
