import { NextRequest } from 'next/server';
import { updatePasswordWithReset } from '@/lib/services/password-reset';
import { apiOk, apiError } from '@/lib/services/api-response';

export async function POST(req: NextRequest) {
  try {
    const { email, resetToken, newPassword } = (await req.json()) ?? {};
    if (
      typeof email !== 'string' ||
      typeof resetToken !== 'string' ||
      typeof newPassword !== 'string' ||
      !email.trim() ||
      !resetToken.trim() ||
      !newPassword.trim()
    ) {
      return apiError('VALIDATION_ERROR', 'Email, reset token, and new password are required');
    }

    const result = await updatePasswordWithReset(email, resetToken, newPassword);
    if (!result.ok) {
      return apiError('UNAUTHORIZED', result.error ?? 'Failed to reset password');
    }

    return apiOk({ ok: true });
  } catch {
    return apiError('SERVER_ERROR', 'Internal server error');
  }
}
