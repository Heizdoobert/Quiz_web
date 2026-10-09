'use server';

import { supabase } from '@/lib/supabase/supabase';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { getSessionAccount } from '@/lib/services/session';
import { ClientQuestion } from '@/lib/types';
import { escapeLikePattern, isUuid, validateQuestionInput } from '@/lib/utils/validation';
import { GoogleGenAI } from '@google/genai';

const MAX_DISPUTE_REASON = 500;
const QUESTIONS_PER_DAY = 5;
const QUARANTINE_AT = 3;

import { ActionResult } from '@/lib/types';

import { logger } from '@/lib/logger';

export async function createQuestion(params: {
  prompt: string;
  options: string[];
  correctIndex: number;
  category?: string;
  explanation?: string;
}): Promise<ActionResult> {
  try {
    const account = await getSessionAccount();
    if (!account) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sign in to add questions.' } };
    }
    if (!supabaseAdmin) {
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Adding questions is unavailable right now.' } };
    }

    const validated = validateQuestionInput(params);
    if (!validated.valid) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: validated.error } };
    }

    // New questions go live at once and are moderated by disputes, so cap how fast one account adds them.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count, error: countErr } = await supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('created_by_user', account.id)
      .gte('created_at', since);
      
    if (countErr) {
      logger.error('question_creation_rate_limit_check_failed', countErr, { userId: account.id });
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to add question.' } };
    }
    if ((count ?? 0) >= QUESTIONS_PER_DAY) {
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
    const { moderateContent } = await import('@/lib/services/ai-moderation');
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

    const { error } = await supabaseAdmin.from('questions').insert({
      prompt: validated.prompt,
      options: validated.options,
      correct_index: validated.correctIndex,
      category: validated.category,
      explanation: validated.explanation,
      created_by_user: account.id,
      status: 'verified',
      dispute_count: 0,
    });
    
    if (error) {
      logger.error('question_creation_db_insert_failed', error, { userId: account.id });
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
    let query = supabase
      .from('questions')
      .select('id, category, prompt, options, created_by, status')
      .eq('status', 'verified')
      .is('list_id', null);

    const ids = (Array.isArray(excludeIds) ? excludeIds : []).filter(isUuid).slice(-200);
    if (ids.length > 0) {
      query = query.not('id', 'in', `(${ids.join(',')})`);
    }

    if (category && category !== 'All') {
      query = query.ilike('category', escapeLikePattern(category));
    }

    let { data, error } = await query.limit(20);

    if ((error || !data || data.length === 0) && category && category !== 'All') {
      logger.info('fetch_random_question_fallback_triggered', { category, excludedCount: ids.length });
      const fallbackQuery = supabase
        .from('questions')
        .select('id, category, prompt, options, created_by, status')
        .eq('status', 'verified')
        .is('list_id', null)
        .ilike('category', escapeLikePattern(category))
        .limit(20);
      const fallbackRes = await fallbackQuery;
      if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
        data = fallbackRes.data;
        error = null;
      }
    }

    if (error || !data || data.length === 0) {
      logger.info('fetch_random_question_general_fallback_triggered', { category });
      const generalQuery = await supabase
        .from('questions')
        .select('id, category, prompt, options, created_by, status')
        .eq('status', 'verified')
        .is('list_id', null)
        .limit(20);
      if (generalQuery.data && generalQuery.data.length > 0) {
        data = generalQuery.data;
      } else {
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
      created_by: row.created_by || null,
      status: row.status || 'verified',
    };
  } catch (err) {
    logger.error('fetch_random_question_unexpected_error', err, { category });
    return null;
  }
}

