# Spec: web speed and username sign-in

Source of truth for the intent: `intent.md` in this folder. Status: draft, waiting for the owner's review. Dev-only: lives in `preview` and local checkouts, not in `main`.

## Objective

Three changes, in this order, each shippable on its own:

1. **Home list.** The list of other users on the home page (the leaderboard, confirmed by the owner) shows 5 random players and appears fast, instead of loading 50 and showing them after a long wait.
2. **Login popup.** The popup opens almost instantly after the click.
3. **Register with email, sign in with username.** The register form takes email, username and password. After that the user signs in with the username (or the email) and the password.

Users: web players, new and returning. Existing accounts keep working with no action from them.

## Assumptions I made from the code (correct me now)

1. `AuthPopup` is loaded with `dynamic(..., { ssr: false })` in `components/Providers.tsx`. The chunk (with framer-motion and the Modal) is fetched on the first click, which is the likely cause of the slow popup. Not measured yet.
2. Today "username" accounts are Supabase Auth users with a made-up email `<username>@player.quiz` (`usernameToEmail` in `lib/services/credentials.ts`). No real email is stored for them, and no `username` column exists on `users`.
3. `signInAccount` and `signUpAccount` are shared by the web server actions and the mobile routes (`app/api/mobile/v1/auth/*`). The mobile app sends a username and password only. It must not break.
4. The home page (`app/page.tsx`) awaits `fetchRandomQuestion` and `getGlobalLeaderboard(50)` on every request, and reading `searchParams` makes it dynamic. `getGlobalLeaderboard` is cached 15 s (`unstable_cache`), but the `get_global_leaderboard` RPC aggregates every `quiz_results` row, so a cold or expired cache makes the whole page wait. That fits "long wait, all at once".
5. The same list is fetched again on the client in `hooks/quiz/use-quiz-logic.ts` (`useQuery`, `initialData` from the server, refetch every 15 s while the panel is visible).
6. `fetchRandomQuestion` (`lib/actions/question-actions.ts`) does `.limit(20)` with no ordering, then picks one in JavaScript, so it picks among the same first 20 rows. Not part of this work (see below).

## Decisions from the owner (2026-10-09)

- **Q1.** The list is the home page leaderboard.
- **Q2.** Registration confirms the email.
- **Q3.** The mobile app keeps username-only registration (email optional in the service, required in the web form).

## Open questions

