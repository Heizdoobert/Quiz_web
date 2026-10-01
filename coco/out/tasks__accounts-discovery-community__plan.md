# tasks/accounts-discovery-community/plan.md
lines:144 exports:
---
# Implementation Plan: Accounts, Discovery and Community

## Overview
Build the five approved specs in capability-map order. Players sign in with an email code or a wallet, with the wallet optional, and `$QUIZ` follows the account (old coins go to the player once a wallet is added; the treasury only sweeps coins over 180 days old from accounts that still have no wallet). The sample questions are retired, only signed-in players create, and guests are read-only but can still play. Anyone can search questions and browse topics newest first. Players who answered can rate, comment and send suggestions to authors.

Specs:
- `docs/specs/identity-accounts.md`
- `docs/specs/trivia-guest-access.md`
- `docs/specs/discovery.md`
- `docs/specs/community.md`
- `docs/specs/rewards-no-wallet-payee.md`

Tasks: `tasks/accounts-discovery-community/todo.md`. This lives beside `tasks/plan.md`, which still holds PR #9's open production task.

Base: branch `spec/accounts-discovery-community`, stacked on PR #9 (`fix/prod-answer-persistence`). #9 merges first.

## What the code check found (2026-09-28)
- `getSessionWallet()` has 13 call sites in 8 action files; nothing else on the server reads the session.
- Browser-supplied wallet arguments in 10 actions:
  - these 8 take one, with their browser callers in 7 files: `getUserStats`, `getAnswerHistory`, `getClaimableRewards`, `getUserGroups`, `getMyLists`, `getListsPendingReview`, `exportUserData`, `getOrCreateUser`
  - `confirmRewardClaim` also takes one; its caller is `ContestPlay`
  - so does `requestSignIn` (fine: it is the sign-in challenge)
- On the client, `useWalletSession` has 8 callers and wagmi `useAccount` decides "signed in" in 5 files. Both must move to a server-fed session, or email accounts can't be signed in anywhere.
- `reward-actions` calls `getUserStats(address)` directly, so stats need a server-only helper.
- `getOrCreateUser` is no longer needed once sign-in creates the account, so it is deleted rather than migrated.
- Guest write controls live in `QuizLayout`, `AnswerBack` (dispute), `LeaderboardPanel` (groups), `ListsNav` (My Lists, Review) and `ContestBrowser` (join).
- There is no local database (`docker-compose.yml` runs only the web app), so every SQL check runs on a Supabase branch.

## Dependency graph
```
1 schema ─ 2 session ─┬─ 3 answers/stats ─ 4 leaderboards ─┐
                      ├─ 5 questions/disputes ─────────────┤
                      ├─ 6 lists/contests ─────────────────┼─ 9 rewards, delete wallet-session ─ 10 client session ─┬─ 11 page gating
                      ├─ 7 groups ─────────────────────────┤                                                      └─ 12 email ─ 13 add wallet
                      └─ 8 profile export ─────────────────┘
Phase 1 ─ 14 public rule ─┬─ 15 topics ─┬─ 16 guests read-only ─┐
                          │             └─ 17 search ─ 18 topic pages
                          └─ 19 community data ─┬───────────────┴─ 20 card-back UI
                                                └─ 21 profile suggestions
9 ─ 22 payee/sweep ─ (13, 22) ─ 23 disclosure/contest ─ 24 rollout ─ 25 drop old columns
