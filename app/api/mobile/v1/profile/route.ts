import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/services/api-response';
import { requireAuth } from '@/lib/services/api-auth';
import { deleteAccount } from '@/lib/services/account-deletion';

// Deletes the signed-in player's account and data. The id comes from the token, never the request.
// Tokens are stateless, so a deleted account's token stays valid until it expires; a repeat call is a no-op.
export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const result = await deleteAccount(auth.account);
  if (!result.success) return apiError('SERVER_ERROR', result.error);
  return apiOk({ deleted: true });
}
