import type { QuickQuizClient } from '../client';
import type { DiscussionView, SuggestionView } from '../types';

export class CommunityResource {
  constructor(private readonly client: QuickQuizClient) {}

  /**
   * Submit a 1-5 star rating for a question. Requires authentication and prior answer.
   */
  async rate(
    questionIdOrParams: string | { questionId: string; rating: number },
    maybeRating?: number
  ): Promise<{ ok: boolean }> {
    const questionId =
      typeof questionIdOrParams === 'string'
        ? questionIdOrParams
        : questionIdOrParams.questionId;
    const rating =
      typeof questionIdOrParams === 'string'
        ? (maybeRating ?? 0)
        : questionIdOrParams.rating;

    return this.client.request<{ ok: boolean }>(
      `/v1/questions/${encodeURIComponent(questionId)}/rate`,
      {
        method: 'POST',
        body: { rating },
      }
    );
  }

  /**
   * Post a comment or suggestion on a question. Requires authentication and prior answer.
   */
  async comment(
    questionIdOrParams:
      | string
      | { questionId: string; body: string; kind?: 'comment' | 'suggestion' },
    maybeBody?: string,
    maybeKind?: 'comment' | 'suggestion'
  ): Promise<{ ok: boolean }> {
    let questionId: string;
    let body: string;
    let kind: 'comment' | 'suggestion' = 'comment';

    if (typeof questionIdOrParams === 'string') {
      questionId = questionIdOrParams;
      body = maybeBody ?? '';
      if (maybeKind) {
        kind = maybeKind;
      }
    } else {
      questionId = questionIdOrParams.questionId;
      body = questionIdOrParams.body;
      if (questionIdOrParams.kind) {
        kind = questionIdOrParams.kind;
      }
    }

    return this.client.request<{ ok: boolean }>(
      `/v1/questions/${encodeURIComponent(questionId)}/comment`,
      {
        method: 'POST',
        body: { body, kind },
      }
    );
  }

  /**
   * Delete a comment authored by the current user. Requires authentication.
   */
  async deleteComment(
    commentIdOrParams: string | { commentId: string }
  ): Promise<{ ok: boolean }> {
    const commentId =
      typeof commentIdOrParams === 'string'
        ? commentIdOrParams
        : commentIdOrParams.commentId;

    return this.client.request<{ ok: boolean }>(
      `/v1/comments/${encodeURIComponent(commentId)}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Mark a question suggestion as resolved. Requires authentication and question authorship.
   */
  async resolveSuggestion(
    suggestionIdOrParams: string | { suggestionId: string }
  ): Promise<{ ok: boolean }> {
    const suggestionId =
      typeof suggestionIdOrParams === 'string'
        ? suggestionIdOrParams
        : suggestionIdOrParams.suggestionId;

    return this.client.request<{ ok: boolean }>(
      `/v1/suggestions/${encodeURIComponent(suggestionId)}/resolve`,
      {
        method: 'POST',
      }
    );
  }

  /**
   * Get ratings and comments discussion for a question.
   */
  async discussion(
    questionIdOrParams: string | { questionId: string; page?: number },
    maybeOptions?: { page?: number }
  ): Promise<DiscussionView> {
    const questionId =
      typeof questionIdOrParams === 'string'
        ? questionIdOrParams
        : questionIdOrParams.questionId;
    const page =
      typeof questionIdOrParams === 'string'
        ? maybeOptions?.page
        : questionIdOrParams.page;

    return this.client.request<DiscussionView>(
      `/v1/questions/${encodeURIComponent(questionId)}/discussion`,
      {
        method: 'GET',
        query: { page },
      }
    );
  }

  /**
   * Get pending suggestions on questions authored by the current user. Requires authentication.
   */
  async suggestions(): Promise<SuggestionView[]> {
    return this.client.request<SuggestionView[]>('/v1/suggestions', {
      method: 'GET',
    });
  }
}
