# Capability Map: Quick Quiz Web3 Trivia

| Module id | Responsibility | Depends on |
|---|---|---|
| identity | SIWE auth, sessions, wallet (`lib/wallet-session.ts`, `lib/actions/auth-actions.ts`) | — |
| trivia | Quiz engine, questions, play (`lib/actions/question-actions.ts`, `quiz-actions.ts`, `app/page.tsx`) | identity |
| lists | Peer-reviewed lists, review, contest hosting (`lib/actions/question-list-actions.ts`, `app/my-lists`, `app/review`, `app/contest`) | identity, trivia |
| rankings | Global/group leaderboards, stats SQL (`lib/actions/leaderboard-actions.ts`, `group-actions.ts`, `lib/sql/stats-functions.sql`) | identity, trivia |
| profile | Creator dashboard, export (`lib/actions/profile-actions.ts`, `app/profile`) | identity, trivia |
| rewards | $QUIZ ERC-20, Badge NFT, ContestEscrow, EIP-712 vouchers (`lib/actions/reward-actions.ts`, `contracts/`) | identity, lists |

Build order: identity → trivia → lists, rankings, profile → rewards

Contracts at boundaries (provider owns contract):
- `lists` provides `question_lists(id)` UUID → `bytes32 contestId = keccak256(bytes(listId))` to `rewards`.
- `identity` provides `getSessionWallet()` to `lists`, `rankings`, `profile`, `rewards`.
- `trivia` provides `quiz_results` rows to `rankings`, `profile`.

Existing specs traced to modules:
- `docs/specs/profile-dashboard.md` → `profile`
- `docs/specs/contest-escrow.md` → `rewards` (consumes `lists` interface above)
