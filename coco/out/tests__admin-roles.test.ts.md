# tests/admin-roles.test.ts
lines:177 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PUT } from '@/app/api/v1/admin/roles/route';
import { issueMobileAuthToken } from '@/lib/services/mobile-auth';
import { roleOf, setRole } from '@/lib/db/roles';
import { logger } from '@/lib/logger';

vi.mock('@/lib/db/roles', () => ({ roleOf: vi.fn(), setRole: vi.fn() }));
vi.mock('@/lib/services/session', () => ({ getSessionAccount: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const MODERATOR = '00000000-0000-4000-8000-0000000000b2';
const PLAYER = '00000000-0000-4000-8000-0000000000c3';
const GHOST = '00000000-0000-4000-8000-0000000000d4';

let roles: Record<string, string>;

function put(body: unknown, callerId?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (callerId) headers.Authorization = `Bearer ${issueMobileAuthToken({ id: callerId })}`;
  return new NextRequest('http://localhost/api/v1/admin/roles', {
    method: 'PUT',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function code(res: Response) {
  return (await res.json()).error?.code;
}

beforeEach(() => {
  roles = { [ADMIN]: 'admin', [MODERATOR]: 'moderator', [PLAYER]: 'user' };
  vi.mocked(roleOf).mockReset().mockImplementation(async (id) => roles[id] ?? null);
  vi.mocked(setRole).mockReset().mockImplementation(async (id, role) => {
    if (!(id in roles)) return false;
    roles[id] = role;
    return true;
  });
