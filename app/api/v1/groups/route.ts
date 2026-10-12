import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/api-auth';
import { createGroup, getUserGroups } from '@/lib/actions/group-actions';
import { apiOk, apiError } from '@/lib/services/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const groups = await getUserGroups(auth.account);
    return apiOk(groups);
  } catch {
    return apiError('SERVER_ERROR', 'Failed to fetch groups');
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    let body: Record<string, unknown> | null;
    try {
      body = await req.json();
    } catch {
      return apiError('VALIDATION_ERROR', 'Invalid request body');
    }

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return apiError('VALIDATION_ERROR', 'Group name is required');
    }

    const description = typeof body?.description === 'string' ? body.description.trim() : undefined;

    const result = await createGroup({ name, description }, auth.account);
    if (result.success) {
      return apiOk(result.group);
    }

    if (result.error === 'That group name is taken.') {
      return apiError('CONFLICT', result.error);
    }
    if (result.error?.includes('must be at most') || result.error === 'Group name is required.') {
      return apiError('VALIDATION_ERROR', result.error);
    }
    if (result.error === 'Sign in to manage groups.') {
      return apiError('UNAUTHORIZED', result.error);
    }

    return apiError('SERVER_ERROR', result.error || 'Failed to create group');
  } catch {
    return apiError('SERVER_ERROR', 'Failed to create group');
  }
}
