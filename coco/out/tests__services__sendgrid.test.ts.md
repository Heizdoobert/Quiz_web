# tests/services/sendgrid.test.ts
lines:117 exports:
---
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendEmail } from '@/lib/services/api/sendgrid';

describe('SendGrid Email Service (TDD)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws an error if SENDGRID_API_KEY is not configured', async () => {
    delete process.env.SENDGRID_API_KEY;

    await expect(
      sendEmail({
        to: 'product@example.com',
        subject: 'System Report',
        text: 'All systems operational',
      })
    ).rejects.toThrow('SENDGRID_API_KEY is not configured');
  });

  it('sends an email successfully via SendGrid v3 API using fetch', async () => {
    process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
    process.env.SENDGRID_FROM_EMAIL = 'alerts@quickquiz.app';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      headers: new Headers({ 'x-message-id': 'msg_abc123' }),
      text: async () => '',
    });

    const result = await sendEmail({
