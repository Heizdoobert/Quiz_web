import { describe, it, expect, vi } from 'vitest';
import { adminNavItems } from '@/app/admin/_modules/nav';

vi.mock('@/app/admin/_modules/registry.generated', () => ({
  ADMIN_MODULES: [
    { id: 'zeta', manifest: { label: 'Zeta', permission: 'disputes.resolve' } },
    { id: 'late', manifest: { label: 'Late', permission: 'roles.grant', order: 20 } },
    { id: 'early', manifest: { label: 'Early', permission: 'roles.grant', order: 10 } },
    { id: 'alpha', manifest: { label: 'Alpha', permission: 'disputes.resolve' } },
  ],
}));

const labels = (role: unknown) => adminNavItems(role).map((i) => i.label);

describe('adminNavItems', () => {
  it('lists the legacy pages first, then modules by order, then by label', () => {
    expect(labels('admin')).toEqual(['Config', 'Roles', 'Quarantine', 'Errors', 'Reports', 'Early', 'Late', 'Alpha', 'Zeta']);
  });

  it('links a module at /admin/<id>', () => {
    expect(adminNavItems('admin').find((i) => i.label === 'Early')?.href).toBe('/admin/early');
  });

  it('hides modules the role cannot open', () => {
    expect(labels('moderator')).toEqual(['Quarantine', 'Alpha', 'Zeta']);
  });

  it('shows nothing to a user or an unknown role', () => {
    expect(labels('user')).toEqual([]);
    expect(labels(undefined)).toEqual([]);
  });
});
