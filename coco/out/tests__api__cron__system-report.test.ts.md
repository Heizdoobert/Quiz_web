# tests/api/cron/system-report.test.ts
lines:121 exports:
---
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/services/reporting/system-report', () => ({
  sendSystemReport: vi.fn(),
}));

import { sendSystemReport } from '@/lib/services/reporting/system-report';
import { GET, POST } from '@/app/api/cron/system-report/route';

describe('System Report Cron Route (TDD)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('rejects request with 401 when Authorization header is missing', async () => {
    process.env.CRON_SECRET = 'secret_cron_123';

    const req = new Request('https://quickquiz.app/api/cron/system-report', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('rejects request with 401 when bearer token is invalid', async () => {
    process.env.CRON_SECRET = 'secret_cron_123';

    const req = new Request('https://quickquiz.app/api/cron/system-report', {
      method: 'GET',
