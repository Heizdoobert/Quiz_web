export { createTokenVerifier, getBearerToken } from './verifier';
export type { QuickQuizAccount, TokenVerifier, TokenVerifierOptions } from './verifier';
export type { AuthOptions } from './authenticate';
export { withQuickQuizAuth } from './next';
export { quickQuizAuth } from './express';
export type { QuickQuizRequest, QuickQuizResponse } from './express';
// Re-exported so `instanceof` works against the copy of the class that `verify()` throws.
export { QuickQuizError } from '../errors';
