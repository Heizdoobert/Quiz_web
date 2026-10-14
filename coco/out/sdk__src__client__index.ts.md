# sdk/src/client/index.ts
lines:111 exports:
---
// Client & HTTP
export { QuickQuizClient, createClient } from './client';
export type { QuickQuizClientOptions } from './client';
export {
  HttpClient,
  setDefaultClient,
  getDefaultClient,
  isClient,
} from './http';
export type { HttpClientOptions, RequestOptions, ClientLike } from './http';

// Errors
export { QuickQuizError } from '../errors';

// Data contracts & types
export * from '../types';

// Auth
export {
  AuthResource,
  signUp,
  signIn,
  signInWithGoogle,
  requestEmailCode,
  verifyEmailCode,
  getSession,
  session,
  signOut,
} from './auth';

// Questions
export {
  QuestionsResource,
  getRandomQuestion,
  randomQuestion,
  getQuestionById,
  getQuestion,
  getQuestionCount,
  countQuestions,
  createQuestion,
