# Spec: web speed and username sign-in

Source of truth for the intent: `intent.md` in this folder. Status: draft, waiting for the owner's review. Dev-only: lives in `preview` and local checkouts, not in `main`.

## Objective

Three changes, in this order, each shippable on its own:

1. **Quiz list.** The list of quizzes created by other users shows 5 random quizzes and appears fast, instead of loading everything and showing it after a long wait.
2. **Login popup.** The popup opens almost instantly after the click.
3. **Register with email, sign in with username.** The register form takes email, username and password. After that the user signs in with the username (or the email) and the password.

Users: web players, new and returning. Existing accounts keep working with no action from them.

## Assumptions I made from the code (correct me now)

1. `AuthPopup` is loaded with `dynamic(..., { ssr: false })` in `components/Providers.tsx`. The chunk (with framer-motion and the Modal) is fetched on the first click, which is the likely cause of the slow popup. Not measured yet.
2. Today "username" accounts are Supabase Auth users with a made-up email `<username>@player.quiz` (`usernameToEmail` in `lib/services/credentials.ts`). No real email is stored for them, and no `username` column exists on `users`.
3. `signInAccount` and `signUpAccount` are shared by the web server actions and the mobile routes (`app/api/mobile/v1/auth/*`). The mobile app sends a username and password only. It must not break.
4. `fetchRandomQuestion` (`lib/actions/question-actions.ts`) does `.limit(20)` with no ordering, then picks one in JavaScript. That is not random across the table: it picks among the same first 20 rows. PostgREST cannot `ORDER BY random()`, so a real random pick needs an RPC.
5. The home page (`app/page.tsx`) awaits `fetchRandomQuestion` and `getGlobalLeaderboard(50)` on every request. Reading `searchParams` makes the page dynamic, so nothing is prerendered.

## Open questions (need the owner before the work starts)

- **Q1. Which screen is "the list of quizzes created by other users"?** I could not find a screen that lists other users' quizzes in the first-load path. Candidates: the global leaderboard on the home page (50 users), `/topics/[topic]` (paginated questions), `/search`. The spec for change 1 stays generic until this is answered, and step 0 below measures it.
- **Q2. Email confirmation.** Today accounts are created with `email_confirm: true`. If a real email is accepted unverified, anyone can register `victim@mail.com` with a password they chose, and the victim then signs in through the email-code tab and lands in the attacker's account. Recommended: do not mark the email confirmed; Supabase sends a confirmation mail and the username sign-in works only after the user confirms. This needs SMTP and the "Confirm email" setting in Supabase, which only the owner can configure. The alternative is to accept unverified emails and treat them as untrusted.
- **Q3. Mobile registration.** Keep username-only registration for the mobile app (email optional in the service, required in the web form)? Assumed yes, so the mobile app does not break. The Flutter app is out of scope.

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
lib/actions/question-actions.ts            random list fetch (change 1)
supabase/migrations/20-username.sql        NEW: users.username, unique index, backfill, random RPC
tests/                                     new and updated vitest files
```

## Change 1: quiz list, 5 random

0. **Measure first.** Time the server render of the home page (`fetchRandomQuestion` plus `getGlobalLeaderboard(50)`) and the Supabase calls behind the list from Q1, on `preview`. Record the numbers in the PR. No fix without a baseline.
1. One RPC `get_random_questions(p_limit int, p_category text default null, p_exclude uuid[] default '{}')` that returns `p_limit` verified, non-list questions in `ORDER BY random()`, public columns only (same columns as the existing select). The list asks for 5.
2. The list fetch calls it with `p_limit = 5` and renders what it gets. Fewer than 5 available means fewer shown, no error.
3. Cost note: `ORDER BY random()` scans the matching rows. Fine at the current table size; if the table grows past tens of thousands of rows, switch to a sampled approach.

Out of this change: moving `fetchRandomQuestion` to the same RPC. It has the "first 20 rows" problem from assumption 4. Worth doing, kept separate to keep this diff small. Say so if you want it in.

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
- Random list: asks the RPC for 5; fewer rows than 5 renders fewer; error returns an empty list, not a throw.
- Popup: opening shows the form; the preload runs once.
- Changed lines ≥ 80% covered, project ratchet not lowered (lines 53.8, functions 50.7, branches 49.4).
- Migration: reviewed by the owner and run on a Supabase branch or staging first; the SQL checks from `docs/migrations.md` apply.

## Boundaries

- Always: tests first for credentials changes; run `npm run check:task` before a PR; one PR per change, into `preview`, then a promote PR once everything is green.
- Ask first: adding a dependency; any change to the public `GRANT SELECT`; the email-confirmation setting; touching the mobile routes.
- Never: run a migration or deploy from here; add wallet, crypto or web3; expose `username` or emails through the anon key; weaken `CONSTRAINTS.md`; skip or delete a test without a reason.

## Success criteria

1. The list shows exactly 5 random quizzes, and two page loads usually differ.
2. Click to visible popup under 100 ms warm, and lower than baseline cold.
3. A new user registers with email, username and password, then signs in by username, in a test and by hand on `preview`.
4. An existing `<name>@player.quiz` account and an existing email-code account both still sign in.
5. The mobile app's sign-in and register calls pass unchanged (`tests/mobile-auth-*.test.ts` stay green).
6. `npm run check:task` and `npm run build && npm run check:bundle` pass; CI green on the PR.

## Rollout and rollback

Order: PR 1 (login popup, no migration) → PR 2 (list, needs the RPC) → PR 3 (username, needs the column). The two SQL parts live in one file `20-username.sql`, or split into two if the owner prefers to apply them separately. Rollback of code is a revert of the PR. Rollback of SQL is the down block in the file header; dropping `username` loses the backfilled names, so take a backup first.
