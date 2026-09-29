import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AnswerBack from '../components/quiz/AnswerBack';
import RatingStars from '../components/community/RatingStars';
import CommentList from '../components/community/CommentList';
import SuggestionForm from '../components/community/SuggestionForm';
import { useSession } from '../hooks/shared/use-session';
import {
  getQuestionDiscussion,
  rateQuestion,
  addComment,
  deleteComment,
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
}));

const mockQuestion: ClientQuestion = {
  id: '11111111-1111-4111-8111-111111111111',
  category: 'Blockchain',
  prompt: 'What is Ethereum?',
  options: ['A smart contract platform', 'A cryptocurrency only', 'A browser', 'An OS'],
  status: 'verified',
  created_by: '00000000-0000-4000-8000-000000000000',
};

const mockResult: AnswerSubmissionResult = {
  isCorrect: true,
  correctIndex: 0,
  explanation: 'Ethereum is a decentralized smart contract platform.',
  recorded: true,
};

describe('RatingStars', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders average rating and count for guests without tap-to-rate buttons', () => {
    render(
      <RatingStars
        questionId={mockQuestion.id}
        average={4.2}
        count={15}
        myRating={null}
        canRate={false}
      />
    );

    expect(screen.getByText('4.2')).toBeDefined();
    expect(screen.getByText('(15)')).toBeDefined();
    expect(screen.queryByRole('button', { name: /rate \d star/i })).toBeNull();
  });

  it('renders interactive star buttons for signed-in players and calls rateQuestion', async () => {
    (rateQuestion as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    const onRated = vi.fn();

    render(
      <RatingStars
        questionId={mockQuestion.id}
        average={4.0}
        count={5}
        myRating={null}
        canRate={true}
        onRated={onRated}
      />
    );

    const star5 = screen.getByRole('button', { name: /rate 5 stars/i });
    expect(star5).toBeDefined();

    fireEvent.click(star5);

    await waitFor(() => {
      expect(rateQuestion).toHaveBeenCalledWith(mockQuestion.id, 5);
      expect(onRated).toHaveBeenCalledWith(5);
    });
  });
});

describe('CommentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders comments and plain text without executing or parsing HTML/scripts', () => {
    const maliciousComment = {
      id: 'c1',
      authorName: 'Attacker',
      body: "<script>alert('xss')</script><b>bold test</b>",
      createdAt: new Date().toISOString(),
      isOwn: false,
    };

    render(
      <CommentList
        questionId={mockQuestion.id}
        comments={[maliciousComment]}
        canComment={false}
      />
    );

    // Plain text is rendered verbatim as text node
    expect(
      screen.getByText("<script>alert('xss')</script><b>bold test</b>")
    ).toBeDefined();
    // Verify no actual <b> element was rendered for the comment body
    expect(document.querySelector('b')).toBeNull();
  });

  it('shows "Sign in to rate and comment" in place of inputs for guests', () => {
    const onRequireSignIn = vi.fn();
    render(
      <CommentList
        questionId={mockQuestion.id}
        comments={[]}
        canComment={false}
        requireSignIn={onRequireSignIn}
      />
    );

    expect(screen.getByText(/sign in to rate and comment/i)).toBeDefined();
    expect(screen.queryByPlaceholderText(/add a comment/i)).toBeNull();

    fireEvent.click(screen.getByText(/sign in to rate and comment/i));
    expect(onRequireSignIn).toHaveBeenCalled();
  });

  it('allows signed-in players to post a comment and tracks 500-char counter', async () => {
    (addComment as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    const onCommentAdded = vi.fn();

    render(
      <CommentList
        questionId={mockQuestion.id}
        comments={[]}
        canComment={true}
        onCommentAdded={onCommentAdded}
      />
    );

    const textarea = screen.getByPlaceholderText(/add a comment/i);
    expect(screen.getByText('0/500')).toBeDefined();

    fireEvent.change(textarea, { target: { value: 'Great question on Ethereum!' } });
    expect(screen.getByText('27/500')).toBeDefined();

    const submitBtn = screen.getByRole('button', { name: /comment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(addComment).toHaveBeenCalledWith(
        mockQuestion.id,
        'Great question on Ethereum!',
        'comment'
      );
      expect(onCommentAdded).toHaveBeenCalled();
    });
  });

  it('allows deleting own comment and calls deleteComment', async () => {
    (deleteComment as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    const onCommentDeleted = vi.fn();

    const comments = [
      {
        id: 'c-own',
        authorName: 'Me',
        body: 'My own comment',
        createdAt: new Date().toISOString(),
        isOwn: true,
      },
      {
        id: 'c-other',
        authorName: 'OtherUser',
        body: 'Someone elses comment',
        createdAt: new Date().toISOString(),
        isOwn: false,
      },
    ];

    render(
      <CommentList
        questionId={mockQuestion.id}
        comments={comments}
        canComment={true}
        onCommentDeleted={onCommentDeleted}
      />
    );

    const deleteBtns = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteBtns).toHaveLength(1);

    fireEvent.click(deleteBtns[0]);

    await waitFor(() => {
      expect(deleteComment).toHaveBeenCalledWith('c-own');
      expect(onCommentDeleted).toHaveBeenCalledWith('c-own');
    });
  });
});

