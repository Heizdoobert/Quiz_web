# sdk/src/server/verifier.ts
lines:75 exports:QuickQuizAccount,TokenVerifier,TokenVerifierOptions,createTokenVerifier
---
import { HttpClient } from '../client/http';
import { QuickQuizError } from '../errors';
import type { AuthSession } from '../types';

/** The account behind a token, exactly what `GET /v1/auth/session` returns. */
export type QuickQuizAccount = AuthSession;

export interface TokenVerifier {
  /** Resolves the account for a Bearer token, or `null` if Quick Quiz rejects it. Throws if Quick Quiz cannot answer. */
  verify(token: string): Promise<QuickQuizAccount | null>;
}

export interface TokenVerifierOptions {
  /**
   * Same `baseUrl` as `QuickQuizClient`: requests go to `${baseUrl}/v1/auth/session`,
   * so against a real deployment it ends in `/api` (e.g. `https://quickquiz.app/api`).
   */
  baseUrl: string;
  /** How long a verdict is reused, in milliseconds. Default 30000. */
  ttlMs?: number;
  /** Most verdicts kept in memory; the oldest is dropped first. Default 1000. */
  maxEntries?: number;
  fetch?: typeof globalThis.fetch;
}

const SESSION_PATH = '/v1/auth/session';

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function isAccount(value: unknown): value is QuickQuizAccount {
  const v = value as Partial<QuickQuizAccount> | null;
  return typeof v?.id === 'string' && typeof v?.username === 'string';
}

/**
 * Verifies tokens by asking Quick Quiz, caching each verdict in memory.
 * A 401 is a verdict (cached as `null`). Network errors, 429 and 5xx are not: they throw and are never cached.