- **Q4. What does "5 random" do to the ranking?** A random 5 is not a top 5, and a global rank needs the full aggregate, which is the slow part. My default: the home list shows 5 random players with name, score and accuracy and no rank number; opening the full leaderboard (the panel's "load more") still loads the ranked top 50 as today, only when opened. Say so if you want something else, for example 5 random from the top 50 with their real ranks (still needs the aggregate, so it would stay slow on a cold cache).
- **Q5. Does the email-code tab stay?** Assumed yes. See the risk under change 3.

## Commands

```
Dev:          npm run dev
Type check:   npm run type-check
Lint:         npm run lint
Tests:        npm test                       (vitest run tests/ components/)
Coverage:     npm run test:coverage          (ratchet in CONSTRAINTS.md)
Fast gate:    npm run check:fast
Task gate:    npm run check:task
Bundle:       npm run build && npm run check:bundle   (ratchet 360 kB)
```

## Project structure (files this touches)

```
components/Providers.tsx                   AuthPopup loading (change 2)
components/auth/AuthPopup.tsx              popup shell (change 2)
components/auth/tabs/UsernameTab.tsx       register form gets email (change 3)
lib/services/credentials.ts                signUpAccount / signInAccount (change 3)
lib/actions/auth-actions.ts                server actions, pass email through (change 3)
app/page.tsx                               stop awaiting the 50-row aggregate (change 1)
lib/actions/leaderboard-actions.ts         random sample action (change 1)
hooks/quiz/use-quiz-logic.ts               load the ranked board only when opened (change 1)
supabase/migrations/20-username.sql        NEW: users.username, unique index, backfill
supabase/migrations/21-random-players.sql  NEW: get_random_players RPC
tests/                                     new and updated vitest files
```

## Change 1: home list, 5 random players

0. **Measure first.** Time the home page server render with a cold and a warm leaderboard cache, and the `get_global_leaderboard` RPC alone (`EXPLAIN ANALYZE` on Supabase, owner runs it). Record the numbers in the PR. No fix without a baseline.
1. One RPC `get_random_players(p_limit int)` (migration `21-random-players.sql`) returns `p_limit` random players who have at least one answer, with `user_id`, `display_name`, `score`, `accuracy`. It aggregates only those players' rows, not the whole table. It clamps `p_limit` to 1..20 like the existing functions clamp theirs, and returns public fields only (no wallet column, no username, no email).
2. `lib/actions/leaderboard-actions.ts` gets `getRandomPlayers(limit = 5)` that calls it, shaped like `LeaderboardEntry` with no rank. An error returns an empty list, as `getGlobalLeaderboard` does.
3. `app/page.tsx` fetches the random 5 instead of `getGlobalLeaderboard(50)`. The ranked top 50 loads when the leaderboard panel is opened (Q4 default), through the existing `useQuery` in `use-quiz-logic.ts`, which should not run before it is opened.
4. Fewer than 5 players available shows fewer, no error.
5. Cost note: a random pick scans the players who have answers. Fine at today's size; switch to a sampled approach if it grows to tens of thousands of players.

Out of this change: `fetchRandomQuestion` picking among the same first 20 rows (assumption 6). Worth a separate fix with its own RPC; say so if you want it in.

## Change 2: login popup

0. **Measure first.** Time click to visible popup on a cold load and on a warm one (Chrome DevTools Performance, 4x CPU throttle, Fast 4G). Record both.
1. Fix the confirmed cause. The first candidate: start loading the popup chunk before the click (on idle after the page is interactive, or on hover and focus of the sign-in button), so the click only mounts it. No new dependency. Keep `ssr: false`.
2. Keep the bundle ratchet green: the popup chunk is a `next/dynamic` chunk, so it does not count toward the first-load figure `check:bundle` reads.

Done when the warm click-to-visible time is under 100 ms and the cold one is lower than the baseline. These numbers are my proposal; the baseline from step 0 can change them.

## Change 3: register with email, sign in with username

Data (migration `20-username.sql`, written here, reviewed and applied by the owner on Supabase):

- `ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;`
- `CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_key ON users (lower(username));`
- Check: `username ~ '^[a-z0-9_]{3,20}$'` (stored lowercase).
- Backfill: for accounts whose Auth email ends with `@player.quiz`, `username` = the part before the `@`. Those accounts already sign in by that name, so nothing changes for them. Accounts created with the email code keep `username` NULL.
- `username` is **not** added to the public `GRANT SELECT` for `anon`, so it is not exposed through the public key.
- Down: `DROP INDEX users_username_lower_key; ALTER TABLE users DROP COLUMN username;` (written in the file header as comments).

Behaviour:

- Register (web): email, username, password. Username is checked against the rule, stored lowercase. A taken username or an already used email returns the same kind of message as today, without leaking more than "already taken".
- Confirm email (Q2): with an email, the account is created with `supabase.auth.signUp`, not `admin.createUser({ email_confirm: true })`, so Supabase sends a confirmation mail. The `users` row with the username is created at sign-up to reserve the name. Sign-in before confirming is refused with "Confirm your email first." (Supabase only says so after a correct password). Owner side: SMTP and "Confirm email" must be on in Supabase, and the redirect URL for the mail must be allowed. Without them nobody can finish registering, so check on a preview first.
- Risk to test on `preview`: an attacker signs up with a victim's email (unconfirmed), then the victim uses the email-code tab for that address. If that signs the victim into the attacker's account, the attacker's password still works there. If the test shows it, the email-code tab must refuse an address whose account was created by password sign-up and is not yet confirmed (Q5).
- Sign in: the input is an email if it contains `@`, otherwise a username. A username is resolved to the account's Auth email on the server (`users.username` to `auth_user_id`, then the Auth user's email) and checked with `signInWithPassword`. Every failure returns the same `Invalid username or password.` The existing rate limit (`allowAttempt('signin', ...)`) stays in front of the lookup.
- Legacy: `<name>@player.quiz` accounts sign in by `name` exactly as before, now through the `username` column.
- Service shape: `signUpAccount(username, password, email?)`. With no email (mobile) it keeps the made-up email, so the mobile routes behave the same. The web form always sends an email.
- Display name stays the trimmed username as typed.

