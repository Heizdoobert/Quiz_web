# tests/security-headers.test.ts
lines:69 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../app/api/csp-report/route';

type Header = { key: string; value: string };

async function loadHeaders(env: Record<string, string>): Promise<Record<string, string>> {
  vi.resetModules();
  Object.assign(process.env, env);
  const config = (await import('../next.config.mjs')).default as unknown as {
    headers: () => Promise<{ source: string; headers: Header[] }[]>;
  };
  const [{ source, headers }] = await config.headers();
  expect(source).toBe('/:path*');
  return Object.fromEntries(headers.map((h) => [h.key, h.value]));
}

describe('security headers', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co';
  });

  it('keeps the existing headers, including the enforcing frame-ancestors policy', async () => {
    const h = await loadHeaders({});
    expect(h['Content-Security-Policy']).toBe("frame-ancestors 'none'");
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Strict-Transport-Security']).toContain('max-age=63072000');
  });

  it('adds a report-only policy that allows Supabase and the wallet relays, and nothing open-ended', async () => {
    const csp = (await loadHeaders({}))['Content-Security-Policy-Report-Only'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('https://abc.supabase.co wss://abc.supabase.co');
    expect(csp).toContain('wss://*.walletconnect.org');
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('report-uri /api/csp-report');
    expect(csp).not.toMatch(/connect-src[^;]*\s\*(\s|;|$)/);
    expect(csp).not.toMatch(/connect-src[^;]*\shttps:(\s|;|$)/);
  });

