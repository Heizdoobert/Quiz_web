import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getReportStatus, triggerSystemReport } from '@/lib/services/report-admin';
import { roleOf } from '@/lib/db/roles';
import { ping } from '@/lib/db/questions';
import { getSystemCounts } from '@/lib/db/metrics';
import { sendEmail } from '@/lib/services/sendgrid';

vi.mock('@/lib/db/roles', () => ({ roleOf: vi.fn() }));
vi.mock('@/lib/db/questions', () => ({ ping: vi.fn() }));
vi.mock('@/lib/db/metrics', () => ({ getSystemCounts: vi.fn() }));
vi.mock('@/lib/services/sendgrid', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/services/session', () => ({ getSessionAccount: vi.fn().mockResolvedValue(null) }));

const ADMIN = { id: '00000000-0000-4000-8000-0000000000a1' };
const MODERATOR = { id: '00000000-0000-4000-8000-0000000000b2' };
const env = { ...process.env };

beforeEach(() => {
  vi.mocked(roleOf).mockReset().mockImplementation(async (id) => (id === ADMIN.id ? 'admin' : 'moderator'));
  vi.mocked(ping).mockReset().mockResolvedValue(undefined);
  vi.mocked(getSystemCounts).mockReset().mockResolvedValue({
    totalUsers: 100,
    totalQuestions: 500,
    totalQuizResults: 2000,
  });
  vi.mocked(sendEmail).mockReset().mockResolvedValue({ success: true, statusCode: 202, messageId: 'msg-1' });

  process.env.SENDGRID_API_KEY = 'test-key';
  process.env.PRODUCT_REPORT_EMAIL = 'admin@example.com';
  process.env.CRON_SECRET = 'cron-secret-123';
});

afterEach(() => {
  process.env = { ...env };
});

describe('getReportStatus', () => {
  it('denies a moderator and unauthenticated guest without collecting metrics', async () => {
    expect(await getReportStatus(MODERATOR)).toMatchObject({ success: false, error: { code: 'NOT_ALLOWED' } });
    expect(await getReportStatus()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    expect(ping).not.toHaveBeenCalled();
  });

  it('returns report configuration and current system metrics for admin', async () => {
    const res = await getReportStatus(ADMIN);
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.configured).toBe(true);
    expect(res.data.recipientEmail).toBe('admin@example.com');
    expect(res.data.cronSchedule).toBe('0 0 * * *');
    expect(res.data.metrics.dbStatus).toBe('healthy');
    expect(res.data.metrics.totalUsers).toBe(100);
    expect(res.data.metrics.totalQuestions).toBe(500);
    expect(res.data.metrics.totalQuizResults).toBe(2000);
  });

  it('reports configured as false when SENDGRID_API_KEY or PRODUCT_REPORT_EMAIL is unset', async () => {
    delete process.env.SENDGRID_API_KEY;
    const res = await getReportStatus(ADMIN);
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.configured).toBe(false);
  });
});

describe('triggerSystemReport', () => {
  it('denies a moderator and unauthenticated caller', async () => {
    expect(await triggerSystemReport(MODERATOR)).toMatchObject({ success: false, error: { code: 'NOT_ALLOWED' } });
    expect(await triggerSystemReport()).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('dispatches the report and returns result for admin', async () => {
    const res = await triggerSystemReport(ADMIN);
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(res.data.sent).toBe(true);
    expect(res.data.messageId).toBe('msg-1');
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('allows admin to specify a custom recipient email override', async () => {
    const res = await triggerSystemReport(ADMIN, 'custom-admin@example.com');
    expect(res.success).toBe(true);
    if (!res.success) return;

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'custom-admin@example.com' })
    );
  });

  it('rejects an invalid custom recipient email with VALIDATION_FAILED', async () => {
    const res = await triggerSystemReport(ADMIN, 'invalid-email');
    expect(res.success).toBe(false);
    if (res.success) return;

    expect(res.error.code).toBe('VALIDATION_FAILED');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('fails gracefully when email sending fails or config is missing', async () => {
    delete process.env.PRODUCT_REPORT_EMAIL;
    const res = await triggerSystemReport(ADMIN);
    expect(res.success).toBe(false);
    expect(res.error.code).toBe('VALIDATION_FAILED');
  });
});
