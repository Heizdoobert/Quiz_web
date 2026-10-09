# Spec: Sample Question Removal, Signed-In Creation, Read-Only Guests

Module: `trivia` (consumes `identity`) — see `CAPABILITY-MAP.md`.
Status: Approved 2026-09-28. Depends on `docs/specs/identity-accounts.md` (`getSessionAccount`).

## Objective
- The 14 built-in sample questions stop appearing. Only questions that players added are played, searched and listed.
- Only signed-in players (email or wallet account) see and use "Add Custom Question".
- Guests can look but not change anything: they can browse, search, see topics and play (the result is shown, never saved), but cannot create, dispute, rate, comment, suggest, join contests, or create groups or lists.
- Topics come from the questions players added, not a hardcoded list.

Out of scope: editing or deleting global questions (not possible today either), moderation tools.

## Tech Stack
Next.js 16.3 server actions, Supabase (secret key for writes), Vitest 5 + Testing Library.

## Commands
- Fast gate: `npm run check:fast`
- Task gate: `npm run check:task`
- Focused test: `npx vitest run tests/trivia-guest-access.test.tsx`
- Build: `npm run build`

## Design
**One rule for "public question"** — `status = 'verified' AND list_id IS NULL`. Today `fetchRandomQuestion` (`lib/actions/question-actions.ts:72-110`) only excludes `quarantined` and `pending`, so a `rejected` question can still be served; `submitAnswer` then refuses to save the answer. All reads of global questions move to this rule: play, `getPublicQuestion`, `getTopics`, search, and community.

**Sample questions.**
- Delete the seed `INSERT INTO questions` block from `lib/schema.sql:182-282`, so new databases start empty.
- New script `lib/sql/retire-sample-questions.sql` sets `status = 'rejected'` on the 14 seed rows, matched by exact prompt and `created_by IS NULL`. It does not delete them: `quiz_results.question_id` is `ON DELETE CASCADE`, so deleting would erase players' answers and lower their scores.

**Topics** (`trivia` provides these to `discovery` and to `CategoryBar`):
```ts
export async function getTopics(): Promise<Array<{ name: string; questionCount: number; latestAt: string }>>; // latestAt desc
export async function getPublicQuestion(id: string): Promise<ClientQuestion | null>; // public rule; never correct_index/explanation
```
- A topic is `questions.category`, grouped case-insensitively after trimming; the name shown is the most recent spelling.
- `createQuestion` trims the category, collapses inner spaces, and requires 2-40 characters.
- `CategoryBar` shows "All" plus `getTopics()` instead of the hardcoded list in `components/quiz/CategoryBar.tsx:13-38`.
- Backed by a SQL function `get_topics()` (SECURITY DEFINER, public questions only).

**Signed-in creation.**
- `QuizLayout` renders `QuestionForm` only when there is a session account.
- Guests see nothing in its place; the empty state says "No questions yet. Sign in to add the first one." with the sign-in button.
- `createQuestion` keeps its server check, moved to `getSessionAccount()`, and its 5-per-day cap.

**Read-only guests.** Every write control is hidden for guests: dispute, rate, comment, suggest, join contest, create group, create list, claim. Where hiding would confuse (the back of the card), it is replaced by one "Sign in to rate and comment" link. Server actions already reject guests; that stays the real guard.

## Project Structure
- `lib/actions/question-actions.ts` — public-question rule, `getTopics`, `getPublicQuestion`, category normalization
- `lib/sql/topics.sql` — `get_topics()`
- `lib/sql/retire-sample-questions.sql`
- `lib/schema.sql` — seed block removed
- `components/quiz/QuizLayout.tsx`, `QuestionForm.tsx`, `QuizCard.tsx`, `CategoryBar.tsx`, `AnswerBack.tsx`
- `tests/trivia-guest-access.test.tsx`

## Code Style
UI decides visibility from the client session. The server decides permission:
```tsx
{account ? <QuestionForm onCreated={handleCreated} /> : null}
```
```ts
const account = await getSessionAccount();
if (!account) return { success: false, code: 'UNAUTHORIZED' as const };
```

## Testing Strategy
- Vitest:
  - `fetchRandomQuestion` never returns `rejected`, `pending`, `quarantined` or list questions
  - `getTopics` groups "DeFi" and " defi " together and orders by newest question
  - `createQuestion` rejects a guest and normalizes the category
- Testing Library: a guest sees no "Add Custom Question", no dispute, rate or comment controls; a signed-in player sees them.
- Manual: after running the retire script on a copy of the database, none of the 14 sample prompts are served, and existing players' scores are unchanged.

## Boundaries
- **Always:** apply the public-question rule in SQL or queries, not only in the UI; keep server-side session checks on every write.
- **Ask first:** running `retire-sample-questions.sql` on a shared database; deleting any question rows; moving the create button to a different place than it is now.
- **Never:** delete sample questions that players have answered; rely on hidden buttons as the only protection; return `correct_index` or `explanation` from `getPublicQuestion`.

## Success Criteria
1. After the retire script runs, none of the 14 sample prompts appear in play, search or topics, and no player's score changes.
2. A fresh database built from `lib/schema.sql` has zero questions.
3. A guest never sees "Add Custom Question" or any rate, comment, suggest, dispute, contest-join, group or list-create control.
4. A signed-in player (email or wallet) can add a question as today, capped at 5 per day.
5. `CategoryBar` lists the topics that exist in the database, and no hardcoded ones.
6. Play serves only public questions; answering a served question as a signed-in player always returns `recorded: true` or a real reason.
7. `npm run check:task` and `npm run build` pass; changed-line coverage ≥ 80%.

## Decisions
- 2026-09-28: guests keep playing (the result is shown, never saved).
- The create button stays where it is now (below the quiz), shown only to signed-in players. Moving it into the header is a later, separate change if wanted.
- 2026-10-09: guests still see the answer after each play, but `submitAnswer` is capped at 120 answers per IP per hour (`rate_limit_hit`, scope `submit-answer-ip`) and returns `notSavedReason: 'rate-limited'` with nothing revealed once over. This slows a script reading the whole question bank; it does not stop one using many addresses. The alternative, requiring sign-in to see an answer, was not chosen because it would end guest play.
