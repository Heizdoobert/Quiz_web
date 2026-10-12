import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/api-auth';
import { apiError, apiOk } from '@/lib/services/api-response';
import { listQuarantinedQuestions } from '@/lib/services/moderation';

export const dynamic = 'force-dynamic';

// Query: limit (1-50, default 20), offset. Needs the disputes.resolve permission
// (moderator or admin).
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const result = await listQuarantinedQuestions(
      { limit: parseInt(searchParams.get('limit') ?? '', 10), offset: parseInt(searchParams.get('offset') ?? '', 10) },
      auth.account
    );
    if (result.success) return apiOk(result.data);
    return apiError(result.error.code, result.error.message, result.error.details);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to load the moderation queue');
  }
}
