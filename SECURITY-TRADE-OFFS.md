# Security Trade-Offs: Profile Dashboard

> [!CAUTION]
> This document records **known, accepted** security limitations in the profile
> dashboard. They exist because of architectural constraints (Web3 wallet auth,
> permissive RLS) that cannot be fixed without a significant refactor.

## 1. No Server-Side Identity Verification (IDOR Risk)

**Issue:** Server Actions accept `walletAddress` from the client. There is no
cryptographic proof (e.g., SIWE — Sign-In With Ethereum) that the caller
actually owns that address. An attacker can call `getUserQuizzes("0xVictim")`
directly.

**Mitigation applied:** Ethereum address format validation prevents injection
attacks, but does NOT prevent IDOR.

**Proper fix:** Implement SIWE (Sign-In With Ethereum) to create a server-side
session that cryptographically proves wallet ownership. Then validate the session
token in every Server Action instead of trusting client-provided addresses.

**Severity:** HIGH — but blast radius is limited to quiz data (no financial
assets or PII beyond wallet addresses).

## 2. Permissive RLS Is Bypassable

**Issue:** The database uses `USING (true)` RLS policies. The Supabase anon key
is exposed to the frontend (standard architecture). An attacker who knows the
Supabase URL and anon key can hit the PostgREST API directly, bypassing all
Server Action security.

**Mitigation applied:** None at the application level. This is a database-layer
problem.

**Proper fix:** Implement row-level security policies that filter by
`auth.uid()` after integrating SIWE → Supabase custom JWT authentication.

**Severity:** HIGH — same blast radius as #1.

## When to Fix

These trade-offs should be addressed when:

- The application handles financial transactions or sensitive PII
- The user base grows beyond trusted early adopters
- A security audit is requested

Both fixes require the same prerequisite: **SIWE integration** to establish
server-side identity.
