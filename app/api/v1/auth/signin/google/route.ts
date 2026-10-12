import { NextRequest } from 'next/server';
import { signInAccountWithGoogle } from '@/lib/services/credentials';
import { issueMobileAuthToken } from '@/lib/services/mobile-auth';
import { apiOk, apiError } from '@/lib/services/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken } = body ?? {};
    if (typeof idToken !== 'string' || !idToken.trim()) {
      return apiError('VALIDATION_ERROR', 'idToken is required');
    }

    const result = await signInAccountWithGoogle(idToken);
    if (!result.ok) {
      const msg = result.error.toLowerCase();
      if (msg.includes('too many attempts')) {
        return apiError('RATE_LIMITED', result.error);
      }
      return apiError('UNAUTHORIZED', result.error);
    }

    const token = issueMobileAuthToken(result.account);
    if (!token) {
      return apiError('SERVER_ERROR', 'Failed to issue token');
    }

    return apiOk({ token, accountId: result.account.id });
  } catch {
    return apiError('SERVER_ERROR', 'Internal server error');
  }
}
