# tests/auth-challenger-m2-empirical.test.ts
lines:373 exports:
---
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { middleware } from '../middleware';
import { sanitizeRedirectUrl } from '../lib/utils/redirect';

const TEST_SECRET = 'challenger-m2-secret-key-32byteslong!';

function createSessionCookie(
  id: string,
  expDeltaSeconds: number = 7 * 24 * 3600,
  secret: string = TEST_SECRET
): string {
  const key = createHmac('sha256', secret).update('quiz-session').digest();
  const exp = Math.floor(Date.now() / 1000) + expDeltaSeconds;
  const payload = `${id}.${exp}`;
  const mac = createHmac('sha256', key).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}

describe('Challenger M2 Empirical Stress Harness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SUPABASE_SECRET_KEY', TEST_SECRET);
  });

  describe('Adversarial Challenge 1: Open Redirect Boundary & Parser Evasion', () => {
    it('rejects protocol-relative URL variants', () => {
      const protocolRelativePayloads = [
        '//attacker.com',
        '//attacker.com/path',
        '//attacker.com:443/login',
        '///attacker.com',
        '////attacker.com',
        '//attacker.com?foo=bar',
        '//google.com',
      ];

      for (const payload of protocolRelativePayloads) {
