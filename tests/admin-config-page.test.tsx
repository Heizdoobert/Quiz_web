import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminConfigPage from '@/app/admin/config/page';
import ConfigToggle from '@/components/admin/ConfigToggle';
import { authorize } from '@/lib/services/authorize';
import { getRemoteConfig } from '@/sdk/remote_config';
import { updateConfigAction } from '@/lib/actions/admin-actions';

vi.mock('@/lib/services/authorize', () => ({ authorize: vi.fn() }));
vi.mock('@/sdk/remote_config', () => ({ getRemoteConfig: vi.fn() }));
vi.mock('@/lib/actions/admin-actions', () => ({ updateConfigAction: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const allow = { success: true, data: { account: { id: 'a' }, role: 'admin' } } as const;

beforeEach(() => {
  vi.mocked(authorize).mockReset();
  vi.mocked(getRemoteConfig).mockReset();
  vi.mocked(updateConfigAction).mockReset();
});

describe('AdminConfigPage', () => {
  it('denies a caller without config.write and never reads the config', async () => {
    vi.mocked(authorize).mockResolvedValue({ success: false, error: { code: 'NOT_ALLOWED', message: 'no' } });
    render(await AdminConfigPage());
    expect(screen.getByRole('alert').textContent).toContain('No access');
    expect(getRemoteConfig).not.toHaveBeenCalled();
    expect(authorize).toHaveBeenCalledWith('config.write');
  });

  it('shows each registered key with its current value', async () => {
    vi.mocked(authorize).mockResolvedValue(allow);
    vi.mocked(getRemoteConfig).mockResolvedValue({ maintenance_mode: true });
    render(await AdminConfigPage());
    expect(screen.getByRole('switch', { name: 'maintenance_mode' }).getAttribute('aria-checked')).toBe('true');
  });

  it('shows a could-not-load state when the read fails', async () => {
    vi.mocked(authorize).mockResolvedValue(allow);
    vi.mocked(getRemoteConfig).mockRejectedValue(new Error('db down'));
    render(await AdminConfigPage());
    expect(screen.getByRole('alert').textContent).toContain('Could not load');
    expect(screen.queryByText('db down')).toBeNull();
  });
});

describe('ConfigToggle', () => {
  it('asks first, saves on confirm, and announces the result', async () => {
    vi.mocked(updateConfigAction).mockResolvedValue({ success: true, data: { key: 'maintenance_mode', value: true } });
    render(<ConfigToggle name="maintenance_mode" initial={false} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(updateConfigAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('now on'));
    expect(updateConfigAction).toHaveBeenCalledWith('maintenance_mode', true);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('does nothing on cancel', () => {
    render(<ConfigToggle name="maintenance_mode" initial={false} />);
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(updateConfigAction).not.toHaveBeenCalled();
    expect(screen.queryByText('Confirm')).toBeNull();
  });

  it('shows the error and keeps the old value when the save fails', async () => {
    vi.mocked(updateConfigAction).mockResolvedValue({ success: false, error: { code: 'NOT_ALLOWED', message: 'You do not have permission to do that.' } });
    render(<ConfigToggle name="maintenance_mode" initial={false} />);
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('permission'));
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
  });
});
