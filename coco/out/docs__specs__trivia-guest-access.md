# docs/specs/trivia-guest-access.md
lines:89 exports:getTopics,getPublicQuestion
---
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
