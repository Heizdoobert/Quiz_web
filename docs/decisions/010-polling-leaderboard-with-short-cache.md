# ADR-010: Leaderboard Updates by Polling and a Short Server Cache

## Status
Accepted. Supersedes the Supabase Realtime plan in `SPEC-realtime-leaderboard.md`, which was not built.

## Date
2026-10-09 (written from the code on this date)

## Context
The leaderboard should feel live, and `get_global_leaderboard` aggregates all of `quiz_results` on every call. A Realtime subscription per viewer would add a persistent connection and a refetch on every insert from every player.

## Decision
While the leaderboard panel is visible, `hooks/quiz/use-quiz-logic.ts` refetches it every 15 seconds (`refetchInterval`); it does not poll while hidden. On the server, `getGlobalLeaderboard` (`lib/actions/leaderboard-actions.ts`) wraps the RPC in `unstable_cache` with `revalidate: 15`, so the aggregate runs at most about once per 15 seconds per instance and page window. A failed read throws inside the cache so an error is never cached as an empty board.

## Consequences
- **Positive**: bounded database work, no connection per viewer, simple to reason about.
- **Trade-off**: a board can be up to about 15 seconds old, so a player's own new score may lag after answering. The same cached read feeds the badge-eligibility check in `getClaimableRewards`, which only affects what is offered, not what a voucher allows.
- **Revisit**: a materialized view or Realtime if the table grows enough that one aggregate per 15 seconds is still too costly.
