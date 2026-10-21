# app/api/v1/auth/password/verify/route.ts
lines:22 exports:POST
---
import { NextRequest } from 'next/server';
import { verifyPasswordResetCode } from '@/lib/services/password-reset';
import { apiOk, apiError } from '@/lib/services/api-response';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = (await req.json()) ?? {};

    if (typeof email !== 'string' || typeof code !== 'string' || !email.trim() || !code.trim()) {
      return apiError('VALIDATION_ERROR', 'Email and OTP code are required');
    }

    const result = await verifyPasswordResetCode(email, code);
    if (!result.ok) {
      return apiError('UNAUTHORIZED', result.error ?? 'Invalid or expired code');
    }

    return apiOk({ ok: true, resetToken: result.resetToken });
  } catch {
    return apiError('SERVER_ERROR', 'Internal server error');
  }
}
