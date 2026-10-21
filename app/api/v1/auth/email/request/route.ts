import { NextRequest } from 'next/server';
import { requestEmailCode } from '@/lib/actions/auth-actions';
import { apiOk, apiError } from '@/lib/services/api/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body ?? {};
    if (typeof email !== 'string' || !email.trim()) {
      return apiError('VALIDATION_ERROR', 'Email is required');
    }

    const result = await requestEmailCode(email);
    if (result.error === 'RATE_LIMITED') {
      return apiError('RATE_LIMITED', 'Too many attempts. Please try again later.');
    }

    return apiOk({ sent: result.sent });
  } catch {
    return apiError('SERVER_ERROR', 'Internal server error');
  }
}
