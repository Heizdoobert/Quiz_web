# app/api/v1/questions/[id]/comment/route.ts
lines:60 exports:dynamic,POST
---
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/api-auth';
import { addComment } from '@/lib/actions/community-actions';
import { apiOk, apiError } from '@/lib/services/api-response';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    if (!id) {
      return apiError('VALIDATION_ERROR', 'Question ID is required');
    }

    let body: Record<string, unknown> | null;
    try {
      body = await req.json();
    } catch {
      return apiError('VALIDATION_ERROR', 'Invalid request body');
    }

    const commentBody = typeof body?.body === 'string' ? body.body.trim() : '';
    if (!commentBody) {
      return apiError('VALIDATION_ERROR', 'Comment body is required');
    }

    const kind: 'comment' | 'suggestion' = body?.kind === 'suggestion' ? 'suggestion' : 'comment';

    const result = await addComment(id, commentBody, kind, auth.account);
    if (result.ok) {
      return apiOk({ ok: true });
    }

    if (result.code === 'INVALID') {
