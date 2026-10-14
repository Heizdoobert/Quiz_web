# lib/actions/question-actions.ts
lines:330 exports:createQuestion,fetchRandomQuestion,getTopics,getPublicQuestion,disputeQuestion,getQuestionCount,get5050EliminatedIndices,generateQuestion
---
'use server';

import {
  answerKey, countDisputes, countQuestions, countQuestionsByAuthorSince, insertDispute,
  insertQuestion, listPublicQuestions, publicQuestion, setDisputeState,
} from '@/lib/db/questions';
import { hasRecordedAnswer } from '@/lib/db/results';
import { incrementAiGeneration, topics } from '@/lib/db/rpc';
import { getSessionAccount, SessionAccount } from '@/lib/services/session';
import { ClientQuestion } from '@/lib/types';
import { isUuid, validateQuestionInput } from '@/lib/utils/validation';
import { gemini } from '@/lib/sdk/gemini';

const MAX_DISPUTE_REASON = 500;
const QUESTIONS_PER_DAY = 5;
const QUARANTINE_AT = 3;

import { ActionResult } from '@/lib/types';

import { logger } from '@/lib/logger';

export async function createQuestion(
  params: {
    prompt: string;
    options: string[];
    correctIndex: number;
    category?: string;
    explanation?: string;
  },
  authAccount?: SessionAccount
): Promise<ActionResult> {
  try {
    const account = authAccount ?? (await getSessionAccount());
    if (!account) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sign in to add questions.' } };
    }

    const validated = validateQuestionInput(params);
    if (!validated.valid) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: validated.error } };
