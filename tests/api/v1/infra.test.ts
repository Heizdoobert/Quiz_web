import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { apiOk, apiError, mapErrorCodeToStatus } from '@/lib/services/api-response';
import { extractBearerToken, requireAuth, optionalAuth } from '@/lib/services/api-auth';
import * as mobileAuth from '@/lib/services/mobile-auth';

describe('API Infrastructure Helpers', () => {
  it('maps error codes to appropriate HTTP status codes', () => {
    expect(mapErrorCodeToStatus('VALIDATION_ERROR')).toBe(400);
    expect(mapErrorCodeToStatus('UNAUTHORIZED')).toBe(401);
    expect(mapErrorCodeToStatus('NOT_FOUND')).toBe(404);
    expect(mapErrorCodeToStatus('CONFLICT')).toBe(409);
    expect(mapErrorCodeToStatus('RATE_LIMITED')).toBe(429);
    expect(mapErrorCodeToStatus('SERVER_ERROR')).toBe(500);
    expect(mapErrorCodeToStatus('UNKNOWN_ERROR')).toBe(500);
  });

  it('apiOk returns 200 with standard envelope', async () => {
    const res = apiOk({ test: 123 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true, data: { test: 123 } });
  });

  it('apiError returns mapped status and error envelope', async () => {
    const res = apiError('UNAUTHORIZED', 'Please log in');
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Please log in' },
    });
  });

  it('extractBearerToken extracts token from header', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: 'Bearer test-token-123' },
    });
    expect(extractBearerToken(req)).toBe('test-token-123');
  });

  it('requireAuth rejects missing or invalid token', () => {
    const reqNoAuth = new NextRequest('http://localhost/api/test');
    const authResult = requireAuth(reqNoAuth);
    expect(authResult.ok).toBe(false);
    if (!authResult.ok) {
      expect(authResult.response.status).toBe(401);
    }
  });

  it('requireAuth accepts valid token', () => {
    vi.spyOn(mobileAuth, 'verifyMobileAuthToken').mockReturnValueOnce({
      id: 'acc-123',
    });
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: 'Bearer valid-jwt' },
    });
    const authResult = requireAuth(req);
    expect(authResult.ok).toBe(true);
    if (authResult.ok) {
      expect(authResult.account.id).toBe('acc-123');
    }
  });

  it('optionalAuth returns account when valid token present', () => {
    vi.spyOn(mobileAuth, 'verifyMobileAuthToken').mockReturnValueOnce({
      id: 'acc-456',
    });
    const req = new NextRequest('http://localhost/api/test', {
      headers: { Authorization: 'Bearer valid-jwt' },
    });
    const account = optionalAuth(req);
    expect(account).toEqual({ id: 'acc-456' });
  });

  it('optionalAuth returns null when no token present', () => {
    const req = new NextRequest('http://localhost/api/test');
    expect(optionalAuth(req)).toBeNull();
  });
});
