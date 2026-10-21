# lib/services/api/sendgrid.ts
lines:100 exports:SendGridRecipient,SendEmailOptions,SendEmailResult,sendEmail
---
export interface SendGridRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: string | string[] | SendGridRecipient | SendGridRecipient[];
  subject: string;
  text: string;
  html?: string;
  from?: {
    email: string;
    name?: string;
  };
  apiKey?: string;
  fetchFn?: typeof fetch;
}

export interface SendEmailResult {
  success: boolean;
  statusCode: number;
  messageId?: string;
}

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

function normalizeRecipients(
  to: string | string[] | SendGridRecipient | SendGridRecipient[]
): Array<{ email: string; name?: string }> {
  if (Array.isArray(to)) {
    return to.map((item) => (typeof item === 'string' ? { email: item } : item));
  }
  return [typeof to === 'string' ? { email: to } : to];
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = options.apiKey || process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is not configured');
  }
