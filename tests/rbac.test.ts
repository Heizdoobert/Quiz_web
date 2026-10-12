import { describe, it, expect } from 'vitest';
import { can, isRole, PERMISSIONS, ROLES, type Permission } from '../lib/services/rbac';
import { mapErrorCodeToStatus } from '../lib/services/api-response';
import type { ActionErrorCode } from '../lib/types';

describe('can', () => {
  it('gives an admin every permission', () => {
    for (const permission of PERMISSIONS) expect(can('admin', permission)).toBe(true);
  });

  it('gives a moderator only disputes.resolve', () => {
    const allowed = PERMISSIONS.filter((p) => can('moderator', p));
    expect(allowed).toEqual(['disputes.resolve']);
  });

  it('gives a user nothing', () => {
    for (const permission of PERMISSIONS) expect(can('user', permission)).toBe(false);
  });

  it('keeps admin a superset of moderator', () => {
    for (const permission of PERMISSIONS) {
      if (can('moderator', permission)) expect(can('admin', permission)).toBe(true);
    }
  });

  it.each([null, undefined, '', 'owner', 'ADMIN', 42, {}])('denies the unknown role %j', (role) => {
    for (const permission of PERMISSIONS) expect(can(role, permission)).toBe(false);
  });

  it('denies a permission that does not exist', () => {
    expect(can('admin', 'roles.delete' as Permission)).toBe(false);
  });
});

describe('isRole', () => {
  it('accepts exactly the three roles', () => {
    expect(ROLES).toEqual(['user', 'moderator', 'admin']);
    for (const role of ROLES) expect(isRole(role)).toBe(true);
  });

  it.each([null, undefined, '', 'owner', 'Admin', 1])('rejects %j', (value) => {
    expect(isRole(value)).toBe(false);
  });
});

describe('NOT_ALLOWED', () => {
  it('is an action error code that maps to 403', () => {
    const code: ActionErrorCode = 'NOT_ALLOWED';
    expect(mapErrorCodeToStatus(code)).toBe(403);
  });
});
