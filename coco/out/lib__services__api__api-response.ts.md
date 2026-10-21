# lib/services/api/api-response.ts
lines:48 exports:mapErrorCodeToStatus,apiOk,apiError
---
import { NextResponse } from 'next/server';
import { ActionErrorCode } from '@/lib/types';

export function mapErrorCodeToStatus(code: string): number {
  switch (code) {
    case 'VALIDATION_ERROR':
    case 'INVALID':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    case 'RATE_LIMITED':
      return 429;
    case 'NOT_ALLOWED':
      return 403;
    case 'SERVER_ERROR':
    case 'UNKNOWN_ERROR':
    default:
      return 500;
  }
}

export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(
  code: ActionErrorCode | string,
  message: string,
  details?: unknown,
  statusOverride?: number
): NextResponse {
  const status = statusOverride ?? mapErrorCodeToStatus(code);
  return NextResponse.json(
    {
      success: false,
      error: {
