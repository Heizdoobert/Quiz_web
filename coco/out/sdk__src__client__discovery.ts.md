# sdk/src/client/discovery.ts
lines:164 exports:SearchOptions,searchQuestions,search,getTopics,getTopicQuestions,DiscoveryResource
---
import { isClient, getDefaultClient, type ClientLike } from './http';
import type { QuickQuizClient } from './client';
import type { SearchResultPage, TopicInfo } from '../types';

export interface SearchOptions {
  limit?: number;
  offset?: number;
  page?: number;
  client?: ClientLike;
}

/**
 * Search for questions matching keywords.
 */
export async function searchQuestions(
  clientOrQuery: ClientLike | string | ({ query: string } & SearchOptions),
  queryOrOptions?: string | ({ query: string } & SearchOptions) | SearchOptions,
  maybeOptions?: SearchOptions
): Promise<SearchResultPage> {
  let client: ClientLike;
  let query = '';
  let limit: number | undefined;
  let offset: number | undefined;
  let page: number | undefined;

  if (isClient(clientOrQuery)) {
    client = clientOrQuery;
    if (typeof queryOrOptions === 'string') {
      query = queryOrOptions;
      limit = maybeOptions?.limit;
      offset = maybeOptions?.offset;
      page = maybeOptions?.page;
    } else if (queryOrOptions) {
      query = (queryOrOptions as { query: string }).query;
      limit = queryOrOptions.limit;
      offset = queryOrOptions.offset;
      page = queryOrOptions.page;
    }
  } else if (typeof clientOrQuery === 'string') {
    client = (queryOrOptions as SearchOptions)?.client ?? getDefaultClient();
