# tests/a11y-names-and-announcements.test.tsx
lines:108 exports:
---
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
