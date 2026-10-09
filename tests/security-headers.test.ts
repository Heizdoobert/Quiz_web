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

  it('adds a report-only policy that allows Supabase, and nothing open-ended', async () => {
    const csp = (await loadHeaders({}))['Content-Security-Policy-Report-Only'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('https://abc.supabase.co wss://abc.supabase.co');
    expect(csp).not.toContain('walletconnect');
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('report-uri /api/csp-report');
    expect(csp).not.toMatch(/connect-src[^;]*\s\*(\s|;|$)/);
    expect(csp).not.toMatch(/connect-src[^;]*\shttps:(\s|;|$)/);
  });

  it('allows eval and the dev websocket only outside production', async () => {
    const dev = (await loadHeaders({ NODE_ENV: 'development' }))['Content-Security-Policy-Report-Only'];
    expect(dev).toContain("'unsafe-eval'");
    const prod = (await loadHeaders({ NODE_ENV: 'production' }))['Content-Security-Policy-Report-Only'];
    expect(prod).not.toContain("'unsafe-eval'");
    expect(prod).not.toContain('ws://localhost');
  });
});

describe('POST /api/csp-report', () => {
  const post = (body: string) => POST(new Request('http://localhost/api/csp-report', { method: 'POST', body }));

  it('logs a violation and answers 204', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await post(JSON.stringify({ 'csp-report': { 'violated-directive': 'connect-src', 'blocked-uri': 'https://x.test' } }));
    expect(res.status).toBe(204);
    expect(warn.mock.calls[0][0]).toContain('csp_violation');
    expect(warn.mock.calls[0][0]).toContain('https://x.test');
    warn.mockRestore();
  });

  it('answers 204 without logging for malformed or oversized bodies', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await post('not json')).status).toBe(204);
    expect((await post('x'.repeat(9000))).status).toBe(204);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
