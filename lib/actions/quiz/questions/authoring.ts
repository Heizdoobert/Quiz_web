'use server';

import { countQuestionsByAuthorSince, insertQuestion } from '@/lib/db/questions';
import { incrementAiGeneration } from '@/lib/db/rpc';
import { logger } from '@/lib/logger';
import { gemini } from '@/lib/sdk/gemini';
import { getSessionAccount, SessionAccount } from '@/lib/services/auth/session';
import { ActionResult } from '@/lib/types';
import { validateQuestionInput } from '@/lib/utils/validation';

const QUESTIONS_PER_DAY = 5;

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
    }

    // New questions go live at once and are moderated by disputes, so cap how fast one account adds them.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    let count: number;
    try {
      count = await countQuestionsByAuthorSince(account.id, since);
    } catch (err) {
      logger.error('question_creation_rate_limit_check_failed', err, { userId: account.id });
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to add question.' } };
    }
    if (count >= QUESTIONS_PER_DAY) {
      logger.warn('question_creation_rate_limited', { userId: account.id, count });
      return { 
        success: false, 
        error: { 
          code: 'RATE_LIMITED', 
          message: `You can add up to ${QUESTIONS_PER_DAY} questions per day.` 
        } 
      };
    }

    // AI Moderation
    const { moderateContent } = await import('@/lib/services/moderation/ai-moderation');
    const modResult = await moderateContent(validated.prompt, validated.options);
    if (!modResult.isSafe) {
      logger.warn('question_creation_ai_rejected', { userId: account.id, reason: modResult.reason });
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Content rejected: ${modResult.reason || 'Inappropriate content detected'}`
        }
      };
    }

    try {
      await insertQuestion({
        prompt: validated.prompt,
        options: validated.options,
        correct_index: validated.correctIndex,
        category: validated.category,
        explanation: validated.explanation,
        created_by_user: account.id,
        status: 'verified',
        dispute_count: 0,
      });
    } catch (err) {
      logger.error('question_creation_db_insert_failed', err, { userId: account.id });
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to add question.' } };
    }

    logger.info('question_created', { userId: account.id, category: validated.category });
    return { success: true, data: undefined };
  } catch (err) {
    logger.error('question_creation_unexpected_error', err);
    return { success: false, error: { code: 'UNKNOWN_ERROR', message: 'Failed to add question.' } };
  }
}

export async function generateQuestion(
  topic: string,
  authAccount?: SessionAccount
): Promise<ActionResult<{
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}>> {
  try {
    const account = authAccount ?? (await getSessionAccount());
    if (!account) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sign in to generate questions.' } };
    }

    const countData = await incrementAiGeneration(account.id);

    if (countData > 3) {
      return { success: false, error: { code: 'RATE_LIMITED', message: 'You have reached the limit of 3 AI generations per day.' } };
    }

    const ai = gemini();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate a trivia question about "${topic}". Respond in strict JSON format matching this schema exactly without markdown formatting:
{
  "prompt": "The question text",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correctIndex": 0,
  "explanation": "Brief explanation of the correct answer"
}`,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
    });

    const text = response.text;
    if (!text) throw new Error('Empty response from AI');

    const result = JSON.parse(text);
    return { success: true, data: result };
  } catch (err) {
    logger.error('generate_question_failed', err);
    return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate question.' } };
  }
}
