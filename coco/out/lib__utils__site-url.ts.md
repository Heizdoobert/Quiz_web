# lib/utils/site-url.ts
lines:13 exports:getSiteUrl
---
// Public base URL used for canonical links, the sitemap and robots.txt.
// NEXT_PUBLIC_APP_URL wins; on Vercel we fall back to the project's production
// domain (set automatically, no scheme), so a missing variable never points
// search engines at a domain we don't own.
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelHost) return `https://${vercelHost}`;

  return 'http://localhost:3000';
}
