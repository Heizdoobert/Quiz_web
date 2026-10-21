import { NextRequest } from 'next/server';
import { verifyEmailCode } from '@/lib/actions/auth-actions';
import { apiOk, apiError } from '@/lib/services/api/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body ?? {};
    if (typeof email !== 'string' || typeof code !== 'string' || !email.trim() || !code.trim()) {
      return apiError('VALIDATION_ERROR', 'Email and code are required');
    }

    const result = await verifyEmailCode(email, code, { issueToken: true });
    if (result.error === 'RATE_LIMITED') {
      return apiError('RATE_LIMITED', 'Too many attempts. Please try again later.');
    }
    if (!result.ok) {
      return apiError('UNAUTHORIZED', 'Invalid or expired code');
    }

    if (!result.token) {
      return apiError('SERVER_ERROR', 'Failed to issue token');
    }

    return apiOk({
      ok: true,
      token: result.token,
      accountId: result.accountId,
    });
  } catch {
    return apiError('SERVER_ERROR', 'Internal server error');
  }
}
