# next.config.mjs
lines:126 exports:default
---
import { withSentryConfig } from '@sentry/nextjs/config';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 24 hours
        },
      },
    },
    {
      urlPattern: /\.(?:js|css|webp|png|svg|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
  ],
});

const isPreview = process.env.VERCEL_ENV === 'preview' || process.env.NEXT_PUBLIC_APP_ENV === 'preview';

// Report-only for now: a tuned policy ships enforcing once preview shows no first-party violations
// (docs/decisions/009-report-only-content-security-policy.md). Violations are POSTed to /api/csp-report and land in the server log.
// script-src needs 'unsafe-inline' for Next's inline hydration scripts until nonces are rolled out,
// so the policy mainly constrains connect-src, frame-src, object-src, base-uri and form-action.
