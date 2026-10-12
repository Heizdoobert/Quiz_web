import { QuickQuizClient, type QuickQuizClientOptions } from '@heizdoobert/quickquiz-sdk';
import { getSiteUrl } from '@/lib/utils/site-url';

export function getSdk(options?: Partial<QuickQuizClientOptions>): QuickQuizClient {
  return new QuickQuizClient({
    baseUrl: `${getSiteUrl()}/api`,
    token: options?.token ?? null,
    fetch: options?.fetch ?? globalThis.fetch,
    ...options,
  });
}

export { QuickQuizClient, QuickQuizError } from '@heizdoobert/quickquiz-sdk';
export type { QuickQuizClientOptions } from '@heizdoobert/quickquiz-sdk';
