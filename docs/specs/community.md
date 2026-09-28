# Spec: Question Ratings, Comments and Suggestions

Module: `community` (consumes `identity`, `trivia`; provides to `profile`) — see `CAPABILITY-MAP.md`.
Status: Draft, awaiting approval. Depends on `docs/specs/identity-accounts.md` (`users.id`, `getSessionAccount`) and `docs/specs/trivia-guest-access.md` (public-question rule).

## Objective
After answering a question, a signed-in player can:
- **rate** it from 1 to 5 stars,
- **comment** on it, where every player who answers can read the comment, and
- **send a suggestion** to its author (e.g. "option C is also correct", "typo in the prompt"), which only the author and the sender see.

Authors see the suggestions for their questions on `/profile` and can mark each one done.

Guests can read ratings and comments on the back of the card after answering, and cannot write anything.

Out of scope: replies and threads, likes on comments, moderation queue, reporting, notifications or email, editing a comment.

## Tech Stack
Next.js 16.3 server actions, Supabase Postgres (secret-key writes, no public policies on the new tables), React 19.2, Vitest 5 + Testing Library.

## Commands
- Fast gate: `npm run check:fast`
- Task gate: `npm run check:task`
- Focused test: `npx vitest run tests/community.test.ts`
- Build: `npm run build`

## Design
**Who may write** (all checked on the server):
- The player is signed in (`getSessionAccount()`).
- The question is public (`status = 'verified' AND list_id IS NULL`). Contest questions are excluded because comments would reveal their answers during the contest.
- The player has a recorded answer to that question in `quiz_results`. This is the same gate `disputeQuestion` uses, and it keeps ratings and comments to people who actually played the question.
- The player is not the question's author, for ratings and suggestions. Authors may comment.
- At most 20 comments plus suggestions per account per day.

**Schema** (new script `lib/sql/community.sql`, RLS on, no public policies; all access through server actions):
- `question_ratings(question_id UUID REFERENCES questions ON DELETE CASCADE, user_id UUID REFERENCES users(id) ON DELETE CASCADE, rating SMALLINT CHECK (rating BETWEEN 1 AND 5), updated_at TIMESTAMPTZ, PRIMARY KEY (question_id, user_id))`. Re-rating replaces the old value.
- `question_comments(id UUID PK, question_id UUID REFERENCES questions ON DELETE CASCADE, user_id UUID REFERENCES users(id) ON DELETE CASCADE, kind TEXT CHECK (kind IN ('comment','suggestion')), body TEXT CHECK (char_length(body) BETWEEN 1 AND 500), created_at TIMESTAMPTZ DEFAULT now(), resolved_at TIMESTAMPTZ)`, with an index on `(question_id, created_at DESC)`.
- `get_rating_summary(p_question_id)` returns `{ average NUMERIC(2,1), count INT }`.

**Server actions** (`lib/actions/community-actions.ts`):
```ts
export async function rateQuestion(questionId: string, rating: number): Promise<CommunityResult>;
export async function addComment(questionId: string, body: string, kind: 'comment' | 'suggestion'): Promise<CommunityResult>;
export async function deleteComment(commentId: string): Promise<CommunityResult>; // own comments only
export async function getQuestionDiscussion(questionId: string, page = 1): Promise<{ rating: RatingSummary; myRating: number | null; comments: CommentView[]; hasMore: boolean }>;
export async function getSuggestionsForAuthor(accountId: string): Promise<SuggestionView[]>; // provided to profile; must equal the session account
export async function resolveSuggestion(commentId: string): Promise<CommunityResult>; // question author only
type CommunityResult = { ok: true } | { ok: false; code: 'UNAUTHORIZED' | 'NOT_ANSWERED' | 'NOT_ALLOWED' | 'INVALID' | 'RATE_LIMITED' | 'FAILED' };
```
- `getQuestionDiscussion` returns comments of kind `comment` newest first, 20 per page, with the author's display name.
- Suggestions come back only to their sender or to the question's author.

**UI.**
- On `AnswerBack` below the explanation:
  - a star row showing the average and count, which the player can tap to rate
  - the comment list with a text box (500 max, counter)
  - a "Suggest a fix to the author" link that opens a short form
- Guests see the average and the comments, with "Sign in to rate and comment" in place of the inputs.
- `/profile` gets a "Suggestions for your questions" section: the question prompt, the suggestion, who sent it, when, and a "Mark done" button.
- Text is shown as plain text: React escapes it; no HTML, no markdown, no automatic links.

## Project Structure
- `lib/actions/community-actions.ts`
- `lib/sql/community.sql`
- `components/community/RatingStars.tsx`, `CommentList.tsx`, `SuggestionForm.tsx`, `AuthorSuggestions.tsx`
- `components/quiz/AnswerBack.tsx`, `app/profile/page.tsx` — mount points
- `tests/community.test.ts`, `tests/community-ui.test.tsx`

## Code Style
Each write checks permission in the same order and returns a fixed code:
```ts
export async function rateQuestion(questionId: string, rating: number): Promise<CommunityResult> {
  const account = await getSessionAccount();
  if (!account) return { ok: false, code: 'UNAUTHORIZED' };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, code: 'INVALID' };
  const gate = await checkCanDiscuss(account.id, questionId, { allowAuthor: false });
  if (!gate.ok) return gate;
  const { error } = await supabaseAdmin.from('question_ratings')
    .upsert({ question_id: questionId, user_id: account.id, rating, updated_at: new Date().toISOString() });
  if (error) { console.error('rateQuestion error:', error); return { ok: false, code: 'FAILED' }; }
  return { ok: true };
}
```

## Testing Strategy
- Vitest with `supabaseAdmin` and the session mocked, one test per gate: guest, not answered, contest question, author rating own question, rating 0, 6 and 2.5, empty and 501-character body, 21st comment of the day.
- Also:
  - a suggestion is not returned in `getQuestionDiscussion`
  - `getSuggestionsForAuthor` returns `[]` for another account's id
  - `deleteComment` refuses someone else's comment
  - `resolveSuggestion` refuses anyone but the author
- Testing Library: guests see the average and comments but no inputs; `<script>` in a comment renders as text.

## Boundaries
- **Always:** run every gate on the server; keep suggestions private to the sender and the author; show user text as plain text.
- **Ask first:** running `community.sql` on a shared database; adding moderation (reports, hide, ban) or a profanity filter; allowing comments on contest questions.
- **Never:** add public RLS policies to the new tables; render user text as HTML; let a player rate or suggest on their own question; show comments in the UI anywhere but the back of the card (not in search, topics, or the front of the card).

Known trade-off: `getQuestionDiscussion` cannot prove that a guest answered, because guest answers are not recorded, so anyone can read a public question's comments. This adds no new leak: a guest can already learn any public question's answer by submitting a guess (`submitAnswer` reveals `correctIndex`).

## Success Criteria
1. A signed-in player who answered a public question can rate it 1-5, change the rating, and see the average and count update.
2. The same player can post a comment of up to 500 characters that other players see on the back of that card, newest first, and can delete their own.
3. A player can send a suggestion that only they and the question's author can see; the author sees it on `/profile` and can mark it done.
4. Guests, players who haven't answered, and players on contest questions cannot rate, comment or suggest; each gets its fixed code.
5. The 21st comment or suggestion in a day is refused with `RATE_LIMITED`.
6. `npm run check:task` and `npm run build` pass; changed-line coverage ≥ 80%.

## Open Questions
- Moderation: who removes abusive comments? The minimum would be the question author hiding comments on their own question.
- Should a question's average rating affect how often it is served in play or how it ranks in search?
