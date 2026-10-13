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

  const fromEmail = options.from?.email || process.env.SENDGRID_FROM_EMAIL || 'no-reply@quickquiz.app';
  const fromName = options.from?.name || 'QuickQuiz System';

  const recipients = normalizeRecipients(options.to);

  const content: Array<{ type: string; value: string }> = [
    { type: 'text/plain', value: options.text },
  ];

  if (options.html) {
    content.push({ type: 'text/html', value: options.html });
  }

  const payload = {
    personalizations: [
      {
        to: recipients,
      },
    ],
    from: {
      email: fromEmail,
      name: fromName,
    },
    subject: options.subject,
    content,
  };

  const fetchClient = options.fetchFn || fetch;
  const response = await fetchClient(SENDGRID_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errBodyText = await response.text();
      const errJson = JSON.parse(errBodyText);
      if (errJson.errors && Array.isArray(errJson.errors) && errJson.errors[0]?.message) {
        errorDetail = errJson.errors[0].message;
      }
    } catch {
      // fallback to statusText
    }
    throw new Error(`SendGrid API error (${response.status}): ${errorDetail}`);
  }

  const messageId = response.headers.get('x-message-id') || undefined;

  return {
    success: true,
    statusCode: response.status,
    messageId,
  };
}
