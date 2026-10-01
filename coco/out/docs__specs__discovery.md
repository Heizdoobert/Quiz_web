# docs/specs/discovery.md
lines:103 exports:searchQuestions,getTopicQuestions,searchQuestions
---
# Spec: Question Search and Topic Browse

Module: `discovery` (consumes `trivia`) — see `CAPABILITY-MAP.md`.
Status: Approved 2026-09-28. Depends on `docs/specs/trivia-guest-access.md` (`getTopics`, `getPublicQuestion`, public-question rule).

## Objective
Anyone, signed in or not, can find questions the way they would search Google:
- by a word, part of a word, or a topic name, and
- with small typos still matching.

Anyone can also see the topics other players have added, newest first, and the questions in each topic, newest first, then play any of them.

Out of scope: rating-based ordering (see Open Questions), saved searches, search over contest questions or comments.

## Tech Stack
Next.js 16.3 (server components for pages, server actions for data), Supabase Postgres with the `pg_trgm` extension (built into Postgres, enabled per project), Vitest 5.

## Commands
- Fast gate: `npm run check:fast`
- Task gate: `npm run check:task`
- Focused test: `npx vitest run tests/discovery.test.ts`
- Build: `npm run build`

## Design
**Search engine.**
- Postgres `pg_trgm`, not full-text search: it matches parts of words ("block" finds "blockchain") and near-misses ("etherum"), and it works for any language.
- New script `lib/sql/search.sql`:
  - `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
  - GIN trigram indexes on `lower(prompt)` and `lower(category)`
  - `search_questions(p_query TEXT, p_limit INT, p_offset INT)`, SECURITY DEFINER, public questions only
- `search_questions` returns `id, prompt, category, author_name, created_at, score`:
  - It escapes `%` and `_` in the query.
  - It matches `ILIKE '%q%'` on prompt or category, or `word_similarity(q, prompt) > 0.3`.
  - It orders by `score` (the greatest of prompt and category similarity) desc, then `created_at` desc.
- It never returns `correct_index`, `explanation`, `options` or contest questions.

**Server actions** (`lib/actions/discovery-actions.ts`):
```ts
export async function searchQuestions(query: string, page = 1): Promise<{ results: SearchResult[]; hasMore: boolean }>;
export async function getTopicQuestions(topic: string, page = 1): Promise<{ results: SearchResult[]; hasMore: boolean }>; // created_at desc
