import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import robots from '../app/robots';

describe('app/robots.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('disallows all crawlers on preview deployments (VERCEL_ENV=preview)', () => {
    process.env.VERCEL_ENV = 'preview';
    const res = robots();
    expect(res.rules).toEqual([
      {
        userAgent: '*',
        disallow: '/',
      },
    ]);
  });

  it('disallows all crawlers when NEXT_PUBLIC_APP_ENV=preview', () => {
    delete process.env.VERCEL_ENV;
    process.env.NEXT_PUBLIC_APP_ENV = 'preview';
    const res = robots();
    expect(res.rules).toEqual([
      {
        userAgent: '*',
        disallow: '/',
      },
    ]);
  });

  it('allows public indexing with sitemap on production', () => {
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_APP_ENV;
    process.env.NEXT_PUBLIC_APP_URL = 'https://quickquiz.xyz';
    const res = robots();
    expect(res.rules).toEqual([
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ]);
    expect(res.sitemap).toBe('https://quickquiz.xyz/sitemap.xml');
  });
});
