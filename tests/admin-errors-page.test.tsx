import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminErrorsPage from '@/app/admin/errors/page';
import { authorize } from '@/lib/services/authorize';
import { listErrorIssues } from '@/lib/services/error-issues';

vi.mock('@/lib/services/authorize', () => ({ authorize: vi.fn() }));
vi.mock('@/lib/services/error-issues', () => ({ listErrorIssues: vi.fn() }));

const allow = { success: true, data: { account: { id: 'a' }, role: 'admin' } } as const;
const issue = { id: '1', title: '<img src=x onerror=alert(1)>', level: 'error', count: 7, lastSeen: '2026-10-13', link: 'https://sentry.io/i/1/' };

beforeEach(() => {
  vi.mocked(authorize).mockReset();
  vi.mocked(listErrorIssues).mockReset();
});

describe('AdminErrorsPage', () => {
  it('denies a caller without errors.read and never asks for issues', async () => {
    vi.mocked(authorize).mockResolvedValue({ success: false, error: { code: 'NOT_ALLOWED', message: 'no' } });
    render(await AdminErrorsPage());
    expect(screen.getByRole('alert').textContent).toContain('No access');
    expect(listErrorIssues).not.toHaveBeenCalled();
    expect(authorize).toHaveBeenCalledWith('errors.read');
  });

  it('says not configured when Sentry is not set up', async () => {
    vi.mocked(authorize).mockResolvedValue(allow);
    vi.mocked(listErrorIssues).mockResolvedValue({ success: true, data: { configured: false } });
    render(await AdminErrorsPage());
    expect(screen.getByRole('status').textContent).toContain('Not configured');
  });

  it('lists issues as text, with the link', async () => {
    vi.mocked(authorize).mockResolvedValue(allow);
    vi.mocked(listErrorIssues).mockResolvedValue({ success: true, data: { configured: true, issues: [issue, { ...issue, id: '2', title: 'plain', link: null }] } });
    const { container } = render(await AdminErrorsPage());
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getAllByText('Open in Sentry')).toHaveLength(1);
  });

  it('shows an empty state', async () => {
    vi.mocked(authorize).mockResolvedValue(allow);
    vi.mocked(listErrorIssues).mockResolvedValue({ success: true, data: { configured: true, issues: [] } });
    render(await AdminErrorsPage());
    expect(screen.getByText('No unresolved issues.')).toBeTruthy();
  });

  it('shows the failure message, nothing more', async () => {
    vi.mocked(authorize).mockResolvedValue(allow);
    vi.mocked(listErrorIssues).mockResolvedValue({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load error tracking.' } });
    render(await AdminErrorsPage());
    expect(screen.getByRole('alert').textContent).toBe('Failed to load error tracking.');
  });
});
