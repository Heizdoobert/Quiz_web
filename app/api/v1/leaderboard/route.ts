import { NextRequest } from 'next/server';
import { getGlobalLeaderboard } from '@/lib/actions/leaderboard-actions';
import { apiOk, apiError } from '@/lib/services/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = limitParam !== null && !isNaN(parseInt(limitParam, 10)) ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam !== null && !isNaN(parseInt(offsetParam, 10)) ? parseInt(offsetParam, 10) : 0;

    const data = await getGlobalLeaderboard(limit, offset);
    return apiOk(data);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to fetch global leaderboard');
  }
}
