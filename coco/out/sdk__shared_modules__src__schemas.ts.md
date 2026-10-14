# sdk/shared_modules/src/schemas.ts
lines:193 exports:isQuestion,isClientQuestion,isQuizResult,isUserStats,isLeaderboardEntry,isActionResult,ValidationOutcome,validateCreateQuestionInput,QuestionJsonSchema,CreateQuestionInputJsonSchema,QuizResultJsonSchema
---
import type {
  ActionResult,
  ClientQuestion,
  CreateQuestionInput,
  LeaderboardEntry,
  Question,
  QuizResult,
  UserStats,
} from './types';

// ==========================================
// Runtime Type Guards
// ==========================================

export function isQuestion(val: unknown): val is Question {
  if (!val || typeof val !== 'object') return false;
  const q = val as Record<string, unknown>;
  return (
    typeof q.id === 'string' &&
    typeof q.category === 'string' &&
    typeof q.prompt === 'string' &&
    Array.isArray(q.options) &&
    typeof q.correct_index === 'number' &&
    typeof q.created_at === 'string'
  );
}

export function isClientQuestion(val: unknown): val is ClientQuestion {
  if (!val || typeof val !== 'object') return false;
  const q = val as Record<string, unknown>;
  return (
    typeof q.id === 'string' &&
    typeof q.category === 'string' &&
    typeof q.prompt === 'string' &&
    Array.isArray(q.options)
  );
}

export function isQuizResult(val: unknown): val is QuizResult {
  if (!val || typeof val !== 'object') return false;
