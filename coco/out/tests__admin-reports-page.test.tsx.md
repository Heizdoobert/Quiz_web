# tests/admin-reports-page.test.tsx
lines:122 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminReportsPage from '@/app/admin/reports/page';
import ReportDashboard from '@/components/admin/ReportDashboard';
import { authorize } from '@/lib/services/auth/authorize';
import { getReportStatus } from '@/lib/services/admin/report-admin';
import * as adminActions from '@/lib/actions/admin-actions';
import type { ReportStatus } from '@/lib/services/admin/report-admin';

vi.mock('@/lib/services/auth/authorize', () => ({ authorize: vi.fn() }));
vi.mock('@/lib/services/admin/report-admin', () => ({ getReportStatus: vi.fn() }));

const mockStatus: ReportStatus = {
  configured: true,
  recipientEmail: 'product@example.com',
  cronSchedule: '0 0 * * *',
  cronSecretConfigured: true,
  metrics: {
    timestamp: '2026-10-13T08:00:00Z',
    environment: 'production',
    dbStatus: 'healthy',
    totalUsers: 142,
    totalQuestions: 890,
    totalQuizResults: 4320,
  },
};

beforeEach(() => {
  vi.mocked(authorize).mockReset();
  vi.mocked(getReportStatus).mockReset();
});

describe('AdminReportsPage', () => {
  it('denies a user or caller without analytics.read permission', async () => {
    vi.mocked(authorize).mockResolvedValue({
      success: false,
      error: { code: 'NOT_ALLOWED', message: 'no' },
    });

    render(await AdminReportsPage());
