# app/api/v1/auth/signout/route.ts
lines:17 exports:POST
---
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/services/api-auth';
import { signOut } from '@/lib/actions/auth-actions';
import { apiOk } from '@/lib/services/api-response';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    await signOut();
  } catch {
    // Non-fatal if session cookie deletion fails in token context
  }

  return apiOk({ ok: true });
}