describe('SuggestionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens short form on clicking "Suggest a fix to the author" and submits suggestion', async () => {
    (addComment as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    render(<SuggestionForm questionId={mockQuestion.id} />);

    const openBtn = screen.getByRole('button', { name: /suggest a fix to the author/i });
    expect(openBtn).toBeDefined();

    // Form is not visible yet
    expect(screen.queryByPlaceholderText(/suggest a correction/i)).toBeNull();

    fireEvent.click(openBtn);

    // Form is visible
    const textarea = screen.getByPlaceholderText(/suggest a correction/i);
    expect(textarea).toBeDefined();

    fireEvent.change(textarea, { target: { value: 'Typo in option A, please review.' } });
    const sendBtn = screen.getByRole('button', { name: /send suggestion/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(addComment).toHaveBeenCalledWith(
        mockQuestion.id,
        'Typo in option A, please review.',
        'suggestion'
      );
    });

    expect(await screen.findByText(/suggestion sent/i)).toBeDefined();
  });
});

describe('AnswerBack Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders rating, comments, and suggestion link for signed in players', async () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      account: { id: 'user-1', wallet: '0x123' },
      requireSignIn: vi.fn(),
    });

    (getQuestionDiscussion as ReturnType<typeof vi.fn>).mockResolvedValue({
      rating: { average: 4.5, count: 8 },
      myRating: null,
      comments: [
        {
          id: 'c1',
          authorName: 'Alice',
          body: 'Loved this question!',
          createdAt: new Date().toISOString(),
          isOwn: false,
        },
      ],
      hasMore: false,
    });

    render(
      <AnswerBack
        question={mockQuestion}
        result={mockResult}
        onNext={vi.fn()}
      />
    );

    // Initial load of discussion
    await waitFor(() => {
      expect(getQuestionDiscussion).toHaveBeenCalledWith(mockQuestion.id);
    });

    expect(await screen.findByText('4.5')).toBeDefined();
    expect(screen.getByText('(8)')).toBeDefined();
    expect(screen.getByText('Loved this question!')).toBeDefined();
    expect(screen.getByPlaceholderText(/add a comment/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /suggest a fix to the author/i })).toBeDefined();
  });

  it('renders rating and comments without write inputs for guests', async () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      account: null,
      requireSignIn: vi.fn(),
    });

    (getQuestionDiscussion as ReturnType<typeof vi.fn>).mockResolvedValue({
      rating: { average: 3.8, count: 4 },
      myRating: null,
      comments: [
        {
          id: 'c2',
          authorName: 'Bob',
          body: 'Interesting fact.',
          createdAt: new Date().toISOString(),
          isOwn: false,
        },
      ],
      hasMore: false,
    });

    render(
      <AnswerBack
        question={mockQuestion}
        result={mockResult}
        onNext={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(getQuestionDiscussion).toHaveBeenCalledWith(mockQuestion.id);
    });

    expect(await screen.findByText('3.8')).toBeDefined();
    expect(screen.getByText('(4)')).toBeDefined();
    expect(screen.getByText('Interesting fact.')).toBeDefined();

    // Guest sees "Sign in to rate and comment", no textboxes or suggestion form
    expect(screen.getByText(/sign in to rate and comment/i)).toBeDefined();
    expect(screen.queryByPlaceholderText(/add a comment/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /suggest a fix to the author/i })).toBeNull();
  });
});
