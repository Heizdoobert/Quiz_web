# tests/admin-module-route.test.tsx
lines:84 exports:
---
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

