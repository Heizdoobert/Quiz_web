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
  category: 'General',
  prompt: 'What is Base?',
  options: ['A rollup', 'A coin', 'A wallet', 'A bridge'],
};

async function renderWith(result: AnswerSubmissionResult) {
  await act(async () => {
    render(<AnswerBack question={QUESTION} result={result} onNext={vi.fn()} />);
  });
}

describe('AnswerBack', () => {
  it('claims the point only when the answer was actually recorded', async () => {
    await renderWith({ isCorrect: true, correctIndex: 0, explanation: null, recorded: true });
    expect(screen.getByText('+1 Score point')).toBeDefined();
  });

  it('resets the streak message on a recorded wrong answer', async () => {
    await renderWith({ isCorrect: false, correctIndex: 0, explanation: null, recorded: true });
    expect(screen.getByText('Streak reset to 0')).toBeDefined();
  });

  it('tells a signed-out player to sign in instead of claiming a point', async () => {
    await renderWith({ isCorrect: true, correctIndex: 0, explanation: null, recorded: false, notSavedReason: 'signed-out' });
    expect(screen.getByText('Sign in so this counts.')).toBeDefined();
    expect(screen.queryByText('+1 Score point')).toBeNull();
  });

  it('tells a player a repeat answer only counts once', async () => {
    await renderWith({ isCorrect: true, correctIndex: 0, explanation: null, recorded: false, notSavedReason: 'already-answered' });
    expect(screen.getByText('Already answered — this one only counts once.')).toBeDefined();
  });

  it("tells the question's own author it doesn't count for them", async () => {
    await renderWith({ isCorrect: true, correctIndex: 0, explanation: null, recorded: false, notSavedReason: 'own-question' });
    expect(screen.getByText("You wrote this question, so it doesn't count for you.")).toBeDefined();
  });

  it('shows a generic not-saved message on an unexpected save failure', async () => {
    await renderWith({ isCorrect: true, correctIndex: 0, explanation: null, recorded: false, notSavedReason: 'error' });
    expect(screen.getByText('Not saved — something went wrong, try again.')).toBeDefined();
  });
});

