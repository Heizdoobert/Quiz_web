# next.config.mjs
lines:68 exports:default
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
function supabaseOrigins() {
  try {
    const { origin, host } = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    return [origin, `wss://${host}`];
  } catch {
    return [];
  }
}

const isDev = process.env.NODE_ENV !== 'production';

const cspReportOnly = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    ...supabaseOrigins(),
    ...(isDev ? ['ws://localhost:*'] : []),
  ].join(' '),
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
