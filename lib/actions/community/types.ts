export type CommunityResult =
  | { ok: true }
  | {
      ok: false;
      code: 'UNAUTHORIZED' | 'NOT_ANSWERED' | 'NOT_ALLOWED' | 'INVALID' | 'RATE_LIMITED' | 'FAILED';
    };

export interface RatingSummary {
  average: number;
  count: number;
}

export interface CommentView {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  isOwn: boolean;
  mine?: boolean;
}

export interface SuggestionView {
  id: string;
  questionId: string;
  prompt: string;
  questionPrompt?: string;
  body: string;
  senderName: string;
  createdAt: string;
  resolvedAt: string | null;
}