## Code style

Match the neighbours: server-only service functions return `{ ok: true, ... } | { ok: false, error }` like `CredentialResult`; user-facing error strings in English; no new suppression comments; components under 200 lines (ESLint `max-lines`).

```ts
// shape to follow (lib/services/credentials.ts)
export type CredentialResult = { ok: true; account: SessionAccount } | { ok: false; error: string };
```

## Testing strategy

Vitest, files in `tests/` (and `components/**/__tests__`). Real code over mocks; Supabase is mocked at the client boundary like `tests/auth-actions.test.ts` and `tests/mobile-auth-service.test.ts` do today.

- Credentials: register with email stores the username lowercase; duplicate username and duplicate email give the taken message; sign in by username resolves the email and succeeds; sign in by email still works; an unknown username and a wrong password give the identical error; the rate limit still applies; mobile call with no email still registers.
- Credentials, confirm email: a new web registration is not signed in until confirmed; sign-in before confirming gives the confirm message; the mobile no-email path is unchanged.
- Random players: `getRandomPlayers` asks the RPC for 5; fewer rows than 5 returns fewer; an RPC error returns an empty list, not a throw; the ranked board is not fetched until the panel opens.
- Popup: opening shows the form; the preload runs once.
- Changed lines ≥ 80% covered, project ratchet not lowered (lines 53.8, functions 50.7, branches 49.4).
- Migration: reviewed by the owner and run on a Supabase branch or staging first; the SQL checks from `docs/migrations.md` apply.

## Boundaries

- Always: tests first for credentials changes; run `npm run check:task` before a PR; one PR per change, into `preview`, then a promote PR once everything is green.
- Ask first: adding a dependency; any change to the public `GRANT SELECT`; the email-confirmation setting; touching the mobile routes.
- Never: run a migration or deploy from here; add wallet, crypto or web3; expose `username` or emails through the anon key; weaken `CONSTRAINTS.md`; skip or delete a test without a reason.

## Success criteria

1. The home list shows exactly 5 random players (or fewer if fewer exist), two page loads usually differ, and the page no longer waits for the 50-row aggregate.
2. Click to visible popup under 100 ms warm, and lower than baseline cold.
3. A new user registers with email, username and password, then signs in by username, in a test and by hand on `preview`.
4. An existing `<name>@player.quiz` account and an existing email-code account both still sign in.
5. The mobile app's sign-in and register calls pass unchanged (`tests/mobile-auth-*.test.ts` stay green).
6. `npm run check:task` and `npm run build && npm run check:bundle` pass; CI green on the PR.

## Rollout and rollback

Order: PR 1 (login popup, no migration) → PR 2 (home list, needs `21-random-players.sql`) → PR 3 (username and confirm email, needs `20-username.sql` plus the Supabase email settings). Each SQL file is applied by the owner before its PR is promoted to `main`; the code must also be safe to merge into `preview` before the SQL runs (the random list falls back to an empty list, sign-in by email keeps working). Rollback of code is a revert of the PR. Rollback of SQL is the down block in the file header; dropping `username` loses the backfilled names, so take a backup first.
