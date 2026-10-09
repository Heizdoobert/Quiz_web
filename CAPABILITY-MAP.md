# Capability Map: Quick Quiz Web3 Trivia

| Module id | Responsibility | Depends on |
|---|---|---|
| identity | Accounts (email code or wallet sign-in), optional wallet link, session (`lib/services/session.ts`, `lib/actions/auth-actions.ts`, `lib/services/users.ts`) | — |
| trivia | Quiz engine, questions, play, create (signed-in only), guest read-only (`lib/actions/question-actions.ts`, `lib/actions/quiz-actions.ts`, `app/page.tsx`) | identity |
| discovery | Question search, topic list newest first, topic browse (`lib/actions/discovery-actions.ts`, `app/search`, `app/topics`) | trivia |
| community | Question ratings, comments, suggestions to authors (`lib/actions/community-actions.ts`, `components/community/`) | identity, trivia |
| lists | Peer-reviewed lists, review, contest hosting (`lib/actions/question-list-actions.ts`, `app/my-lists`, `app/review`, `app/contest`) | identity, trivia |
| rankings | Global/group leaderboards, stats SQL (`lib/actions/leaderboard-actions.ts`, `lib/actions/group-actions.ts`, `supabase/migrations/stats-functions.sql`) | identity, trivia |
| profile | Creator dashboard, export, suggestions received (`lib/actions/profile-actions.ts`, `app/profile`) | identity, trivia, community |
| rewards | $QUIZ ERC-20, Badge NFT, ContestEscrow, EIP-712 vouchers, payee rule for accounts without a wallet (`lib/actions/reward-actions.ts`, `contracts/`) | identity, lists |

Build order: identity → trivia → discovery, community, lists, rankings → profile → rewards

Contracts at boundaries (provider owns contract):
- `identity` provides `getSessionAccount(): Promise<{ id: string; wallet: string | null } | null>` to every other module (replaces `getSessionWallet()`); `users.id` (UUID) is the key other tables reference. See `docs/specs/identity-accounts.md`.
- `trivia` provides `quiz_results` rows (`user_id`, `question_id`, `is_correct`, `answered_at`) to `rankings`, `profile`, `community`, `rewards`, and the rule "a question is public when `status = 'verified'` and `list_id IS NULL`" to `discovery` and `community`; `getTopics()` and `getPublicQuestion(id)` to `discovery`. See `docs/specs/trivia-guest-access.md`.
- `community` provides `getSuggestionsForAuthor(accountId)` to `profile`.
- `lists` provides `question_lists(id)` UUID → `bytes32 contestId = keccak256(bytes(listId))` to `rewards`.

Existing specs traced to modules:
- `docs/specs/identity-accounts.md` → `identity`
- `docs/specs/answer-persistence.md` → `trivia` (consumes `identity`)
- `docs/specs/trivia-guest-access.md` → `trivia`
- `docs/specs/discovery.md` → `discovery`
- `docs/specs/community.md` → `community` (also adds the suggestions view to `profile`)
- `docs/specs/profile-dashboard.md` → `profile`
- `docs/specs/contest-escrow.md` → `rewards` (consumes `lists` interface above)
- `docs/specs/rewards-no-wallet-payee.md` → `rewards`
- `docs/specs/project-improvements.md` → cross-cutting (`rewards`, `lists`, CI, docs)
