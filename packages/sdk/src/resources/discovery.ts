import type { QuickQuizClient } from '../client';
import type { SearchResultPage, TopicInfo } from '../types';

export interface SearchOptions {
  limit?: number;
  offset?: number;
  page?: number;
}

export class DiscoveryResource {
  constructor(private readonly client: QuickQuizClient) {}

  /**
   * Search for questions matching keywords.
   */
  async search(
    queryOrOptions: string | ({ query: string } & SearchOptions),
    maybeOptions?: SearchOptions
  ): Promise<SearchResultPage> {
    const query =
      typeof queryOrOptions === 'string' ? queryOrOptions : queryOrOptions.query;
    const limit =
      typeof queryOrOptions === 'string' ? maybeOptions?.limit : queryOrOptions.limit;
    const offset =
      typeof queryOrOptions === 'string' ? maybeOptions?.offset : queryOrOptions.offset;
    const page =
      typeof queryOrOptions === 'string' ? maybeOptions?.page : queryOrOptions.page;

    return this.client.request<SearchResultPage>('/v1/search', {
      method: 'GET',
      query: {
        q: query,
        limit,
        offset,
        page,
      },
    });
  }

  /**
   * List all question topics with count and recent activity.
   */
  async topics(): Promise<TopicInfo[]> {
    return this.client.request<TopicInfo[]>('/v1/topics', {
      method: 'GET',
    });
  }

  /**
   * Get questions filed under a specific topic/category.
   */
  async topicQuestions(
    topicOrOptions: string | ({ topic: string } & SearchOptions),
    maybeOptions?: SearchOptions
  ): Promise<SearchResultPage> {
    const topic =
      typeof topicOrOptions === 'string' ? topicOrOptions : topicOrOptions.topic;
    const limit =
      typeof topicOrOptions === 'string' ? maybeOptions?.limit : topicOrOptions.limit;
    const offset =
      typeof topicOrOptions === 'string' ? maybeOptions?.offset : topicOrOptions.offset;
    const page =
      typeof topicOrOptions === 'string' ? maybeOptions?.page : topicOrOptions.page;

    return this.client.request<SearchResultPage>(
      `/v1/topics/${encodeURIComponent(topic)}/questions`,
      {
        method: 'GET',
        query: {
          limit,
          offset,
          page,
        },
      }
    );
  }
}
