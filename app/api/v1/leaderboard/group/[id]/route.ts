import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/api-auth';
import { getGroupLeaderboard } from '@/lib/actions/leaderboard-actions';
import { apiOk, apiError } from '@/lib/services/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    if (!id) {
      return apiError('VALIDATION_ERROR', 'Group ID is required');
    }

    const { searchParams } = req.nextUrl;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = limitParam !== null && !isNaN(parseInt(limitParam, 10)) ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam !== null && !isNaN(parseInt(offsetParam, 10)) ? parseInt(offsetParam, 10) : 0;

    const data = await getGroupLeaderboard(id, limit, offset, auth.account);
    return apiOk(data);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to fetch group leaderboard');
  }
}
