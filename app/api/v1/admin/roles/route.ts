import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/auth/api-auth';
import { apiError, apiOk } from '@/lib/services/api/api-response';
import { setAccountRole } from '@/lib/services/admin/role-admin';

export const dynamic = 'force-dynamic';

// Body: { accountId, role }. Needs the roles.grant permission (admin).
export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    // A body that is not JSON is passed on as undefined fields: setAccountRole checks the
    // permission first, then rejects it as a validation error.
    const body = await req.json().catch(() => null);
    const result = await setAccountRole({ accountId: body?.accountId, role: body?.role }, auth.account);
    if (result.success) return apiOk(result.data);
    return apiError(result.error.code, result.error.message, result.error.details);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to change the role');
  }
}
