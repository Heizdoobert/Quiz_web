import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/auth/api-auth';
import { getQuestionAnalytics } from '@/lib/actions/users';
import { apiOk, apiError } from '@/lib/services/api/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const result = await getQuestionAnalytics(auth.account);
    if (result.success) {
      return apiOk(result.data);
    }

    if (result.error === 'Sign in to view analytics.') {
      return apiError('UNAUTHORIZED', result.error);
    }

    return apiError('SERVER_ERROR', result.error || 'Failed to fetch analytics');
  } catch {
    return apiError('SERVER_ERROR', 'Failed to fetch analytics');
  }
}
