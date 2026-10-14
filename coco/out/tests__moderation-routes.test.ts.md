# tests/moderation-routes.test.ts
lines:232 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/v1/moderation/questions/route';
import { POST } from '@/app/api/v1/moderation/questions/[id]/resolve/route';
import { issueMobileAuthToken } from '@/lib/services/mobile-auth';
import { roleOf } from '@/lib/db/roles';
import { answerKey, quarantinedQuestions, resolveQuarantined } from '@/lib/db/questions';
import { logger } from '@/lib/logger';

vi.mock('@/lib/db/roles', () => ({ roleOf: vi.fn(), setRole: vi.fn() }));
vi.mock('@/lib/db/questions', () => ({ answerKey: vi.fn(), quarantinedQuestions: vi.fn(), resolveQuarantined: vi.fn() }));
vi.mock('@/lib/services/session', () => ({ getSessionAccount: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

const ADMIN = '00000000-0000-4000-8000-0000000000a1';
const MODERATOR = '00000000-0000-4000-8000-0000000000b2';
const PLAYER = '00000000-0000-4000-8000-0000000000c3';
const GHOST = '00000000-0000-4000-8000-0000000000d4';
const QUESTION = '00000000-0000-4000-8000-000000000002';

const ROLES: Record<string, string> = { [ADMIN]: 'admin', [MODERATOR]: 'moderator', [PLAYER]: 'user' };

function headers(callerId?: string) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (callerId) h.Authorization = `Bearer ${issueMobileAuthToken({ id: callerId })}`;
  return h;
}

function list(callerId?: string, query = '') {
  return GET(new NextRequest(`http://localhost/api/v1/moderation/questions${query}`, { headers: headers(callerId) }));
}

function resolve(id: string, body: unknown, callerId?: string) {
  const req = new NextRequest(`http://localhost/api/v1/moderation/questions/${id}/resolve`, {
    method: 'POST',
    headers: headers(callerId),
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ id }) });
}
