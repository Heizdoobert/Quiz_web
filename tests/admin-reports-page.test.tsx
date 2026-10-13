import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminReportsPage from '@/app/admin/reports/page';
import ReportDashboard from '@/components/admin/ReportDashboard';
import { authorize } from '@/lib/services/authorize';
import { getReportStatus } from '@/lib/services/report-admin';
import * as adminActions from '@/lib/actions/admin-actions';
import type { ReportStatus } from '@/lib/services/report-admin';

vi.mock('@/lib/services/authorize', () => ({ authorize: vi.fn() }));
vi.mock('@/lib/services/report-admin', () => ({ getReportStatus: vi.fn() }));

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
    expect(screen.getByRole('alert').textContent).toContain('No access');
    expect(getReportStatus).not.toHaveBeenCalled();
    expect(authorize).toHaveBeenCalledWith('analytics.read');
  });

  it('renders report details and schedule when authorized', async () => {
    vi.mocked(authorize).mockResolvedValue({
      success: true,
      data: { account: { id: 'a' }, role: 'admin' },
    });
    vi.mocked(getReportStatus).mockResolvedValue({
      success: true,
      data: mockStatus,
    });

    render(await AdminReportsPage());
    expect(screen.getByText('System Reports & Cron')).toBeTruthy();
    expect(screen.getByText('0 0 * * * (Daily midnight UTC)')).toBeTruthy();
    expect(screen.getByText('HEALTHY')).toBeTruthy();
    expect(screen.getByText('142')).toBeTruthy();
    expect(screen.getByText('890')).toBeTruthy();
  });
});

describe('ReportDashboard interactions', () => {
  it('triggers report when clicking Trigger Report Now button', async () => {
    const triggerSpy = vi.spyOn(adminActions, 'triggerReportAction').mockResolvedValue({
      success: true,
      data: {
        sent: true,
        messageId: 'msg-success-999',
        metrics: mockStatus.metrics,
      },
    });

    render(<ReportDashboard initial={mockStatus} />);
    const triggerBtn = screen.getByRole('button', { name: /Trigger Report Now/i }) as HTMLButtonElement;
    expect(triggerBtn.disabled).toBe(false);

    fireEvent.click(triggerBtn);

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain('Report email sent successfully!');
    });
    expect(triggerSpy).toHaveBeenCalledTimes(1);
  });

  it('disables trigger button and shows warning if unconfigured', () => {
    const unconfiguredStatus: ReportStatus = {
      ...mockStatus,
      configured: false,
      recipientEmail: undefined,
    };

    render(<ReportDashboard initial={unconfiguredStatus} />);
    const triggerBtn = screen.getByRole('button', { name: /Trigger Report Now/i }) as HTMLButtonElement;
    expect(triggerBtn.disabled).toBe(true);
    expect(screen.getByText(/Missing SendGrid \/ Email Config/i)).toBeTruthy();
  });
});
