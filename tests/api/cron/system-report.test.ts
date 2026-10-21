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
      headers: {
        Authorization: 'Bearer wrong_token',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('authorizes via query parameter ?secret=', async () => {
    process.env.CRON_SECRET = 'secret_cron_123';
    vi.mocked(sendSystemReport).mockResolvedValue({
      success: true,
      metrics: {
        timestamp: '2026-10-13T08:00:00.000Z',
        environment: 'production',
        dbStatus: 'healthy',
        totalUsers: 100,
      },
      messageId: 'msg_987',
    });

    const req = new Request('https://quickquiz.app/api/cron/system-report?secret=secret_cron_123', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.messageId).toBe('msg_987');
    expect(body.metrics.totalUsers).toBe(100);
  });

  it('executes system report successfully via Bearer header with POST method', async () => {
    process.env.CRON_SECRET = 'secret_cron_123';
    vi.mocked(sendSystemReport).mockResolvedValue({
      success: true,
      metrics: {
        timestamp: '2026-10-13T08:00:00.000Z',
        environment: 'production',
        dbStatus: 'healthy',
        totalUsers: 250,
      },
      messageId: 'msg_post_456',
    });

    const req = new Request('https://quickquiz.app/api/cron/system-report', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer secret_cron_123',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.messageId).toBe('msg_post_456');
  });

  it('returns 500 when sendSystemReport throws', async () => {
    process.env.CRON_SECRET = 'secret_cron_123';
    vi.mocked(sendSystemReport).mockRejectedValue(new Error('SendGrid rate limit exceeded'));

    const req = new Request('https://quickquiz.app/api/cron/system-report', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer secret_cron_123',
      },
    });

    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to execute system report cron');
  });
});
