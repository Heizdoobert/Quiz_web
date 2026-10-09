import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import ContestPlay from '../components/lists/ContestPlay';
import { ToastProvider } from '../components/ui/Toast';
import { startListAttempt } from '../lib/actions/question-list-actions';
import type { QuestionListWithMeta } from '../lib/types';

const { requireSignIn } = vi.hoisted(() => ({ requireSignIn: vi.fn() }));

vi.mock('../lib/actions/question-list-actions', () => ({
  startListAttempt: vi.fn(),
  completeListAttempt: vi.fn(),
}));
vi.mock('../lib/actions/quiz-actions', () => ({ submitAnswer: vi.fn() }));
vi.mock('../hooks/shared/use-session', () => ({
  useSession: () => ({ account: null, requireSignIn }),
}));
vi.mock('../components/lists/play/ContestPlayResult', () => ({ ContestPlayResult: () => null }));
vi.mock('../components/lists/play/ContestPlayQuestion', () => ({ ContestPlayQuestion: () => null }));

describe('ContestPlay start-up failure', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireSignIn.mockResolvedValue(true);
  });

  it('starts the attempt once and does not retry when the failure toast appears', async () => {
    (startListAttempt as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'Contest is closed.' });

    render(
      <ToastProvider>
        <ContestPlay list={{ id: 'list-1' } as QuestionListWithMeta} onExit={vi.fn()} />
      </ToastProvider>
    );

    await waitFor(() => expect(screen.getAllByText('Contest is closed.').length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 150));

    expect(startListAttempt).toHaveBeenCalledTimes(1);
  });
});
