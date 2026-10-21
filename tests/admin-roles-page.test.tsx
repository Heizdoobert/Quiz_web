import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminRolesPage from '@/app/admin/roles/page';
import RoleTable from '@/components/admin/RoleTable';
import { authorize } from '@/lib/services/auth/authorize';
import { listAccountsForAdmin } from '@/lib/services/admin/role-admin';
import { listAccountsAction, setRoleAction } from '@/lib/actions/admin-actions';

vi.mock('@/lib/services/auth/authorize', () => ({ authorize: vi.fn() }));
vi.mock('@/lib/services/admin/role-admin', () => ({ listAccountsForAdmin: vi.fn() }));
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
    vi.mocked(authorize).mockResolvedValue({ success: true, data: { account: { id: ME }, role: 'admin' } });
    vi.mocked(listAccountsForAdmin).mockResolvedValue({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load the accounts.' } });
    render(await AdminRolesPage());
    expect(screen.getByRole('alert').textContent).toContain('Failed to load');
  });
});

describe('RoleTable', () => {
  it('disables the select on your own row only', () => {
    render(<RoleTable initial={[SELF, ANN]} selfId={ME} />);
    expect(screen.getByLabelText(/Role of Owner/).hasAttribute('disabled')).toBe(true);
    expect(screen.getByLabelText(/Role of Ann/).hasAttribute('disabled')).toBe(false);
  });

  it('asks first, then sets the role and announces it', async () => {
    vi.mocked(setRoleAction).mockResolvedValue({ success: true, data: { accountId: ANN.id, role: 'moderator' } });
    render(<RoleTable initial={[ANN]} selfId={ME} />);
    fireEvent.change(screen.getByLabelText(/Role of Ann/), { target: { value: 'moderator' } });
    expect(setRoleAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() => expect(screen.getByText(/is now moderator/)).toBeTruthy());
    expect(setRoleAction).toHaveBeenCalledWith(ANN.id, 'moderator');
  });

  it('shows the service error and keeps the old role', async () => {
    vi.mocked(setRoleAction).mockResolvedValue({ success: false, error: { code: 'NOT_ALLOWED', message: 'You do not have permission to do that.' } });
    render(<RoleTable initial={[ANN]} selfId={ME} />);
    fireEvent.change(screen.getByLabelText(/Role of Ann/), { target: { value: 'admin' } });
    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() => expect(screen.getByText(/permission/)).toBeTruthy());
    expect((screen.getByLabelText(/Role of Ann/) as HTMLSelectElement).value).toBe('user');
  });

  it('searches by display name from the first page', async () => {
    vi.mocked(listAccountsAction).mockResolvedValue({ success: true, data: { accounts: [ANN], limit: 20, offset: 0 } });
    render(<RoleTable initial={[]} selfId={ME} />);
    expect(screen.getByText('No accounts match.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search by display name'), { target: { value: 'Ann' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(screen.getByLabelText(/Role of Ann/)).toBeTruthy());
    expect(listAccountsAction).toHaveBeenCalledWith('Ann', 0);
  });

  it('loads the next page when a full page came back', async () => {
    const full = Array.from({ length: 20 }, (_, i) => ({ ...ANN, id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, display_name: `P${i}` }));
    vi.mocked(listAccountsAction).mockResolvedValue({ success: true, data: { accounts: [ANN], limit: 20, offset: 20 } });
    render(<RoleTable initial={full} selfId={ME} />);
    fireEvent.click(screen.getByText('Load more'));
    await waitFor(() => expect(listAccountsAction).toHaveBeenCalledWith('', 20));
    await waitFor(() => expect(screen.queryByText('Load more')).toBeNull());
  });
});
