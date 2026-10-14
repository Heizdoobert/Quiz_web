# sdk/shared_modules/tests/index.test.ts
lines:102 exports:
---
import { describe, expect, it } from 'vitest';
import {
  isActionResult,
  isClientQuestion,
  isLeaderboardEntry,
  isQuestion,
  isQuizResult,
  isUserStats,
  validateCreateQuestionInput,
} from '../src';

describe('@quizweb/sdk-core', () => {
  it('validates correct Question input', () => {
    const valid = validateCreateQuestionInput({
      prompt: 'What is 2 + 2?',
      options: ['3', '4', '5'],
      correctIndex: 1,
    });
    expect(valid.valid).toBe(true);
    expect(valid.errors).toHaveLength(0);
  });

  it('rejects invalid Question input', () => {
    const invalid = validateCreateQuestionInput({
      prompt: '',
      options: ['only one option'],
      correctIndex: 5,
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });

  it('correctly identifies valid Question object with type guard', () => {
    const q = {
      id: 'q1',
      category: 'Math',
      prompt: 'What is 1 + 1?',
      options: ['1', '2'],
      correct_index: 1,
      explanation: null,
