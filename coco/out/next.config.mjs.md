# next.config.mjs
lines:67 exports:default
---
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Optional tracking analytics module
const trackingAnalytics = new URL('./sdk/tracking-analytics/next.mjs', import.meta.url);
const withTrackingAnalytics = existsSync(trackingAnalytics)
  ? (await import(trackingAnalytics.href)).withTrackingAnalytics
  : (config) => config;

const isPreview = process.env.VERCEL_ENV === 'preview' || process.env.NEXT_PUBLIC_APP_ENV === 'preview';

function originOf(url) {
  try { return new URL(url || '').origin; } catch { return null; }
}
function supabaseOrigins() {
  try { const { origin, host } = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || ''); return [origin, `wss://${host}`]; } catch { return []; }
}
function telemetryOrigins() {
  const sentry = originOf(process.env.NEXT_PUBLIC_SENTRY_DSN);
  const posthog = process.env.NEXT_PUBLIC_POSTHOG_KEY ? originOf(process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com') : null;
  return [sentry, posthog].filter(Boolean);
}

const isDev = process.env.NODE_ENV !== 'production';
const cspReportOnly = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  ["connect-src 'self'", ...supabaseOrigins(), ...telemetryOrigins(), ...(isDev ? ['ws://localhost:*'] : [])].join(' '),
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'report-uri /api/csp-report',
].join('; ');
