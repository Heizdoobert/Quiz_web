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

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  ...(isPreview ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  output: 'standalone',
  experimental: { turbo: false, optimizePackageImports: ['lucide-react'] },
  async headers() { return [{ source: '/:path*', headers: securityHeaders }]; },
  transpilePackages: ['@supabase/phoenix', '@supabase/realtime-js'],
  webpack(config, { isServer }) {
    // Alias to the ESM build of @supabase/phoenix for Turbopack/Webpack
    config.resolve.alias['@supabase/phoenix'] = resolve(__dirname, 'node_modules/@supabase/phoenix/priv/static/phoenix.cjs.js');
    return config;
  },
};

export default withTrackingAnalytics(nextConfig);
