# tests/wallet-auth-sync.test.tsx
lines:548 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { useQuizLogic } from '../hooks/quiz/use-quiz-logic';
import { SessionProvider, useSession } from '../hooks/shared/use-session';
import { useQuizAuth } from '../hooks/shared/use-quiz-auth';
import { useAccount } from 'wagmi';
import { getSessionInfo, getSignedInWallet, signOutWallet } from '../lib/actions/auth-actions';
import { getUserStats, getAnswerHistory } from '../lib/actions/quiz-actions';
import { getClaimableRewards } from '../lib/actions/reward-actions';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}));

vi.mock('../lib/actions/auth-actions', () => ({
  getSessionInfo: vi.fn(),
  getSignedInWallet: vi.fn(),
  signOutWallet: vi.fn(),
  getAuthNonce: vi.fn().mockResolvedValue('test-nonce'),
}));

vi.mock('../lib/actions/quiz-actions', () => ({
  getUserStats: vi.fn(),
  getAnswerHistory: vi.fn(),
  submitAnswer: vi.fn(),
}));

vi.mock('../lib/actions/reward-actions', () => ({
  getClaimableRewards: vi.fn(),
}));

vi.mock('../lib/actions/question-actions', () => ({
  fetchRandomQuestion: vi.fn().mockResolvedValue(null),
  get5050EliminatedIndices: vi.fn().mockResolvedValue([]),
}));

vi.mock('../lib/actions/leaderboard-actions', () => ({
  getGlobalLeaderboard: vi.fn().mockResolvedValue([]),
  getGroupLeaderboard: vi.fn().mockResolvedValue([]),
