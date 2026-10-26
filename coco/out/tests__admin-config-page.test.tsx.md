# tests/admin-config-page.test.tsx
lines:75 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminConfigPage from '@/app/admin/config/page';
import ConfigToggle from '@/components/admin/ConfigToggle';
import { authorize } from '@/lib/services/auth/authorize';
import { getRemoteConfig } from '@/sdk/remote_config';
import { updateConfigAction } from '@/lib/actions/admin-actions';

vi.mock('@/lib/services/auth/authorize', () => ({ authorize: vi.fn() }));
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
