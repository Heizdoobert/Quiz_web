# tests/services/cron-auth.test.ts
lines:28 exports:
---
import { describe, it, expect, afterEach } from 'vitest';
import { isCronAuthorized } from '@/lib/services/auth/cron-auth';

const URL_BASE = 'https://quickquiz.app/api/cron/x';
const original = process.env.CRON_SECRET;
afterEach(() => {
  if (original === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = original;
});

describe('isCronAuthorized', () => {
  it('denies everything when CRON_SECRET is not set', () => {
    delete process.env.CRON_SECRET;
    expect(isCronAuthorized(new Request(URL_BASE, { headers: { Authorization: 'Bearer anything' } }))).toBe(false);
  });

  it('accepts the bearer token and the secret query parameter', () => {
    process.env.CRON_SECRET = 's3cret';
    expect(isCronAuthorized(new Request(URL_BASE, { headers: { Authorization: 'Bearer s3cret' } }))).toBe(true);
    expect(isCronAuthorized(new Request(`${URL_BASE}?secret=s3cret`))).toBe(true);
  });

  it('rejects a wrong or missing token', () => {
    process.env.CRON_SECRET = 's3cret';
    expect(isCronAuthorized(new Request(URL_BASE, { headers: { Authorization: 'Bearer nope' } }))).toBe(false);
    expect(isCronAuthorized(new Request(URL_BASE))).toBe(false);
  });
});
