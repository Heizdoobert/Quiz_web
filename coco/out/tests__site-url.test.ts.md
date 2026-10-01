# tests/site-url.test.ts
lines:36 exports:
---
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSiteUrl } from '../lib/site-url';

describe('lib/site-url getSiteUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses NEXT_PUBLIC_APP_URL and drops a trailing slash', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com/';
    expect(getSiteUrl()).toBe('https://example.com');
  });

  it('prefers NEXT_PUBLIC_APP_URL over the Vercel production domain', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'quiz.vercel.app';
    expect(getSiteUrl()).toBe('https://example.com');
  });

  it('falls back to the Vercel production domain with https', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'quiz.vercel.app';
    expect(getSiteUrl()).toBe('https://quiz.vercel.app');
  });

  it('falls back to localhost when nothing is configured', () => {
    expect(getSiteUrl()).toBe('http://localhost:3000');
  });
});
