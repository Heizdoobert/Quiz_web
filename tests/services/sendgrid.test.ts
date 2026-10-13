import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendEmail } from '@/lib/services/sendgrid';

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
      to: 'product-team@example.com',
      subject: 'Daily Metrics',
      text: 'Total users: 1500',
      html: '<p>Total users: <strong>1500</strong></p>',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(202);
    expect(result.messageId).toBe('msg_abc123');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer test-sendgrid-key',
      'Content-Type': 'application/json',
    });

    const body = JSON.parse(options.body as string);
    expect(body.personalizations[0].to).toEqual([{ email: 'product-team@example.com' }]);
    expect(body.from).toEqual({ email: 'alerts@quickquiz.app', name: 'QuickQuiz System' });
    expect(body.subject).toBe('Daily Metrics');
    expect(body.content).toEqual([
      { type: 'text/plain', value: 'Total users: 1500' },
      { type: 'text/html', value: '<p>Total users: <strong>1500</strong></p>' },
    ]);
  });

  it('supports multiple recipients and custom sender name', async () => {
    process.env.SENDGRID_API_KEY = 'test-custom-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      headers: new Headers(),
      text: async () => '',
    });

    const result = await sendEmail({
      to: ['lead@example.com', 'admin@example.com'],
      from: { email: 'custom@quickquiz.app', name: 'Custom Alert' },
      subject: 'Alert',
      text: 'Warning threshold met',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(result.success).toBe(true);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.personalizations[0].to).toEqual([
      { email: 'lead@example.com' },
      { email: 'admin@example.com' },
    ]);
    expect(body.from).toEqual({ email: 'custom@quickquiz.app', name: 'Custom Alert' });
  });

  it('throws descriptive error when SendGrid API returns error status', async () => {
    process.env.SENDGRID_API_KEY = 'test-invalid-key';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      text: async () => JSON.stringify({ errors: [{ message: 'The provided authorization grant is invalid' }] }),
    });

    await expect(
      sendEmail({
        to: 'admin@example.com',
        subject: 'Test',
        text: 'Testing',
        fetchFn: mockFetch as unknown as typeof fetch,
      })
    ).rejects.toThrow('SendGrid API error (401): The provided authorization grant is invalid');
  });
});
