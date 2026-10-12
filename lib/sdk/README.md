# lib/sdk

The only place that imports a third-party service SDK. The rest of the app imports from here, so
swapping or mocking a vendor touches one file.

| File | SDK | Used by |
|---|---|---|
| `supabase.ts` | `@supabase/supabase-js`, public key (RLS applies) | `lib/db` only |
| `supabase-admin.ts` | same, secret key (bypasses RLS) | `lib/db` only |
| `gemini.ts` | `@google/genai` | server actions and services |
| `sentry.ts` | none: no-op default, replaced by `sdk/tracking-analytics` at build time when that folder exists | error boundaries, `instrumentation*.ts` |
| `posthog.ts` | none: no-op default, replaced by `sdk/tracking-analytics` at build time when that folder exists | `components/providers/PostHogProvider.tsx` |

`lib/sdk.ts` is separate: it builds the client for Quick Quiz's own `@heizdoobert/quickquiz-sdk` (`getSdk`) and is not a vendor wrapper.

## Add an SDK

1. `npm install <package>`.
2. Create `lib/sdk/<name>.ts`. Read its keys from `process.env` here, and export the smallest surface the app needs, not the whole package.
3. Add the package to the first `group` in `eslint.config.mjs` (the `no-restricted-imports` block) so nothing outside `lib/sdk` imports it.
4. Add a row to the table above.
5. In tests, mock `@/lib/sdk/<name>` or the package itself.

Sentry and PostHog are optional. See `sdk/tracking-analytics/README.md`.
