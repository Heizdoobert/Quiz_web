# next.config.mjs
lines:87 exports:default
---
import { existsSync } from 'node:fs';

// sdk/tracking-analytics is optional. Without it the app keeps the no-op seams in lib/sdk/.
const trackingAnalytics = new URL('./sdk/tracking-analytics/next.mjs', import.meta.url);
const withTrackingAnalytics = existsSync(trackingAnalytics)
  ? (await import(trackingAnalytics.href)).withTrackingAnalytics
  : (config) => config;

const isPreview = process.env.VERCEL_ENV === 'preview' || process.env.NEXT_PUBLIC_APP_ENV === 'preview';

// Report-only for now: a tuned policy ships enforcing once preview shows no first-party violations
// (docs/decisions/009-report-only-content-security-policy.md). Violations are POSTed to /api/csp-report and land in the server log.
// script-src needs 'unsafe-inline' for Next's inline hydration scripts until nonces are rolled out,
// so the policy mainly constrains connect-src, frame-src, object-src, base-uri and form-action.
function originOf(url) {
  try {
    return new URL(url || '').origin;
  } catch {
    return null;
  }
}

function supabaseOrigins() {
  try {
    const { origin, host } = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    return [origin, `wss://${host}`];
  } catch {
    return [];
  }
}

// Same variables sdk/tracking-analytics reads, so the policy follows what the client really calls.
// A Sentry DSN is https://<key>@<host>/<project>; its origin is the ingest host.
function telemetryOrigins() {
  const sentry = originOf(process.env.NEXT_PUBLIC_SENTRY_DSN);
  const posthog = process.env.NEXT_PUBLIC_POSTHOG_KEY
    ? originOf(process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com')
    : null;
  return [sentry, posthog].filter(Boolean);
}
