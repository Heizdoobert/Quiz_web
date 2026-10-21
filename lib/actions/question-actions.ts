'use server';

import {
  answerKey, countDisputes, countQuestions, countQuestionsByAuthorSince, insertDispute,
  insertQuestion, listPublicQuestions, publicQuestion, quarantineQuestion,
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

export async function fetchRandomQuestion(
  excludeIds: string[] = [],
  category?: string
): Promise<ClientQuestion | null> {
  try {
    const ids = (Array.isArray(excludeIds) ? excludeIds : []).filter(isUuid).slice(-200);
    const named = category && category !== 'All' ? category : undefined;
    // Each step falls back to a wider pool, so one failed read is logged and treated as empty.
    const list = (opts: Parameters<typeof listPublicQuestions>[0]) =>
      listPublicQuestions(opts).catch((err) => {
        logger.error('fetch_random_question_query_failed', err, { category });
        return [];
      });

    let data = await list({ excludeIds: ids, category: named, limit: 20 });
    if (data.length === 0 && named) {
      logger.info('fetch_random_question_fallback_triggered', { category, excludedCount: ids.length });
      data = await list({ category: named, limit: 20 });
    }
    if (data.length === 0) {
      logger.info('fetch_random_question_general_fallback_triggered', { category });
      data = await list({ limit: 20 });
      if (data.length === 0) {
        logger.warn('fetch_random_question_exhausted', { category });
        return null;
      }
    }

    const randomIndex = Math.floor(Math.random() * data.length);
    const row = data[randomIndex];
    return {
      id: row.id,
      category: row.category,
      prompt: row.prompt,
      options: Array.isArray(row.options) ? (row.options as string[]) : [],
      created_by: row.created_by_user || null,
      status: row.status || 'verified',
    };
  } catch (err) {
    logger.error('fetch_random_question_unexpected_error', err, { category });
    return null;
  }
}

export async function getTopics(): Promise<Array<{ slug: string; name: string; questionCount: number; latestAt: string }>> {
  try {
    return (await topics()).map((row) => ({
      slug: row.slug,
      name: row.name,
      questionCount: row.question_count,
      latestAt: row.latest_at,
    }));
  } catch (err) {
    logger.error('getTopics error:', err);
    return [];
  }
}

export async function getPublicQuestion(id: string): Promise<ClientQuestion | null> {
  try {
    if (!isUuid(id)) return null;
    const data = await publicQuestion(id);
    if (!data) return null;
    return {
      id: data.id,
      category: data.category,
      prompt: data.prompt,
      options: Array.isArray(data.options) ? (data.options as string[]) : [],
      created_by: data.created_by_user || null,
      status: data.status || 'verified',
    };
  } catch (err) {
    logger.error('getPublicQuestion error:', err);
    return null;
  }
}

export async function disputeQuestion(
  params: {
    questionId: string;
    reason: string;
  },
  authAccount?: SessionAccount
): Promise<ActionResult<{ quarantined: boolean }>> {
  try {
    const reason = params.reason?.trim() || '';
    if (!isUuid(params.questionId) || !reason) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Question and dispute reason are required.' } };
    }
    if (reason.length > MAX_DISPUTE_REASON) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: `Dispute reason must be at most ${MAX_DISPUTE_REASON} characters.` } };
    }
    const account = authAccount ?? (await getSessionAccount());
    if (!account) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sign in to report questions.' } };

    // Only players whose answer to this question was recorded may report it
    let answered: boolean;
    try {
      answered = await hasRecordedAnswer(account.id, params.questionId);
    } catch (err) {
      logger.error('dispute_question_answered_check_failed', err, { userId: account.id, questionId: params.questionId });
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to submit dispute.' } };
    }
    if (!answered) {
      logger.warn('dispute_question_rejected_unanswered', { userId: account.id, questionId: params.questionId });
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Answer this question before reporting it.' } };
    }

    let created: 'created' | 'duplicate';
    try {
      created = await insertDispute({ question_id: params.questionId, reporter_user: account.id, reason });
    } catch (err) {
      logger.error('dispute_question_db_insert_failed', err, { userId: account.id, questionId: params.questionId });
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to submit dispute.' } };
    }
    if (created === 'duplicate') {
      logger.warn('dispute_question_duplicate_report', { userId: account.id, questionId: params.questionId });
      return { success: false, error: { code: 'CONFLICT', message: 'You have already reported this question.' } };
    }

    let disputeCount: number;
    try {
      disputeCount = await countDisputes(params.questionId);
    } catch (err) {
      logger.error('dispute_question_count_check_failed', err, { questionId: params.questionId });
      return { success: true, data: { quarantined: false } };
    }

    const quarantined = disputeCount >= QUARANTINE_AT;
    let updated = true;
    if (quarantined) {
      try {
        await quarantineQuestion(params.questionId);
      } catch (err) {
        logger.error('dispute_question_update_failed', err, { questionId: params.questionId });
        updated = false;
      }
    }

    logger.info('question_disputed', { userId: account.id, questionId: params.questionId, quarantined });
    return { success: true, data: { quarantined: quarantined && updated } };
  } catch (err) {
    logger.error('dispute_question_unexpected_error', err, { questionId: params.questionId });
    return { success: false, error: { code: 'UNKNOWN_ERROR', message: 'Failed to submit dispute.' } };
  }
}

export async function getQuestionCount(): Promise<number> {
  try {
    return await countQuestions();
  } catch (err) {
    logger.error('getQuestionCount error:', err);
    return 0;
  }
}

export async function get5050EliminatedIndices(questionId: string): Promise<number[]> {
  try {
    // correct_index is only readable with the secret key.
    if (!isUuid(questionId)) return [];
    const data = await answerKey(questionId);
    if (!data || typeof data.correct_index !== 'number' || data.correct_index < 0 || data.correct_index > 3) {
      return [];
    }
    // Eliminating two wrong options narrows the answer to one of two, so this is only offered for
    // public verified questions (whose answers submitAnswer shows anyway). Pending and
    // quarantined questions reveal nothing.
    if (data.status !== 'verified') return [];
    const wrong = [0, 1, 2, 3].filter((idx) => idx !== data.correct_index);

    // Deterministic selection based on questionId hash so repeat calls return the exact same 2 wrong answers
    let hash = 0;
    for (let i = 0; i < questionId.length; i++) {
      hash = (hash * 31 + questionId.charCodeAt(i)) >>> 0;
    }
    const firstIndex = hash % wrong.length;
    const first = wrong[firstIndex];
    const remaining = wrong.filter((_, i) => i !== firstIndex);
    const second = remaining[(hash >>> 4) % remaining.length];
    return [first, second].sort((a, b) => a - b);
  } catch (err) {
    logger.error('get5050EliminatedIndices error:', err);
    return [];
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
