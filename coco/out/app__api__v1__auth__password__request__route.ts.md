# app/api/v1/auth/password/request/route.ts
lines:19 exports:POST
---
import { NextRequest } from 'next/server';
import { requestPasswordReset } from '@/lib/services/password-reset';
import { apiOk, apiError } from '@/lib/services/api-response';

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) ?? {};
    if (typeof email !== 'string' || !email.trim()) {
      return apiError('VALIDATION_ERROR', 'Email is required');
    }
    const result = await requestPasswordReset(email);
    if (!result.sent) {
      return apiError('SERVER_ERROR', result.error ?? 'Failed to send reset code');
    }
    return apiOk({ sent: true });
  } catch {
    return apiError('SERVER_ERROR', 'Internal server error');
  }
}
