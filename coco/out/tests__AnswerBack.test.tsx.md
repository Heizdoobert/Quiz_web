# tests/AnswerBack.test.tsx
lines:72 exports:
---
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import AnswerBack from '../components/quiz/AnswerBack';
import { AnswerSubmissionResult, ClientQuestion } from '../lib/types';

vi.mock('../hooks/shared/use-session', () => ({
  useSession: () => ({
    account: null,
    refresh: vi.fn(),
    requireSignIn: vi.fn(),
  }),
}));

vi.mock('../lib/actions/community-actions', () => ({
  getQuestionDiscussion: vi.fn().mockResolvedValue({
    rating: { average: 0, count: 0 },
    myRating: null,
    comments: [],
    hasMore: false,
  }),
  rateQuestion: vi.fn(),
  addComment: vi.fn(),
  deleteComment: vi.fn(),
}));

const QUESTION: ClientQuestion = {
  id: 'q1',
  category: 'Web3',
  prompt: 'What is Base?',
  options: ['A rollup', 'A coin', 'A wallet', 'A bridge'],
};

async function renderWith(result: AnswerSubmissionResult) {
  await act(async () => {
    render(<AnswerBack question={QUESTION} result={result} onNext={vi.fn()} />);
  });
}

describe('AnswerBack', () => {
