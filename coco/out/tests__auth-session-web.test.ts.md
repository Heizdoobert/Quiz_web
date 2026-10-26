# tests/auth-session-web.test.ts
lines:157 exports:
---
// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  setSessionAccount,
  getSessionAccount,
  clearSessionAccount,
} from '@/lib/services/auth/session';
import { createHmac } from 'crypto';

// In-memory cookie store simulating Next.js cookie jar
const cookieStore = new Map<string, { value: string; [key: string]: unknown }>();
let currentHeaders = new Headers({ host: 'localhost:3000', 'x-forwarded-proto': 'http' });

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => cookieStore.get(name)),
    set: vi.fn((name: string, value: string, options?: Record<string, unknown>) => {
      cookieStore.set(name, { value, ...options });
    }),
    delete: vi.fn((name: string) => {
      cookieStore.delete(name);
    }),
  })),
  headers: vi.fn(async () => currentHeaders),
}));

const TEST_SECRET = 'test-secret-key-12345678901234567890';

function makeValidCookieValue(id: string, expSecondsFromNow: number, secret: string = TEST_SECRET): string {
  const key = createHmac('sha256', secret).update('quiz-session').digest();
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  const payload = `${id}.${exp}`;
  const mac = createHmac('sha256', key).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

describe('Matrix 5: Web HTTP-Only Cookie Session (tests/auth-session-web.test.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieStore.clear();
