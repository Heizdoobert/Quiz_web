# AGENT_MAP.md
lines:25 exports:
---
# AGENT_MAP — read this first (1 read to any point)

Flow: this file → 1 snippet in `coco/out/` → source. Snippet name =
path with `/` → `__` (+`.md` unless already `.md`).
Each snippet: line count, exports, first 40 lines. Never grep blind.

| Module | Lives in | Docs |
|---|---|---|
| identity | `lib/wallet-session.ts`, `lib/actions/auth-actions.ts`, `lib/users.ts` | `docs/specs/identity-accounts.md` |
| trivia | `lib/actions/question-actions.ts`, `quiz-actions.ts`, `app/page.tsx` | `docs/specs/trivia-guest-access.md`, `answer-persistence.md` |
| discovery | `lib/actions/discovery-actions.ts`, `app/search`, `app/topics` | `docs/specs/discovery.md` |
| community | `lib/actions/community-actions.ts`, `components/community/` | `docs/specs/community.md` |
| lists | `lib/actions/question-list-actions.ts`, `app/my-lists`, `app/review`, `app/contest` | `docs/specs/contest-escrow.md` |
| rankings | `lib/actions/leaderboard-actions.ts`, `group-actions.ts`, `lib/sql/` | `CAPABILITY-MAP.md` |
| profile | `lib/actions/profile-actions.ts`, `app/profile` | `docs/specs/profile-dashboard.md` |
| rewards | `lib/actions/reward-actions.ts`, `contracts/` | `docs/specs/rewards-no-wallet-payee.md` |

Entry points: `app/page.tsx` (play), `app/profile/page.tsx` (creator),
`contracts/contracts/` (on-chain), `lib/schema.sql` (tables).
Full capability map: `CAPABILITY-MAP.md`. Intent log: `docs/intent/`.

Regen index: `uv run --project coco cocoindex update coco/main.py`
(0.4s incremental, ~8s cold). Pipeline: `coco/main.py`. State DB
`coco/cocoindex.db` is git-ignored; `coco/out/` is checked in.
No embeddings, no service — add vectors only when keyword snippets fail.
