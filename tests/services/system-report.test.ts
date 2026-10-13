import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  collectSystemMetrics,
  formatSystemReport,
  sendSystemReport,
  type SystemMetrics,
} from '@/lib/services/system-report';

vi.mock('@/lib/db/questions', () => ({
  ping: vi.fn(),
}));

vi.mock('@/lib/db/metrics', () => ({
  getSystemCounts: vi.fn(),
}));

vi.mock('@/lib/services/sendgrid', () => ({
  sendEmail: vi.fn(),
}));

import { ping } from '@/lib/db/questions';
import { getSystemCounts } from '@/lib/db/metrics';
import { sendEmail } from '@/lib/services/sendgrid';

describe('System Report Service (TDD)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('collects healthy system metrics with counts when DB responds', async () => {
    vi.mocked(ping).mockResolvedValue(undefined);
    vi.mocked(getSystemCounts).mockResolvedValue({
      totalUsers: 120,
      totalQuestions: 450,
      totalQuizResults: 3200,
    });

    const metrics = await collectSystemMetrics();
    expect(metrics.dbStatus).toBe('healthy');
    expect(metrics.totalUsers).toBe(120);
    expect(metrics.totalQuestions).toBe(450);
    expect(metrics.totalQuizResults).toBe(3200);
    expect(metrics.timestamp).toBeDefined();
    expect(metrics.environment).toBeDefined();
  });

  it('marks dbStatus as degraded and defaults counts when ping fails', async () => {
    vi.mocked(ping).mockRejectedValue(new Error('DB connection timed out'));

    const metrics = await collectSystemMetrics();
    expect(metrics.dbStatus).toBe('degraded');
    expect(metrics.dbError).toContain('DB connection timed out');
  });

  it('formats system report with subject, text and html', () => {
    const mockMetrics: SystemMetrics = {
      timestamp: '2026-10-13T08:00:00.000Z',
      environment: 'production',
      dbStatus: 'healthy',
      totalUsers: 150,
      totalQuestions: 500,
      totalQuizResults: 2400,
    };

    const report = formatSystemReport(mockMetrics);
    expect(report.subject).toContain('[QuickQuiz System Report]');
    expect(report.subject).toContain('HEALTHY');

    expect(report.text).toContain('Database: healthy');
    expect(report.text).toContain('Total Users: 150');
    expect(report.text).toContain('Total Questions: 500');
    expect(report.text).toContain('Total Quiz Results: 2400');
    expect(report.text).toContain('Environment: production');

    expect(report.html).toContain('<h2>QuickQuiz System Digest</h2>');
    expect(report.html).toContain('150');
    expect(report.html).toContain('healthy');
  });

  it('sends system report to PRODUCT_REPORT_EMAIL via sendEmail', async () => {
    process.env.PRODUCT_REPORT_EMAIL = 'product-ops@quickquiz.app';
    vi.mocked(ping).mockResolvedValue(undefined);
    vi.mocked(getSystemCounts).mockResolvedValue({
      totalUsers: 10,
    });

    vi.mocked(sendEmail).mockResolvedValue({
      success: true,
      statusCode: 202,
      messageId: 'report-msg-001',
    });

    const result = await sendSystemReport();
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('report-msg-001');
    expect(result.metrics.dbStatus).toBe('healthy');

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(sendEmail).mock.calls[0][0];
    expect(callArgs.to).toEqual('product-ops@quickquiz.app');
    expect(callArgs.subject).toContain('[QuickQuiz System Report]');
  });

  it('throws error when PRODUCT_REPORT_EMAIL is missing', async () => {
    delete process.env.PRODUCT_REPORT_EMAIL;

    await expect(sendSystemReport()).rejects.toThrow('PRODUCT_REPORT_EMAIL is not configured');
  });
});
