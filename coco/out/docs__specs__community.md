# docs/specs/community.md
lines:111 exports:rateQuestion,addComment,deleteComment,getQuestionDiscussion,getSuggestionsForAuthor,resolveSuggestion,rateQuestion
---
# Spec: Question Ratings, Comments and Suggestions

Module: `community` (consumes `identity`, `trivia`; provides to `profile`) — see `CAPABILITY-MAP.md`.
Status: Approved 2026-09-28. Depends on `docs/specs/identity-accounts.md` (`users.id`, `getSessionAccount`) and `docs/specs/trivia-guest-access.md` (public-question rule).

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