export async function getTopics(): Promise<Array<{ name: string; questionCount: number; latestAt: string }>> {
  try {
    const { data, error } = await supabase.rpc('get_topics');
    if (error || !data) return [];
    return (data as Array<{ name: string; question_count: number; latest_at: string }>).map((row) => ({
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
    const { data, error } = await supabase
      .from('questions')
      .select('id, category, prompt, options, created_by, status')
      .eq('id', id)
      .eq('status', 'verified')
      .is('list_id', null)
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      category: data.category,
      prompt: data.prompt,
      options: Array.isArray(data.options) ? (data.options as string[]) : [],
      created_by: data.created_by || null,
      status: data.status || 'verified',
    };
  } catch (err) {
    logger.error('getPublicQuestion error:', err);
    return null;
  }
}

export async function disputeQuestion(params: {
  questionId: string;
  reason: string;
}): Promise<ActionResult<{ quarantined: boolean }>> {
  try {
    const reason = params.reason?.trim() || '';
    if (!isUuid(params.questionId) || !reason) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Question and dispute reason are required.' } };
    }
    if (reason.length > MAX_DISPUTE_REASON) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: `Dispute reason must be at most ${MAX_DISPUTE_REASON} characters.` } };
    }
    const account = await getSessionAccount();
    if (!account) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sign in to report questions.' } };
    if (!supabaseAdmin) return { success: false, error: { code: 'SERVER_ERROR', message: 'Reporting is unavailable right now.' } };

    // Only players whose answer to this question was recorded may report it
    const { data: answered, error: answeredErr } = await supabaseAdmin
      .from('quiz_results')
      .select('id')
      .eq('user_id', account.id)
      .eq('question_id', params.questionId)
      .limit(1);
      
    if (answeredErr) {
      logger.error('dispute_question_answered_check_failed', answeredErr, { userId: account.id, questionId: params.questionId });
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to submit dispute.' } };
    }
    if (!answered?.length) {
      logger.warn('dispute_question_rejected_unanswered', { userId: account.id, questionId: params.questionId });
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Answer this question before reporting it.' } };
    }

    const { error: disputeErr } = await supabaseAdmin.from('question_disputes').insert({
      question_id: params.questionId,
      reporter_user: account.id,
      reason,
    });
    
    if (disputeErr) {
      if (disputeErr.code === '23505') {
        logger.warn('dispute_question_duplicate_report', { userId: account.id, questionId: params.questionId });
        return { success: false, error: { code: 'CONFLICT', message: 'You have already reported this question.' } };
      }
      logger.error('dispute_question_db_insert_failed', disputeErr, { userId: account.id, questionId: params.questionId });
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to submit dispute.' } };
    }

    const { count, error: countErr } = await supabaseAdmin
      .from('question_disputes')
      .select('id', { count: 'exact', head: true })
      .eq('question_id', params.questionId);
      
    if (countErr) {
      logger.error('dispute_question_count_check_failed', countErr, { questionId: params.questionId });
      return { success: true, data: { quarantined: false } };
    }
    
    const disputeCount = count ?? 0;
    const quarantined = disputeCount >= QUARANTINE_AT;
    const { error: updateErr } = await supabaseAdmin
      .from('questions')
      .update({ dispute_count: disputeCount, ...(quarantined ? { status: 'quarantined' } : {}) })
      .eq('id', params.questionId);
      
    if (updateErr) {
      logger.error('dispute_question_update_failed', updateErr, { questionId: params.questionId });
    }

    logger.info('question_disputed', { userId: account.id, questionId: params.questionId, quarantined });
    return { success: true, data: { quarantined: quarantined && !updateErr } };
  } catch (err) {
    logger.error('dispute_question_unexpected_error', err, { questionId: params.questionId });
    return { success: false, error: { code: 'UNKNOWN_ERROR', message: 'Failed to submit dispute.' } };
  }
}

export async function getQuestionCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true });
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function get5050EliminatedIndices(questionId: string): Promise<number[]> {
  try {
    // correct_index is only readable with the secret key.
    if (!isUuid(questionId) || !supabaseAdmin) return [];
    const { data } = await supabaseAdmin
      .from('questions')
      .select('correct_index, status, list_id')
      .eq('id', questionId)
      .single();
    if (!data || typeof data.correct_index !== 'number' || data.correct_index < 0 || data.correct_index > 3) {
      return [];
    }
    // Eliminating two wrong options narrows the answer to one of two, so this is only offered for
    // public verified questions (whose answers submitAnswer shows anyway). Contest, pending and
    // quarantined questions reveal nothing; the contest player has no 50/50.
    if (data.status !== 'verified' || data.list_id) return [];
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
  } catch {
    return [];
  }
}

export async function generateQuestion(topic: string): Promise<ActionResult<{
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}>> {
  try {
    const account = await getSessionAccount();
    if (!account) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sign in to generate questions.' } };
    }
    if (!supabaseAdmin) {
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Database not available.' } };
    }

    const { data: countData, error: countErr } = await supabaseAdmin.rpc('increment_ai_generation', {
      p_user_id: account.id
    });

    if (countErr) {
      logger.error('generate_question_increment_failed', countErr, { userId: account.id });
      return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to generate question.' } };
    }

    if (countData > 3) {
      return { success: false, error: { code: 'RATE_LIMITED', message: 'You have reached the limit of 3 AI generations per day.' } };
    }

    const ai = new GoogleGenAI({});
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
