import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import AnswerBack from '../components/quiz/AnswerBack';
import { AnswerSubmissionResult, ClientQuestion } from '../lib/types';

const QUESTION: ClientQuestion = {
  id: 'q1',
  category: 'Web3',
  prompt: 'What is Base?',
  options: ['A rollup', 'A coin', 'A wallet', 'A bridge'],
};

function renderWith(result: AnswerSubmissionResult) {
  render(<AnswerBack question={QUESTION} result={result} onNext={vi.fn()} />);
}

describe('AnswerBack', () => {
  it('claims the point only when the answer was actually recorded', () => {
    renderWith({ isCorrect: true, correctIndex: 0, explanation: null, recorded: true });
    expect(screen.getByText('+1 Score point & tokens earned')).toBeDefined();
  });

  it('resets the streak message on a recorded wrong answer', () => {
    renderWith({ isCorrect: false, correctIndex: 0, explanation: null, recorded: true });
    expect(screen.getByText('Streak reset to 0')).toBeDefined();
  });

  it('tells a signed-out player to sign in instead of claiming a point', () => {
    renderWith({ isCorrect: true, correctIndex: 0, explanation: null, recorded: false, notSavedReason: 'signed-out' });
    expect(screen.getByText('Sign in with your wallet so this counts.')).toBeDefined();
    expect(screen.queryByText('+1 Score point & tokens earned')).toBeNull();
  });

  it('tells a player a repeat answer only counts once', () => {
    renderWith({ isCorrect: true, correctIndex: 0, explanation: null, recorded: false, notSavedReason: 'already-answered' });
    expect(screen.getByText('Already answered — this one only counts once.')).toBeDefined();
  });

  it("tells the question's own author it doesn't count for them", () => {
    renderWith({ isCorrect: true, correctIndex: 0, explanation: null, recorded: false, notSavedReason: 'own-question' });
    expect(screen.getByText("You wrote this question, so it doesn't count for you.")).toBeDefined();
  });

  it('shows a generic not-saved message on an unexpected save failure', () => {
    renderWith({ isCorrect: true, correctIndex: 0, explanation: null, recorded: false, notSavedReason: 'error' });
    expect(screen.getByText('Not saved — something went wrong, try again.')).toBeDefined();
  });
});
