# sdk/src/client/http.ts
lines:295 exports:HttpClientOptions,RequestOptions,ClientLike,setDefaultClient,getDefaultClient,isClient,HttpClient
---
import { QuickQuizError } from '../errors';

export interface HttpClientOptions {
  baseUrl: string;
  token?: string | null;
  fetch?: typeof globalThis.fetch;
  timeout?: number;
  retries?: number;
}

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string> | HeadersInit;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null | Array<string | number>>;
  query?: Record<string, string | number | boolean | undefined | null | Array<string | number>>;
  signal?: AbortSignal;
  timeout?: number;
  retries?: number;
}

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS']);
const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 504]);

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}
