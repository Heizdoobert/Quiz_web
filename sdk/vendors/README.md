# sdk/vendors

Vendor SDK clients and wrappers (Supabase, Gemini, Sentry, PostHog, QuickQuizClient).

| File | SDK | Used by |
|---|---|---|
| `supabase.ts` | `@supabase/supabase-js`, public key (RLS applies) | `lib/db` only |
| `supabase-admin.ts` | same, secret key (bypasses RLS) | `lib/db` only |
| `gemini.ts` | `@google/genai` | server actions and services |
| `sentry.ts` | Sentry integration (no-op default) | error boundaries, instrumentation |
| `posthog.ts` | PostHog provider integration (no-op default) | `PostHogProvider` |
| `client.ts` | `@heizdoobert/quickquiz-sdk` client gateway (`getSdk`) | application callers |
