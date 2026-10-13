import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminModuleRoute from '@/app/admin/[...module]/page';
import type { AdminModule } from '@/app/admin/_modules/types';
import { authorize } from '@/lib/services/authorize';
import { can, type Role } from '@/lib/services/rbac';

const { loadAudit, loadReports } = vi.hoisted(() => ({ loadAudit: vi.fn(), loadReports: vi.fn() }));

vi.mock('@/app/admin/_modules/registry.generated', () => ({
  ADMIN_MODULES: [
    {
      id: 'audit-log',
      manifest: { label: 'Audit log', permission: 'roles.grant' },
      load: loadAudit,
    },
    {
      id: 'triage',
      manifest: { label: 'Triage', permission: 'disputes.resolve' },
      load: loadReports,
    },
  ] satisfies AdminModule[],
}));
vi.mock('@/lib/services/authorize', () => ({ authorize: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));

const mockAuthorize = vi.mocked(authorize);

function signInAs(role: Role | null) {
  mockAuthorize.mockImplementation(async (permission) => {
    if (role === null) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } };
    if (!can(role, permission)) return { success: false, error: { code: 'NOT_ALLOWED', message: 'no' } };
    return { success: true, data: { account: { id: 'a' }, role } };
  });
}

async function open(...path: string[]) {
  render(await AdminModuleRoute({ params: Promise.resolve({ module: path }) }));
}

beforeEach(() => {
  mockAuthorize.mockReset();
  const page = ({ role, segments }: { role: Role; segments: string[] }) => <p>body {role} [{segments.join('/')}]</p>;
  loadAudit.mockReset().mockResolvedValue({ default: page });
  loadReports.mockReset().mockResolvedValue({ default: page });
});

describe('admin module route', () => {
  it('renders the module for a role that holds its permission, with the remaining segments', async () => {
    signInAs('admin');
    await open('audit-log', 'run', '7');
    expect(screen.getByText('body admin [run/7]')).toBeTruthy();
  });

  it('lets a moderator open a module that needs only a moderator permission', async () => {
    signInAs('moderator');
    await open('triage');
    expect(screen.getByText('body moderator []')).toBeTruthy();
  });

  it('denies a moderator an admin-only module and never loads its code', async () => {
    signInAs('moderator');
    await open('audit-log');
    expect(screen.getByRole('alert').textContent).toContain('No access');
    expect(loadAudit).not.toHaveBeenCalled();
  });

  it('tells a guest to sign in and never loads the module', async () => {
    signInAs(null);
    await open('triage');
    expect(screen.getByRole('alert').textContent).toContain('Sign in required');
    expect(loadReports).not.toHaveBeenCalled();
  });

  it('answers not found for an unknown id without authorizing', async () => {
    signInAs('admin');
    await expect(open('nope')).rejects.toThrow('NOT_FOUND');
    expect(mockAuthorize).not.toHaveBeenCalled();
  });
});
