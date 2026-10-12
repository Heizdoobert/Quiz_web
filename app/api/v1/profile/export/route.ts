import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/api-auth';
import { exportUserData } from '@/lib/actions/profile-actions';
import { apiOk, apiError } from '@/lib/services/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const result = await exportUserData(auth.account);
    if (result.success) {
      return apiOk(result.data);
    }

    return apiError(result.code, result.error);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to export user data');
  }
}
