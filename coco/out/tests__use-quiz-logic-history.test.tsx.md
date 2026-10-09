# tests/use-quiz-logic-history.test.tsx
lines:71 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useQuizLogic } from '../hooks/quiz/use-quiz-logic';

vi.mock('wagmi', () => ({ useAccount: () => ({ address: '0x' + 'a'.repeat(40), isConnected: true }) }));
vi.mock('../hooks/shared/use-session', () => ({
  useSession: () => ({
    account: { id: 'acct-1', wallet: '0x' + 'a'.repeat(40) },
    refresh: vi.fn(),
    requireSignIn: vi.fn().mockResolvedValue(true),
  }),
}));
vi.mock('../lib/client/audio', () => ({
  soundEngine: { playFlip: vi.fn(), playCorrect: vi.fn(), playWrong: vi.fn(), playTick: vi.fn(), playPowerup: vi.fn() },
}));
vi.mock('../lib/actions/question-actions', () => ({
  fetchRandomQuestion: vi.fn().mockResolvedValue(null),
  get5050EliminatedIndices: vi.fn(),
}));
vi.mock('../lib/actions/leaderboard-actions', () => ({
  getGlobalLeaderboard: vi.fn().mockResolvedValue([]),
  getGroupLeaderboard: vi.fn().mockResolvedValue([]),
}));
vi.mock('../lib/actions/reward-actions', () => ({ getClaimableRewards: vi.fn().mockResolvedValue(null) }));

const getUserStats = vi.fn().mockResolvedValue({ score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 });
const getAnswerHistory = vi.fn();
const submitAnswer = vi.fn();
vi.mock('../lib/actions/quiz-actions', () => ({
  getUserStats: (...args: unknown[]) => getUserStats(...args),
  getAnswerHistory: (...args: unknown[]) => getAnswerHistory(...args),
  submitAnswer: (...args: unknown[]) => submitAnswer(...args),
}));

const withQuery = () => {
  const client = new QueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
