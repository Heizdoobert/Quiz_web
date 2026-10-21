import { NextRequest } from 'next/server';
import { signUpAccount } from '@/lib/services/auth/credentials';
import { issueMobileAuthToken } from '@/lib/services/auth/mobile-auth';
import { apiOk, apiError } from '@/lib/services/api/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return apiError('VALIDATION_ERROR', 'Username and password are required');
    }

    const result = await signUpAccount(username, password);
    if (!result.ok) {
      const msg = result.error.toLowerCase();
      if (msg.includes('too many attempts')) {
        return apiError('RATE_LIMITED', result.error);
      }
      if (msg.includes('already taken') || msg.includes('already exists') || msg.includes('already registered')) {
        return apiError('CONFLICT', result.error);
      }
      if (msg.includes('unexpected') || msg.includes('could not create') || msg.includes('server error')) {
        return apiError('SERVER_ERROR', result.error);
      }
      return apiError('VALIDATION_ERROR', result.error);
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
