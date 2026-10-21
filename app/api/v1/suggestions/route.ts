import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/auth/api-auth';
import { getSuggestionsForAuthor } from '@/lib/actions/community';
import { apiOk, apiError } from '@/lib/services/api/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const suggestions = await getSuggestionsForAuthor(auth.account.id, auth.account);
    return apiOk(suggestions);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to fetch suggestions');
  }
}
