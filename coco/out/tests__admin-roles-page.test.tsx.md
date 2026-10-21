# tests/admin-roles-page.test.tsx
lines:92 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminRolesPage from '@/app/admin/roles/page';
import RoleTable from '@/components/admin/RoleTable';
import { authorize } from '@/lib/services/authorize';
import { listAccountsForAdmin } from '@/lib/services/role-admin';
import { listAccountsAction, setRoleAction } from '@/lib/actions/admin-actions';

vi.mock('@/lib/services/authorize', () => ({ authorize: vi.fn() }));
vi.mock('@/lib/services/role-admin', () => ({ listAccountsForAdmin: vi.fn() }));
vi.mock('@/lib/actions/admin-actions', () => ({ listAccountsAction: vi.fn(), setRoleAction: vi.fn() }));

const ME = '00000000-0000-4000-8000-0000000000a1';
const ANN = { id: '00000000-0000-4000-8000-0000000000c3', display_name: 'Ann', role: 'user', created_at: '2026-10-01' };
const SELF = { id: ME, display_name: 'Owner', role: 'admin', created_at: '2026-09-01' };

beforeEach(() => {
  vi.mocked(authorize).mockReset();
  vi.mocked(listAccountsForAdmin).mockReset();
  vi.mocked(listAccountsAction).mockReset();
  vi.mocked(setRoleAction).mockReset();
});

describe('AdminRolesPage', () => {
  it('denies a caller without roles.grant and never lists accounts', async () => {
    vi.mocked(authorize).mockResolvedValue({ success: false, error: { code: 'NOT_ALLOWED', message: 'no' } });
    render(await AdminRolesPage());
    expect(screen.getByRole('alert').textContent).toContain('No access');
    expect(listAccountsForAdmin).not.toHaveBeenCalled();
    expect(authorize).toHaveBeenCalledWith('roles.grant');
  });

  it('renders the first page of accounts', async () => {
    vi.mocked(authorize).mockResolvedValue({ success: true, data: { account: { id: ME }, role: 'admin' } });
    vi.mocked(listAccountsForAdmin).mockResolvedValue({ success: true, data: { accounts: [ANN], limit: 20, offset: 0 } });
    render(await AdminRolesPage());
    expect(screen.getByText(/Ann/)).toBeTruthy();
  });

  it('shows the error when the list fails', async () => {
