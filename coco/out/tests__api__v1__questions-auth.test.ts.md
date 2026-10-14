# tests/api/v1/questions-auth.test.ts
lines:472 exports:
---
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createQuestionRoute } from '@/app/api/v1/questions/route';
import { POST as generateQuestionRoute } from '@/app/api/v1/questions/generate/route';
import { POST as disputeQuestionRoute } from '@/app/api/v1/questions/[id]/dispute/route';
import { GET as get5050Route } from '@/app/api/v1/questions/[id]/5050/route';

import {
  createQuestion,
  generateQuestion,
  disputeQuestion,
  get5050EliminatedIndices,
} from '@/lib/actions/question-actions';
import { issueMobileAuthToken } from '@/lib/services/mobile-auth';

vi.mock('@/lib/actions/question-actions', () => ({
  createQuestion: vi.fn(),
  generateQuestion: vi.fn(),
  disputeQuestion: vi.fn(),
  get5050EliminatedIndices: vi.fn(),
}));

function post(url: string, body: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function get(url: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new NextRequest(url, {
    method: 'GET',
    headers,
  });
}
