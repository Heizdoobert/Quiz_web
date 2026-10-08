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
// (tasks/todo.md, Task 6). Violations are POSTed to /api/csp-report and land in the server log.
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
    // WalletConnect / Reown relays, verify and explorer APIs, and the wallet SDKs RainbowKit loads.
    'https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org',
    'https://*.reown.com wss://*.reown.com https://*.web3modal.org https://*.web3modal.com',
    'https://*.coinbase.com wss://www.walletlink.org https://*.metamask.io wss://*.metamask.io',
    // Default public RPCs viem uses for the offered chains.
    'https://eth.merkle.io https://polygon-rpc.com https://mainnet.optimism.io https://arb1.arbitrum.io https://mainnet.base.org https://sepolia.base.org',
    ...(isDev ? ['ws://localhost:*'] : []),
  ].join(' '),
  "frame-src https://verify.walletconnect.com https://verify.walletconnect.org https://secure.walletconnect.com https://secure.walletconnect.org https://*.coinbase.com",
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
  turbopack: {},
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withPWA(nextConfig);
