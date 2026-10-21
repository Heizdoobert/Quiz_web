// Refresh token endpoint
import { NextRequest, NextResponse } from 'next/server';
import { verifyRefresh, signJwt, signRefresh, createJwtCookie, createRefreshCookie } from '@/lib/auth';
import { apiOk, apiError } from '@/lib/services/api/api-response';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refresh')?.value;
    if (!refreshToken) {
      return apiError('UNAUTHORIZED', 'Refresh token missing');
    }
    const payload = verifyRefresh(refreshToken) as { accountId?: string } | null;
    if (!payload || typeof payload.accountId !== 'string') {
      return apiError('UNAUTHORIZED', 'Invalid refresh token');
    }
    // Issue new JWT
    const newJwt = signJwt({ accountId: payload.accountId });
    if (!newJwt) {
      return apiError('SERVER_ERROR', 'Failed to create JWT');
    }
    // Optionally rotate refresh token
    const newRefresh = signRefresh({ accountId: payload.accountId });
    const res = NextResponse.json({});
    createJwtCookie(res, newJwt);
    if (newRefresh) createRefreshCookie(res, newRefresh);
    return res;
  } catch (e) {
    return apiError('SERVER_ERROR', 'Internal server error');
  }
}
