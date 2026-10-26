# tests/report-admin.test.ts
lines:111 exports:
---
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getReportStatus, triggerSystemReport } from '@/lib/services/admin/report-admin';
import { roleOf } from '@/lib/db/roles';
import { ping } from '@/lib/db/questions';
import { getSystemCounts } from '@/lib/db/metrics';
import { sendEmail } from '@/lib/services/api/sendgrid';

vi.mock('@/lib/db/roles', () => ({ roleOf: vi.fn() }));
vi.mock('@/lib/db/questions', () => ({ ping: vi.fn() }));
vi.mock('@/lib/db/metrics', () => ({ getSystemCounts: vi.fn() }));
vi.mock('@/lib/services/api/sendgrid', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/services/auth/session', () => ({ getSessionAccount: vi.fn().mockResolvedValue(null) }));

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
