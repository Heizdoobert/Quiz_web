import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ToastProvider } from '../components/ui/Toast';
import { useToast } from '@/hooks/shared/use-toast';
import { EmailTab } from '../components/auth/tabs/EmailTab';
import { UsernameTab } from '../components/auth/tabs/UsernameTab';
import { QuestionOptionsInput } from '../components/quiz/QuestionOptionsInput';
import AnswerBack from '../components/quiz/AnswerBack';
import { requestEmailCode, verifyEmailCode, signInWithUsername } from '../lib/actions/auth-actions';
import type { AnswerSubmissionResult, ClientQuestion } from '../lib/types';

vi.mock('../lib/actions/auth-actions', () => ({
  requestEmailCode: vi.fn(),
  verifyEmailCode: vi.fn(),
  signInWithUsername: vi.fn(),
  signUpWithUsername: vi.fn(),
}));
vi.mock('../components/quiz/CommunityDiscussion', () => ({ CommunityDiscussion: () => null }));
vi.mock('../components/community/SocialShare', () => ({ SocialShare: () => null }));

beforeEach(() => vi.resetAllMocks());

describe('toasts', () => {
  function Trigger() {
    const toast = useToast();
    return (
      <>
        <button onClick={() => toast.error('Boom')}>fail</button>
        <button onClick={() => toast.success('Saved')}>ok</button>
      </>
    );
  }

  it('announces toasts and names the dismiss button', async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    expect(screen.getByRole('region', { name: 'Notifications' })).toBeTruthy();

    fireEvent.click(screen.getByText('fail'));
    fireEvent.click(screen.getByText('ok'));

    expect((await screen.findByRole('alert')).textContent).toContain('Boom');
    expect(screen.getByRole('status').textContent).toContain('Saved');
    expect(screen.getAllByRole('button', { name: 'Dismiss notification' })).toHaveLength(2);
  });
});

describe('email sign-in form', () => {
  it('labels the email and code inputs and announces a wrong code', async () => {
    (requestEmailCode as ReturnType<typeof vi.fn>).mockResolvedValue({ sent: true });
    (verifyEmailCode as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    render(<EmailTab onSuccess={vi.fn()} refresh={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'a@b.co' } });
    fireEvent.click(screen.getByText('Send code'));

    fireEvent.change(await screen.findByLabelText('6-digit code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText('Verify'));

    expect((await screen.findByRole('alert')).textContent).toContain('Wrong or expired code');
  });
});

describe('username sign-in form', () => {
  it('labels both inputs and announces a failed sign-in', async () => {
    (signInWithUsername as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, error: 'Wrong username or password.' });
    render(<UsernameTab mode="login" onSuccess={vi.fn()} refresh={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'champ' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Wrong username or password.'));
  });
});

describe('question options input', () => {
  it('names each option text box and each correct-answer radio', () => {
    render(
      <QuestionOptionsInput options={['', '', '', '']} correctIndex={0} onOptionChange={vi.fn()} onCorrectIndexChange={vi.fn()} />
    );
    for (const letter of ['A', 'B', 'C', 'D']) {
      expect(screen.getByLabelText(`Option ${letter} text`)).toBeTruthy();
      expect(screen.getByLabelText(`Mark option ${letter} as correct`)).toBeTruthy();
    }
    expect(screen.getByRole('group', { name: /Answer Options/ })).toBeTruthy();
  });
});

describe('answer result', () => {
  it('announces whether the answer was correct', () => {
    const question = { id: 'q1', prompt: 'P', options: ['a', 'b', 'c', 'd'] } as unknown as ClientQuestion;
    const result = { isCorrect: true, correctIndex: 0, recorded: true } as AnswerSubmissionResult;
    render(<AnswerBack question={question} result={result} onNext={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain('Correct');
  });

  it('moves focus to the Next Question button', () => {
    const question = { id: 'q1', prompt: 'P', options: ['a', 'b', 'c', 'd'] } as unknown as ClientQuestion;
    const result = { isCorrect: false, correctIndex: 1, recorded: true } as AnswerSubmissionResult;
    render(<AnswerBack question={question} result={result} onNext={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Next Question/ }));
  });
});
