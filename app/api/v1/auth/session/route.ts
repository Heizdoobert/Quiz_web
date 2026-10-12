import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/api-auth';
import { getSessionInfo } from '@/lib/actions/auth-actions';
import { apiOk, apiError } from '@/lib/services/api-response';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const session = await getSessionInfo(auth.account);
  if (!session) {
    return apiError('UNAUTHORIZED', 'Invalid session');
  }

  return apiOk({
    id: session.id,
    username: session.username,
  });
}
