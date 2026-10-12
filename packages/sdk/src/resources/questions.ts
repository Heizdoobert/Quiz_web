import type { QuickQuizClient } from '../client';
import type { ClientQuestion, CreateQuestionInput, GeneratedQuestion } from '../types';

export class QuestionsResource {
  constructor(private readonly client: QuickQuizClient) {}

  /**
   * Fetch a random question, optionally filtering by category and excluding question IDs.
   */
  async random(options?: {
    category?: string;
    exclude?: string[] | string;
  }): Promise<ClientQuestion | null> {
    return this.client.request<ClientQuestion | null>('/v1/questions/random', {
      method: 'GET',
      query: {
        category: options?.category,
        exclude: Array.isArray(options?.exclude) ? options.exclude.join(',') : options?.exclude,
      },
    });
  }

  /**
   * Retrieve a specific public question by ID.
   */
  async get(id: string): Promise<ClientQuestion> {
    return this.client.request<ClientQuestion>(`/v1/questions/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
  }

  /**
   * Get the total count of verified questions available in the system.
   */
  async count(): Promise<{ count: number }> {
    return this.client.request<{ count: number }>('/v1/questions/count', {
      method: 'GET',
    });
  }

  /**
   * Create a new question. Requires authentication.
   */
  async create(data: CreateQuestionInput): Promise<void> {
    return this.client.request<void>('/v1/questions', {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Generate a question on a given topic using AI. Requires authentication.
   */
  async generate(topicOrParams: string | { topic: string }): Promise<GeneratedQuestion> {
    const payload =
      typeof topicOrParams === 'string' ? { topic: topicOrParams } : topicOrParams;

    return this.client.request<GeneratedQuestion>('/v1/questions/generate', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Dispute/report a question. Requires authentication.
   */
  async dispute(
    idOrParams: string | { questionId: string; reason: string },
    maybeReason?: string | { reason: string }
  ): Promise<{ quarantined: boolean }> {
    let id: string;
    let reason: string;

    if (typeof idOrParams === 'string') {
      id = idOrParams;
      reason =
        typeof maybeReason === 'string'
          ? maybeReason
          : (maybeReason?.reason ?? '');
    } else {
      id = idOrParams.questionId;
      reason = idOrParams.reason;
    }

    return this.client.request<{ quarantined: boolean }>(
      `/v1/questions/${encodeURIComponent(id)}/dispute`,
      {
        method: 'POST',
        body: { reason },
      }
    );
  }

  /**
   * Retrieve the 50/50 lifeline eliminated answer indices for a question. Requires authentication.
   */
  async fiftyFifty(id: string): Promise<number[]> {
    return this.client.request<number[]>(`/v1/questions/${encodeURIComponent(id)}/5050`, {
      method: 'GET',
    });
  }
}
