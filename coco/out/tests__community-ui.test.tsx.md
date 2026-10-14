# tests/community-ui.test.tsx
lines:391 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AnswerBack from '../components/quiz/AnswerBack';
import RatingStars from '../components/community/RatingStars';
import CommentList from '../components/community/CommentList';
import SuggestionForm from '../components/community/SuggestionForm';
import AuthorSuggestions from '../components/community/AuthorSuggestions';
import { useSession } from '../hooks/shared/use-session';
import {
  getQuestionDiscussion,
  rateQuestion,
  addComment,
  deleteComment,
  getSuggestionsForAuthor,
  resolveSuggestion,
} from '../lib/actions/community-actions';
import { ClientQuestion, AnswerSubmissionResult } from '../lib/types';

vi.mock('../hooks/shared/use-session', () => ({
  useSession: vi.fn(),
}));

vi.mock('../lib/actions/community-actions', () => ({
  getQuestionDiscussion: vi.fn(),
  rateQuestion: vi.fn(),
  addComment: vi.fn(),
  deleteComment: vi.fn(),
  getSuggestionsForAuthor: vi.fn(),
  resolveSuggestion: vi.fn(),
}));

const mockQuestion: ClientQuestion = {
  id: '11111111-1111-4111-8111-111111111111',
  category: 'Blockchain',
  prompt: 'What is Ethereum?',
  options: ['A smart contract platform', 'A cryptocurrency only', 'A browser', 'An OS'],
  status: 'verified',
  created_by: '00000000-0000-4000-8000-000000000000',
};
