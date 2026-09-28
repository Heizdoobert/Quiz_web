# ADR-002: Dual-Key Supabase Architecture & Row-Level Security Lockdown

## Status
Accepted

## Date
2026-09-28

## Context
In early versions of Quick Quiz, all frontend queries accessed Supabase directly via the public anonymous key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) with permissive PostgreSQL Row-Level Security (`USING (true)`).

This architecture exposed critical vulnerabilities:
1. **Trivia Answer Leaks**: Any player inspecting network requests or querying the public PostgREST API (`/rest/v1/questions`) could retrieve the full table including `correct_index` and `explanation`, enabling 100% cheat rates.
2. **Direct Result Injection**: Attackers with the public anon key could post synthetic entries directly to `quiz_results` or modify `reward_claims`.
3. **Database Schema Scraping**: Error responses from failed queries leaked internal Postgres relation and column structures to the browser.

## Decision
We adopted a **Dual-Key Architecture** where:
1. **Public Anon Client (`lib/supabase.ts`)**:
   - Strictly restricted by PostgreSQL RLS to safe public reads only.
   - All public write permissions (`INSERT`, `UPDATE`, `DELETE`) on core tables (`questions`, `quiz_results`, `reward_claims`, `question_disputes`, `question_lists`, `list_entries`) were permanently revoked (`lib/sql/lock-down-public-writes.sql`).
   - Sensitive columns (`correct_index`, `explanation`) are blocked from public read or projected via a safe view (`client_questions`).
2. **Privileged Server Admin Client (`lib/supabase-admin.ts`)**:
   - Initialized exclusively in server-only modules using `SUPABASE_SECRET_KEY`.
   - Never exposed or bundled to client code (guaranteed by Next.js Server Actions and build checks).
   - Responsible for verifying answers, recording gameplay results, and checking dispute thresholds.
3. **Error Masking at Action Boundaries**:
   - Raw database errors are logged internally via `console.error` and converted to opaque, predictable error codes (`FETCH_FAILED`, `EXPORT_FAILED`, `RATE_LIMITED`).

## Alternatives Considered

### Complex PostgreSQL RLS Policies with Anon Tokens
- **Pros**: Kept all database logic inside SQL.
- **Cons**: Without Supabase Auth JWTs, RLS cannot securely identify which client owns which wallet without server-side verification, making SQL-only authorization impossible without SIWE custom claims.
- **Decision**: Server Action mediation is simpler, safer, and keeps business logic testable in TypeScript.

### Dedicated Express/Fastify Backend Server
- **Pros**: Traditional separation between frontend and backend.
- **Cons**: Introduces extra hosting overhead, cold start latency, and dual repository/deployment maintenance.
- **Decision**: Next.js App Router Server Actions provide the exact server-side isolation needed without the overhead of an external API service.

## Consequences
- **Positive**: Anti-cheat guarantees: players can never inspect `correct_index` or `explanation` before answering.
- **Positive**: Direct database manipulation using the public anon key is completely blocked.
- **Negative / Operational Requirement**: `SUPABASE_SECRET_KEY` must be configured across all production hosting providers (e.g. Vercel environment variables).
