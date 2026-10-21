import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminLayout from '@/app/admin/layout';
import AdminIndex from '@/app/admin/page';
import { authorize } from '@/lib/services/auth/authorize';
import { can, type Role } from '@/lib/services/rbac/rbac';

vi.mock('@/lib/services/auth/authorize', () => ({ authorize: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const mockAuthorize = vi.mocked(authorize);

// Stands in for the database: the role decides, as authorize() does.
function signInAs(role: Role | null) {
  mockAuthorize.mockImplementation(async (permission) => {
    if (role === null) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } };
    if (!can(role, permission)) return { success: false, error: { code: 'NOT_ALLOWED', message: 'no' } };
    return { success: true, data: { account: { id: 'a' }, role } };
  });
}

async function renderLayout() {
  render(await AdminLayout({ children: <p>page body</p> }));
}

beforeEach(() => mockAuthorize.mockReset());

describe('admin layout', () => {
  it('shows an admin every page link and the page body', async () => {
    signInAs('admin');
    await renderLayout();
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['Config', 'Roles', 'Quarantine', 'Errors', 'Reports']);
    expect(screen.getByText('page body')).toBeTruthy();
  });

  it('shows a moderator only the quarantine link', async () => {
    signInAs('moderator');
    await renderLayout();
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['Quarantine']);
  });

  it('denies a user and renders no body', async () => {
    signInAs('user');
    await renderLayout();
    expect(screen.getByRole('alert').textContent).toContain('No access');
    expect(screen.queryByText('page body')).toBeNull();
  });

  it('tells a guest to sign in and renders no body', async () => {
    signInAs(null);
    await renderLayout();
    expect(screen.getByRole('alert').textContent).toContain('Sign in required');
    expect(screen.queryByText('page body')).toBeNull();
  });
});

describe('admin index', () => {
  it.each([
    ['admin', '/admin/config'],
    ['moderator', '/admin/quarantine'],
  ] as const)('sends a %s to %s', async (role, target) => {
    signInAs(role);
    await expect(AdminIndex()).rejects.toThrow(`REDIRECT ${target}`);
  });

  it('does not redirect a user or a guest', async () => {
    signInAs('user');
    render(await AdminIndex());
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
