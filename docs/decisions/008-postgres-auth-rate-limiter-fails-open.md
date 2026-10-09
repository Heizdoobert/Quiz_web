# ADR-008: Postgres Rate Limiter That Fails Open

## Status
Accepted

## Date
2026-10-09 (written from the code on this date)

## Context
Email-code, username and answer submission endpoints needed attempt limits that hold across serverless instances. Memory counters reset per instance and a Redis or edge limiter is a new service to run.

## Decision
Count attempts in Postgres. `rate_limit_hit(p_key, p_max, p_window_seconds)` (`supabase/migrations/17-auth-rate-limit.sql`) takes a per-key advisory lock, drops rows older than a day, and either records one attempt and returns true, or returns false and records nothing, so a blocked caller cannot extend its own lockout. The `auth_attempts` table has RLS on and no policies, so only the service role reaches it. `lib/services/rate-limit.ts` exposes `allowAttempt(scope, identifier, max, windowSeconds)` and `allowAttemptFromIp(scope, max, windowSeconds)`; the identifier is SHA-256 hashed so addresses and usernames are not stored.

The limiter **fails open**: if the counter is unreachable, or the migration is not applied, the attempt is allowed and `rate_limit_check_failed` is logged.

## Consequences
- **Positive**: one mechanism across instances, no new service, no raw identifiers at rest.
- **Trade-off**: a counter outage, or a missing migration, removes the limit silently apart from the log line. Supabase Auth's own limits still apply behind it. Refusing every sign-in during a counter outage was judged worse than a missed limit.
- **Residual**: the IP is the first hop of `x-forwarded-for`, which is only as trustworthy as the host's proxy. Shared networks share a budget, so the per-IP limits are generous (for example 120 answers per hour).
- **Revisit**: add a fail-closed mode if the trade flips, or move to an edge limiter if traffic makes per-call Postgres writes costly.
