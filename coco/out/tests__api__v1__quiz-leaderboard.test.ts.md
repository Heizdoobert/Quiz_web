# tests/api/v1/quiz-leaderboard.test.ts
lines:384 exports:
---
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as submitAnswerRoute } from '@/app/api/v1/quiz/answer/route';
import { GET as getHistoryRoute } from '@/app/api/v1/quiz/history/route';
import { GET as getStatsRoute } from '@/app/api/v1/quiz/stats/route';
import { GET as getGlobalLeaderboardRoute } from '@/app/api/v1/leaderboard/route';
import { GET as getGroupLeaderboardRoute } from '@/app/api/v1/leaderboard/group/[id]/route';

import { submitAnswer, getAnswerHistory, getUserStats } from '@/lib/actions/quiz-actions';
import { getGlobalLeaderboard, getGroupLeaderboard } from '@/lib/actions/leaderboard-actions';
import { issueMobileAuthToken } from '@/lib/services/mobile-auth';

vi.mock('@/lib/actions/quiz-actions', () => ({
  submitAnswer: vi.fn(),
  getAnswerHistory: vi.fn(),
  getUserStats: vi.fn(),
}));

vi.mock('@/lib/actions/leaderboard-actions', () => ({
  getGlobalLeaderboard: vi.fn(),
  getGroupLeaderboard: vi.fn(),
}));

function post(url: string, body?: unknown, token?: string, rawBody?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: rawBody !== undefined ? rawBody : JSON.stringify(body),
  });
}

function get(url: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new NextRequest(url, {
    method: 'GET',
    headers,
  });
