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
```
- The query is trimmed; under 2 or over 100 characters returns no results.
- 20 results per page.
- No session is needed; these are public reads.

**Pages.**
- A search box in the header goes to `/search?q=…`.
- `/search` (server-rendered, `noindex`) shows result cards with the prompt, the topic, the author and "added 3 days ago". "Play" opens `/q/[id]`.
- `/topics` lists every topic from `getTopics()`, newest first: the name, the number of questions, and when the last one was added.
- `/topics/[topic]` lists that topic's questions newest first, with a "Play this topic" button that starts the quiz filtered to the topic.
- `/q/[id]` plays one question via `getPublicQuestion(id)` and the existing `QuizCard`. Answering uses `submitAnswer` as usual.
- Empty states: "No questions match "q"" with a link to `/topics`; "No topics yet".

## Project Structure
- `lib/actions/discovery-actions.ts`
- `lib/sql/search.sql`
- `app/search/page.tsx`, `app/topics/page.tsx`, `app/topics/[topic]/page.tsx`, `app/q/[id]/page.tsx`
- `components/discovery/SearchBox.tsx`, `SearchResultList.tsx`, `TopicList.tsx`
- `tests/discovery.test.ts`

## Code Style
Search is one database call with the input bounded before it leaves the server:
```ts
export async function searchQuestions(query: string, page = 1) {
  const q = query.trim();
  if (q.length < 2 || q.length > 100) return { results: [], hasMore: false };
  const { data, error } = await supabase.rpc('search_questions', {
    p_query: q, p_limit: PAGE_SIZE + 1, p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error || !data) { console.error('searchQuestions error:', error); return { results: [], hasMore: false }; }
  return { results: data.slice(0, PAGE_SIZE).map(toSearchResult), hasMore: data.length > PAGE_SIZE };
}
```

## Testing Strategy
- Vitest with `supabase.rpc` mocked:
  - query bounds (1 and 101 characters return nothing, with no database call)
  - paging and `hasMore`
  - mapping never includes answer fields
- SQL, checked manually on a copy of the database:
  - "block" finds "blockchain"
  - "etherum" finds "Ethereum"
  - `%` and `_` are matched literally
  - rejected, pending and contest questions never appear
  - `EXPLAIN ANALYZE` shows the trigram index used once there are more than 1,000 questions
- Manual: search, topics and one topic page work signed out.

## Boundaries
- **Always:** filter to public questions inside the SQL function; cap query length and page size on the server; render results as plain text.
- **Ask first:** running `search.sql` on a shared database; adding a hosted search service (Algolia, Meilisearch) or any dependency.
- **Never:** build SQL by string concatenation; return answer fields or options in search results; show comments in search results (they can reveal answers).

## Success Criteria
1. Signed out, typing a word, part of a word, a topic name, or a word with one typo returns matching public questions, best match first.
2. `/topics` shows every topic players added, the most recently added topic first, each with its question count.
3. `/topics/[topic]` lists that topic's questions newest first and can start a quiz on that topic.
4. No search, topic or `/q/[id]` response contains `correct_index`, `explanation`, a rejected, pending or quarantined question, or a contest question.
5. With 10,000 questions, a search returns in under 300 ms at the database (`EXPLAIN ANALYZE`).
6. `npm run check:task` and `npm run build` pass; changed-line coverage ≥ 80%.

## Open Questions
- Show each result's rating and allow sorting by it? That makes `discovery` depend on `community`.
- Should `/topics/[topic]` pages be indexed by search engines? That is good for SEO, but every user-typed topic name becomes a public URL.
